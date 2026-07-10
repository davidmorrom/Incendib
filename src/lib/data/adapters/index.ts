/**
 * Adaptadores de fuente. Cada adaptador consulta su API y NORMALIZA al modelo
 * `Fire`/`Hotspot`. Corren SOLO en el servidor (leen claves de entorno y
 * cachean para respetar rate limits). Endpoints y estrategia en
 * docs/DATA-SOURCES.md y src/lib/data/sources.ts.
 *
 * Estrategia (docs/DATA-SOURCES.md §Recommendations):
 *   FIRMS  → capa universal de hotspots (cacheada en backend por rate limit)  ✅
 *   EFFIS  → perímetros de área quemada + FWI                                  ⏳
 *   fogos/ICNF → estado operativo PT                                          ⏳
 *   JCyL/Catalunya → estado operativo ES donde hay API abierta                ⏳
 *
 * Principio irrenunciable: una fuente caída NUNCA rompe el mapa. Ante cualquier
 * error (red, clave inválida, aviso de rate limit en cuerpo 200…) el adaptador
 * devuelve vacío y deja que la UI señalice la degradación por capa.
 */

import type { Fire, Hotspot } from '@/types/fire';

export interface FetchOptions {
  /** Bounding box [minLon, minLat, maxLon, maxLat]. */
  bbox?: [number, number, number, number];
  /** Ventana temporal en días (FIRMS admite 1–10). */
  days?: number;
  signal?: AbortSignal;
}

// ── NASA FIRMS ────────────────────────────────────────────────────────────────

const FIRMS_BASE = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';

/**
 * BBOX Península + Baleares [minLon, minLat, maxLon, maxLat]. Coincide con el
 * encuadre inicial del mapa (IBERIA_BOUNDS). Canarias/Azores/Madeira quedan
 * pendientes (fuera del encuadre; se ven en el inset con incendios, no focos).
 */
export const IBERIA_BBOX: [number, number, number, number] = [-10, 36, 4.5, 44];

/**
 * Zonas DENTRO del BBOX que no son España/Portugal (mar de Alborán / franja
 * mediterránea hacia la costa argelina). Se recortan para no mostrar focos
 * fuera del ámbito ES+PT. Es un recorte conservador: no toca tierra ibérica
 * (el sur peninsular tiene lon < -0.6; Baleares, lat > 38.9).
 */
const EXCLUDE_BOXES: [number, number, number, number][] = [
  [-0.6, 36.0, 4.5, 37.4],
];

/**
 * Fuentes FIRMS a combinar. "All VIIRS" (SNPP + NOAA-20) da la máxima cobertura
 * NRT a 375 m. Cada consulta de 1 día = 1 transacción; con caché de 5 min son
 * ~24 tx/hora, muy por debajo del límite (5000 tx / 10 min).
 */
const FIRMS_SOURCES = ['VIIRS_NOAA20_NRT', 'VIIRS_SNPP_NRT'] as const;

/**
 * Focos térmicos de NASA FIRMS en el ámbito ES+PT (últimas 24 h por defecto).
 * Detección satelital, NO incendio confirmado. Devuelve [] ante cualquier fallo.
 */
export async function fetchFirmsHotspots(opts: FetchOptions = {}): Promise<Hotspot[]> {
  const key = process.env.FIRMS_MAP_KEY;
  if (!key) return [];

  const bbox = opts.bbox ?? IBERIA_BBOX;
  const days = Math.min(10, Math.max(1, opts.days ?? 1));
  const bboxStr = bbox.join(',');

  const perSource = await Promise.all(
    FIRMS_SOURCES.map((source) => fetchFirmsSource(key, source, bboxStr, days, opts.signal)),
  );

  const inRegion = perSource
    .flat()
    .filter((h) => inIberia(h.coordinates[1], h.coordinates[0], bbox));

  return dedupeHotspots(inRegion);
}

async function fetchFirmsSource(
  key: string,
  source: string,
  bbox: string,
  days: number,
  signal?: AbortSignal,
): Promise<Hotspot[]> {
  const url = `${FIRMS_BASE}/${key}/${source}/${bbox}/${days}`;
  try {
    const res = await fetch(url, {
      // Corta a los 15 s para no colgar el build/render si FIRMS no responde.
      signal: signal ?? AbortSignal.timeout(15_000),
      // Cachea en el servidor para respetar el rate limit de FIRMS.
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return parseFirmsCsv(await res.text(), source);
  } catch {
    return [];
  }
}

/**
 * Parsea el CSV de FIRMS. Cabecera VIIRS:
 *   latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,
 *   instrument,confidence,version,bright_ti5,frp,daynight
 * FIRMS puede responder 200 con un aviso en texto (clave inválida, rate limit):
 * si no encontramos las columnas esperadas, devolvemos [].
 *
 * Exportado para pruebas unitarias.
 */
export function parseFirmsCsv(csv: string, source: string): Hotspot[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = (lines[0] ?? '').split(',').map((h) => h.trim().toLowerCase());
  const iLat = header.indexOf('latitude');
  const iLon = header.indexOf('longitude');
  if (iLat < 0 || iLon < 0) return [];

  const iFrp = header.indexOf('frp');
  const iConf = header.indexOf('confidence');
  const iDate = header.indexOf('acq_date');
  const iTime = header.indexOf('acq_time');
  const iInstr = header.indexOf('instrument');
  const defaultSensor: Hotspot['sensor'] = source.includes('MODIS') ? 'MODIS' : 'VIIRS';

  const out: Hotspot[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = (lines[i] ?? '').split(',');
    const lat = Number(c[iLat]);
    const lon = Number(c[iLon]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const instrument = iInstr >= 0 ? (c[iInstr] ?? '').trim().toUpperCase() : '';
    const sensor: Hotspot['sensor'] = instrument.includes('MODIS')
      ? 'MODIS'
      : instrument.includes('VIIRS')
        ? 'VIIRS'
        : defaultSensor;
    const frp = iFrp >= 0 ? Number(c[iFrp]) : 0;
    const date = iDate >= 0 ? (c[iDate] ?? '').trim() : '';
    const time = iTime >= 0 ? (c[iTime] ?? '').trim() : '';

    out.push({
      id: `${sensor}-${lat.toFixed(5)}-${lon.toFixed(5)}-${date}-${time}`,
      coordinates: [lon, lat],
      frp: Number.isFinite(frp) ? frp : 0,
      confidence: normConfidence(iConf >= 0 ? (c[iConf] ?? '') : '', sensor),
      sensor,
      acquiredAt: toIso(date, time),
    });
  }
  return out;
}

/** VIIRS usa l/n/h; MODIS un entero 0–100. Normaliza a low/nominal/high. */
function normConfidence(raw: string, _sensor: Hotspot['sensor']): Hotspot['confidence'] {
  const s = raw.trim().toLowerCase();
  if (s === 'l' || s === 'low') return 'low';
  if (s === 'h' || s === 'high') return 'high';
  if (s === 'n' || s === 'nominal') return 'nominal';
  const n = Number(s);
  if (Number.isFinite(n)) return n < 30 ? 'low' : n < 80 ? 'nominal' : 'high';
  return 'nominal';
}

/** acq_date (YYYY-MM-DD) + acq_time (HHMM UTC, sin ceros) → ISO 8601. */
function toIso(date: string, time: string): string {
  if (!date) return new Date(0).toISOString();
  const hhmm = (time || '0').padStart(4, '0');
  const t = Date.parse(`${date}T${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}:00Z`);
  return Number.isNaN(t) ? `${date}T00:00:00Z` : new Date(t).toISOString();
}

function inIberia(
  lat: number,
  lon: number,
  bbox: [number, number, number, number],
): boolean {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) return false;
  for (const [xmin, ymin, xmax, ymax] of EXCLUDE_BOXES) {
    if (lon >= xmin && lon <= xmax && lat >= ymin && lat <= ymax) return false;
  }
  return true;
}

function dedupeHotspots(list: Hotspot[]): Hotspot[] {
  const seen = new Map<string, Hotspot>();
  for (const h of list) if (!seen.has(h.id)) seen.set(h.id, h);
  return [...seen.values()];
}

// ── Pendientes (fases posteriores) ──────────────────────────────────────────

export async function fetchEffisPerimeters(_opts: FetchOptions = {}): Promise<Fire[]> {
  return [];
}

export async function fetchFogosActive(_opts: FetchOptions = {}): Promise<Fire[]> {
  return [];
}

export async function fetchIcnfBurntAreas(_opts: FetchOptions = {}): Promise<Fire[]> {
  return [];
}

export async function fetchJcylFires(_opts: FetchOptions = {}): Promise<Fire[]> {
  return [];
}

export async function fetchCatalunyaFires(_opts: FetchOptions = {}): Promise<Fire[]> {
  return [];
}
