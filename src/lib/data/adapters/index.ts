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

import type {
  Fire,
  FireState,
  Hotspot,
  PtState,
  ResourceUnit,
  AerialKind,
  GroundKind,
  SeverityLevel,
} from '@/types/fire';
import { inEsPt } from '@/lib/geo/point-in-region';
import { utmToLonLat } from '@/lib/geo/utm';

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
 * BBOX Península + Baleares [minLon, minLat, maxLon, maxLat] para la CONSULTA a
 * FIRMS. Coincide con el encuadre inicial del mapa (IBERIA_BOUNDS). El BBOX
 * incluye Francia, Andorra y mar; el recorte fino a tierra ES+PT lo hace después
 * `inEsPt` (punto-en-polígono contra el contorno real). Canarias/Azores/Madeira
 * quedan pendientes (fuera del encuadre; se ven en el inset con incendios).
 */
export const IBERIA_BBOX: [number, number, number, number] = [-10, 36, 4.5, 44];

/**
 * Fuentes FIRMS a combinar: VIIRS (SNPP + NOAA-20, 375 m) + MODIS (1 km). MODIS
 * añade cobertura y robustez cuando la ventana VIIRS reciente está vacía (p. ej.
 * de madrugada). Cada consulta = 1 transacción; con caché son pocas tx/hora,
 * muy por debajo del límite (5000 tx / 10 min).
 */
const FIRMS_SOURCES = ['VIIRS_NOAA20_NRT', 'VIIRS_SNPP_NRT', 'MODIS_NRT'] as const;

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

  // Recorte fino a tierra de España/Portugal (excluye Francia, Andorra y mar).
  const inRegion = perSource.flat().filter((h) => inEsPt(h.coordinates[0], h.coordinates[1]));

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

function dedupeHotspots(list: Hotspot[]): Hotspot[] {
  const seen = new Map<string, Hotspot>();
  for (const h of list) if (!seen.has(h.id)) seen.set(h.id, h);
  return [...seen.values()];
}

// ── Utilidades de normalización ──────────────────────────────────────────────

function slugify(s: string): string {
  const base = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'x';
}

function titleCase(s: string): string {
  // Solo la primera letra de cada palabra; `\b` de JS es ASCII y rompería con
  // acentos (LEÓN → LeÓN), así que delimitamos por inicio/espacio/guion.
  return s
    .toLowerCase()
    .replace(/(^|[\s'’-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** Distancia aproximada en km (haversine) entre dos puntos [lon,lat]. */
function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const la1 = (a[1] * Math.PI) / 180;
  const la2 = (b[1] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ── Portugal: fogos.pt (ANEPC) ───────────────────────────────────────────────

const FOGOS_URL = 'https://api.fogos.pt/v2/incidents/active';

interface FogosRaw {
  id?: number | string;
  lat?: number;
  lng?: number;
  man?: number;
  aerial?: number;
  terrain?: number;
  meios_aquaticos?: number;
  planeFight?: number;
  heliFight?: number;
  heliCoord?: number;
  status?: string;
  concelho?: string;
  district?: string;
  regiao?: string;
  sub_regiao?: string;
  localidade?: string;
  freguesia?: string;
  dateTime?: { sec?: number };
  updated?: { sec?: number };
  isFire?: boolean;
}

/** {sec: unix} → ISO 8601, o undefined. */
function secToIso(o?: { sec?: number }): string | undefined {
  return typeof o?.sec === 'number' ? new Date(o.sec * 1000).toISOString() : undefined;
}

/** Colapsa "Tourelhe 2 Tourelhe 2" → "Tourelhe 2" (duplicación típica de fogos). */
function collapseDup(s: string): string {
  const t = s.trim();
  const mid = Math.floor(t.length / 2);
  if (t.length % 2 === 1 && t[mid] === ' ') {
    const a = t.slice(0, mid).trim();
    const b = t.slice(mid + 1).trim();
    if (a && a === b) return a;
  }
  return t;
}

/** Estado SADO/ANEPC (texto) → FireState + ptState. */
function ptStateFromStatus(status: string): { state: FireState; ptState: PtState } {
  const s = status
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  if (s.includes('resolu')) return { state: 'controlado', ptState: 'em-resolucao' };
  if (s.includes('conclus')) return { state: 'estabilizado', ptState: 'em-conclusao' };
  if (s.includes('vigil')) return { state: 'estabilizado', ptState: 'vigilancia' };
  if (s.includes('encerr') || s.includes('extint')) return { state: 'extinguido', ptState: 'encerrada' };
  return { state: 'activo', ptState: 'em-curso' };
}

function fogosToFire(d: FogosRaw): Fire | null {
  const lat = d.lat;
  const lng = d.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat)) return null;

  const man = Number(d.man) || 0;
  const aerialTotal = Number(d.aerial) || 0;
  const terrain = Number(d.terrain) || 0;
  const plane = Number(d.planeFight) || 0;
  const heli = Number(d.heliFight) || 0;
  const heliCoord = Number(d.heliCoord) || 0;

  const aerialUnits: ResourceUnit<AerialKind>[] = [];
  if (plane > 0) aerialUnits.push({ kind: 'anfibio', count: plane });
  if (heli > 0) aerialUnits.push({ kind: 'helicoptero', count: heli });
  if (heliCoord > 0) aerialUnits.push({ kind: 'helicoptero-coord', count: heliCoord });
  const groundUnits: ResourceUnit<GroundKind>[] = terrain > 0 ? [{ kind: 'autobomba', count: terrain }] : [];

  const { state, ptState } = ptStateFromStatus(d.status ?? '');
  const region = (d.sub_regiao || d.regiao || 'Portugal').trim();
  const name = collapseDup(d.localidade || d.freguesia || d.concelho || 'Incendio');
  const updated = secToIso(d.updated);
  const started = secToIso(d.dateTime);

  return {
    slug: `pt-${slugify(d.concelho || name)}-${d.id ?? slugify(name)}`,
    name,
    municipality: d.concelho || '—',
    province: d.district || '—',
    region: `${region} (PT)`,
    country: 'PT',
    state,
    ptState,
    level: null,
    type: 'forestal',
    hectares: 0, // el endpoint de activos no publica superficie
    coordinates: [lng, lat],
    startedAt: started ?? updated ?? new Date().toISOString(),
    updatedAt: updated ?? new Date().toISOString(),
    resources: {
      aerial: aerialTotal || (plane + heli + heliCoord) || undefined,
      ground: terrain || undefined,
      personnel: man || undefined,
      aerialUnits: aerialUnits.length ? aerialUnits : undefined,
      groundUnits: groundUnits.length ? groundUnits : undefined,
    },
    sources: ['fogos'],
  };
}

/** Incendios activos de Portugal (fogos.pt / ANEPC). Resiliente: [] si falla. */
export async function fetchFogosActive(opts: FetchOptions = {}): Promise<Fire[]> {
  try {
    const res = await fetch(FOGOS_URL, {
      signal: opts.signal ?? AbortSignal.timeout(15_000),
      next: { revalidate: 120 }, // fogos refresca ~cada 2 min
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: FogosRaw[] };
    const data = Array.isArray(json.data) ? json.data : [];
    return data
      .filter((d) => d.isFire !== false)
      .map(fogosToFire)
      .filter((f): f is Fire => f !== null);
  } catch {
    return [];
  }
}

// ── España: Castilla y León ──────────────────────────────────────────────────
// Fuente primaria: INFORCYL (sistema operativo de la JCyL, actualización casi en
// tiempo real, con estado, nivel InfoCal y desglose real de medios). Respaldo:
// el dataset de partes de Opendatasoft (2×/día) si INFORCYL no responde.

const INFORCYL_URL = 'https://servicios.jcyl.es/incyl/json/emergencias';
const INFORCYL_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; Incendib/1.0; +https://incendib.es)',
  Referer: 'https://servicios.jcyl.es/incyl/incyl',
  Accept: 'application/json, text/plain, */*',
};

interface InforcylMedio {
  TIPO?: { CATEGORIA?: string; NOMBRE?: string };
}
interface InforcylEmergencia {
  causa?: string;
  estado?: { NOMBRE?: string };
  falsa_alarma?: boolean;
  fecha_inicio?: string;
  fecha_estabilizado?: string;
  fecha_control?: string;
  huso?: number;
  latitud?: number; // UTM northing
  longitud?: number; // UTM easting
  localidad?: { nombre?: string; municipio?: { nombre?: string } };
  municipio?: { nombre?: string };
  provincia?: { nombre?: string };
  nivel_infocal?: number;
  nivel_maximo?: number;
  emergencia_cpm?: number;
  emergencia_num1?: number;
  emergencia_num2?: number;
  medios?: InforcylMedio[];
}

/** "DD/MM/YYYY HH:MM:SS" (hora peninsular) → ISO 8601. */
function parseCylDateTime(s?: string): string | undefined {
  if (!s) return undefined;
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (!m) return undefined;
  const t = Date.parse(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00+02:00`);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

/** Agrega la lista de medios de INFORCYL al modelo de recursos. */
function inforcylMedios(medios: InforcylMedio[]): Fire['resources'] {
  let aerial = 0;
  let personnel = 0;
  const g = { autobomba: 0, maquinaria: 0, brigada: 0, gc: 0 };
  for (const m of medios) {
    const cat = m.TIPO?.CATEGORIA ?? '';
    const nom = m.TIPO?.NOMBRE ?? '';
    if (cat === 'Aereo') aerial++;
    else if (cat === 'Personal') personnel++;
    else if (cat === 'Terrestre') {
      if (/autobomba/i.test(nom)) g.autobomba++;
      else if (/bulldozer|maquinaria/i.test(nom)) g.maquinaria++;
      else g.brigada++; // cuadrillas, BRIF, ELIF
    } else if (cat === 'Otros' && /administracion|guardia/i.test(nom)) g.gc++;
  }
  const groundUnits: ResourceUnit<GroundKind>[] = [];
  if (g.brigada) groundUnits.push({ kind: 'brigada', count: g.brigada });
  if (g.autobomba) groundUnits.push({ kind: 'autobomba', count: g.autobomba });
  if (g.maquinaria) groundUnits.push({ kind: 'maquinaria', count: g.maquinaria });
  if (g.gc) groundUnits.push({ kind: 'gc', count: g.gc });
  const groundTotal = g.autobomba + g.maquinaria + g.brigada + g.gc;
  if (!aerial && !personnel && !groundTotal) return undefined;
  // "Medios Aéreos" no distingue avión/helicóptero: lo damos como aéreo genérico.
  return {
    aerial: aerial || undefined,
    ground: groundTotal || undefined,
    personnel: personnel || undefined,
    aerialUnits: aerial > 0 ? [{ kind: 'aereo', count: aerial }] : undefined,
    groundUnits: groundUnits.length ? groundUnits : undefined,
  };
}

function inforcylToFire(e: InforcylEmergencia): Fire | null {
  if (e.falsa_alarma) return null;
  const east = e.longitud;
  const north = e.latitud;
  const zone = e.huso ?? 30;
  if (typeof east !== 'number' || typeof north !== 'number') return null;
  const [lon, lat] = utmToLonLat(east, north, zone);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;

  const muni = e.municipio?.nombre ?? e.localidad?.municipio?.nombre ?? '';
  const name = titleCase(e.localidad?.nombre || muni || 'Incendio');
  const levelNum = Number(e.nivel_infocal);
  const level = (Number.isFinite(levelNum) ? Math.max(0, Math.min(3, levelNum)) : null) as SeverityLevel;
  const started = parseCylDateTime(e.fecha_inicio);
  // INFORCYL no publica un "última modificación" por incidente (fecha_control/
  // estabilizado suelen venir vacías), así que "Actualizado" refleja la frescura
  // del dato (se refresca ~cada 2 min), no un evento antiguo del incendio.
  const updated = new Date().toISOString();
  const id = `${e.emergencia_cpm ?? ''}-${e.emergencia_num1 ?? ''}-${e.emergencia_num2 ?? ''}`;

  return {
    slug: `cyl-${slugify(name)}-${id}`,
    name,
    municipality: titleCase(muni) || '—',
    province: titleCase(e.provincia?.nombre ?? '') || '—',
    region: 'Castilla y León',
    country: 'ES',
    state: esStateFromSituacion(e.estado?.NOMBRE),
    level,
    type: 'forestal',
    hectares: 0, // INFORCYL no publica superficie en tiempo real
    coordinates: [lon, lat],
    startedAt: started ?? updated,
    updatedAt: updated,
    resources: inforcylMedios(e.medios ?? []),
    sources: ['jcyl'],
  };
}

/** Incendios de Castilla y León en tiempo real (INFORCYL). [] si falla. */
async function fetchInforcylFires(opts: FetchOptions = {}): Promise<Fire[]> {
  try {
    const res = await fetch(INFORCYL_URL, {
      signal: opts.signal ?? AbortSignal.timeout(15_000),
      headers: INFORCYL_HEADERS,
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { listaEmergencias?: InforcylEmergencia[] };
    const list = Array.isArray(json.listaEmergencias) ? json.listaEmergencias : [];
    return list.map(inforcylToFire).filter((f): f is Fire => f !== null);
  } catch {
    return [];
  }
}

const JCYL_URL =
  'https://analisis.datosabiertos.jcyl.es/api/explore/v2.1/catalog/datasets/incendios-forestales/records';

interface JcylRaw {
  posicion?: { lon?: number; lat?: number };
  situacion_actual?: string;
  nivel?: string;
  termino_municipal?: string;
  provincia?: string[];
  fecha_de_inicio?: string;
  hora_de_inicio?: string;
  fecha_del_parte?: string;
  hora_del_parte?: string;
  tipo_y_has_de_superficie_afectada?: string;
  medios_de_extincion?: string | null;
  codigo_ine?: string;
}

function esStateFromSituacion(s?: string): FireState {
  const t = (s ?? '').toUpperCase();
  if (t.includes('CONTROL')) return 'controlado';
  if (t.includes('ESTABIL')) return 'estabilizado';
  if (t.includes('EXTINGU')) return 'extinguido';
  return 'activo';
}

/** "MATORRAL:414,30 HA.; OTRAS:3.266,33 HA.;" → 3681 (suma, decimales ES). */
function parseHectaresEs(s?: string): number {
  if (!s) return 0;
  const nums = s.match(/\d{1,3}(?:\.\d{3})*(?:,\d+)?/g) ?? [];
  let total = 0;
  for (const n of nums) {
    const v = parseFloat(n.replace(/\./g, '').replace(',', '.'));
    if (Number.isFinite(v)) total += v;
  }
  return Math.round(total);
}

/** ISO en hora peninsular (CEST, temporada de incendios). */
function madridIso(date?: string, time?: string): string | undefined {
  if (!date) return undefined;
  const t = time && /^\d{1,2}:\d{2}/.test(time) ? time.slice(0, 5) : '00:00';
  const iso = Date.parse(`${date}T${t}:00+02:00`);
  return Number.isNaN(iso) ? undefined : new Date(iso).toISOString();
}

function jcylToFire(r: JcylRaw): Fire | null {
  const pos = r.posicion;
  if (!pos || typeof pos.lat !== 'number' || typeof pos.lon !== 'number') return null;

  const raw = r.termino_municipal ?? 'Incendio';
  const m = raw.match(/^(.*?)\s*\((.*)\)\s*$/);
  const name = titleCase((m ? m[1]! : raw).trim());
  const municipality = titleCase((m ? m[2]! : raw).trim());
  const levelNum = Number(r.nivel);
  const level = (Number.isFinite(levelNum) ? Math.max(0, Math.min(3, levelNum)) : null) as SeverityLevel;
  const updated = madridIso(r.fecha_del_parte, r.hora_del_parte);
  const medios = (r.medios_de_extincion ?? '').trim();

  return {
    slug: `cyl-${slugify(name)}-${r.codigo_ine ?? ''}-${(r.fecha_de_inicio ?? '').replace(/-/g, '')}`,
    name,
    municipality,
    province: titleCase((r.provincia?.[0] ?? '').trim()) || '—',
    region: 'Castilla y León',
    country: 'ES',
    state: esStateFromSituacion(r.situacion_actual),
    level,
    type: 'forestal',
    hectares: parseHectaresEs(r.tipo_y_has_de_superficie_afectada),
    coordinates: [pos.lon, pos.lat],
    startedAt: madridIso(r.fecha_de_inicio, r.hora_de_inicio) ?? updated ?? new Date().toISOString(),
    updatedAt: updated ?? new Date().toISOString(),
    resources: medios ? { raw: medios } : undefined,
    sources: ['jcyl'],
  };
}

/** Respaldo: dataset de partes de Opendatasoft (2×/día; se filtra a recientes y
 * no extinguidos, deduplicando por incendio con el parte más reciente). */
async function fetchJcylOpendatasoft(opts: FetchOptions = {}): Promise<Fire[]> {
  try {
    const cutoff = new Date(Date.now() - 8 * 86400e3).toISOString().slice(0, 10);
    const where = `situacion_actual != "EXTINGUIDO" AND fecha_del_parte >= "${cutoff}"`;
    const url =
      `${JCYL_URL}?limit=100&order_by=${encodeURIComponent('fecha_del_parte desc')}` +
      `&where=${encodeURIComponent(where)}`;
    const res = await fetch(url, {
      signal: opts.signal ?? AbortSignal.timeout(15_000),
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: JcylRaw[] };
    const results = Array.isArray(json.results) ? json.results : [];
    const seen = new Set<string>();
    const out: Fire[] = [];
    for (const r of results) {
      const key = `${r.codigo_ine ?? ''}|${r.termino_municipal ?? ''}|${r.fecha_de_inicio ?? ''}`;
      if (seen.has(key)) continue; // orden desc → nos quedamos con el parte más reciente
      seen.add(key);
      const f = jcylToFire(r);
      if (f) out.push(f);
    }
    return out;
  } catch {
    return [];
  }
}

/** Incendios de Castilla y León: INFORCYL en tiempo real; si no responde, cae
 * al dataset de partes de Opendatasoft. */
export async function fetchJcylFires(opts: FetchOptions = {}): Promise<Fire[]> {
  const live = await fetchInforcylFires(opts);
  if (live.length) return live;
  return fetchJcylOpendatasoft(opts);
}

// ── Andalucía: INFOCA (Plan INFOCA, ArcGIS FeatureServer público) ─────────────
// Descubierto desde el dashboard oficial (laagencia.maps.arcgis.com): capa
// "Estado del incendio" del servicio INFOCA/AN_INCIDENTES_PRO, consultable sin
// token. Trae estado, medios (aéreos, BRICAS, vehículos, técnicos…) y geometría.

const INFOCA_QUERY =
  'https://utility.arcgis.com/usrsvcs/servers/d6d1c0079ddd4c7f8876d58e13fcf1ac' +
  '/rest/services/INFOCA/AN_INCIDENTES_PRO/FeatureServer/2/query';

interface InfocaAttrs {
  OID_ENTERO?: number;
  ESRI_OID?: number;
  TERMINO_MUNICIPAL?: string;
  PROVINCIA?: string;
  TIPO_INCIDENTE?: string;
  ESTADO?: string;
  FECHA?: number; // epoch ms
  HORA?: string;
  MEDIOS_AEREOS?: number;
  UNASIF_ACO?: number;
  BRICAS?: number;
  GRUPOS_ESPECIALISTAS?: number;
  GRUPOS_APOYO?: number;
  UMIF?: number;
  VEHICULOS?: number;
  TECNICOS?: number;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function infocaResources(a: InfocaAttrs): Fire['resources'] {
  const aereos = num(a.MEDIOS_AEREOS);
  const aco = num(a.UNASIF_ACO);
  const brigada = num(a.BRICAS) + num(a.GRUPOS_ESPECIALISTAS) + num(a.GRUPOS_APOYO) + num(a.UMIF);
  const veh = num(a.VEHICULOS);
  const tec = num(a.TECNICOS);
  const aerialUnits: ResourceUnit<AerialKind>[] = [];
  if (aereos > 0) aerialUnits.push({ kind: 'helicoptero', count: aereos });
  if (aco > 0) aerialUnits.push({ kind: 'coordinacion', count: aco });
  const groundUnits: ResourceUnit<GroundKind>[] = [];
  if (brigada > 0) groundUnits.push({ kind: 'brigada', count: brigada });
  if (veh > 0) groundUnits.push({ kind: 'autobomba', count: veh });
  if (!aereos && !aco && !brigada && !veh && !tec) return undefined;
  return {
    aerial: aereos + aco || undefined,
    ground: brigada + veh || undefined,
    personnel: tec || undefined,
    aerialUnits: aerialUnits.length ? aerialUnits : undefined,
    groundUnits: groundUnits.length ? groundUnits : undefined,
  };
}

function infocaToFire(f: {
  attributes?: InfocaAttrs;
  geometry?: { x?: number; y?: number };
}): Fire | null {
  const a = f.attributes ?? {};
  const g = f.geometry;
  if (!g || typeof g.x !== 'number' || typeof g.y !== 'number') return null;

  const muni = titleCase(a.TERMINO_MUNICIPAL ?? 'Incendio');
  const date = typeof a.FECHA === 'number' ? new Date(a.FECHA).toISOString().slice(0, 10) : '';
  const hora = a.HORA && /^\d{1,2}:\d{2}/.test(a.HORA) ? a.HORA.slice(0, 5) : '00:00';
  const startedMs = date ? Date.parse(`${date}T${hora}:00+02:00`) : NaN;
  const startedAt = Number.isNaN(startedMs) ? new Date().toISOString() : new Date(startedMs).toISOString();
  const id = a.OID_ENTERO ?? a.ESRI_OID ?? slugify(muni);

  return {
    slug: `and-${slugify(muni)}-${id}`,
    name: muni,
    municipality: muni,
    province: titleCase(a.PROVINCIA ?? '') || '—',
    region: 'Andalucía',
    country: 'ES',
    state: esStateFromSituacion(a.ESTADO),
    level: null,
    type: 'forestal',
    hectares: 0, // INFOCA no publica superficie en esta capa
    coordinates: [g.x, g.y],
    startedAt,
    updatedAt: new Date().toISOString(), // frescura del dato (INFOCA no da modificado)
    resources: infocaResources(a),
    sources: ['infoca'],
  };
}

/** Incendios de Andalucía (INFOCA): activos/recientes no extinguidos. [] si falla. */
export async function fetchInfocaFires(opts: FetchOptions = {}): Promise<Fire[]> {
  try {
    // Solo el filtro de estado en la consulta (comparar FECHA con epoch da 400
    // en este FeatureServer); la recencia se filtra después en JS con FECHA.
    const where = `ESTADO <> 'EXTINGUIDO'`;
    const url =
      `${INFOCA_QUERY}?where=${encodeURIComponent(where)}` +
      `&outFields=*&returnGeometry=true&outSR=4326&resultRecordCount=200&f=json`;
    const res = await fetch(url, {
      signal: opts.signal ?? AbortSignal.timeout(15_000),
      headers: { 'User-Agent': INFORCYL_HEADERS['User-Agent'] },
      next: { revalidate: 180 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      features?: { attributes?: InfocaAttrs; geometry?: { x?: number; y?: number } }[];
    };
    const feats = Array.isArray(json.features) ? json.features : [];
    const recent = Date.now() - 20 * 86400e3; // descarta "activos" muy antiguos sin cerrar
    return feats
      .filter((f) => typeof f.attributes?.FECHA !== 'number' || f.attributes.FECHA >= recent)
      .map(infocaToFire)
      .filter((x): x is Fire => x !== null);
  } catch {
    return [];
  }
}

// ── EFFIS: perímetros de área quemada (Copernicus, CC BY 4.0) ─────────────────

const EFFIS_WFS = 'https://maps.effis.emergency.copernicus.eu/effis';

/** Área quemada EFFIS como Fire con perímetro + centroide, para enriquecer los
 * incendios oficiales cercanos. Best-effort: [] si el WFS/TLS falla. */
export async function fetchEffisPerimeters(opts: FetchOptions = {}): Promise<Fire[]> {
  const [minLon, minLat, maxLon, maxLat] = opts.bbox ?? IBERIA_BBOX;
  const url =
    `${EFFIS_WFS}?service=WFS&version=2.0.0&request=GetFeature&typeName=ms:modis.ba.poly` +
    `&outputFormat=application/json&srsName=EPSG:4326&count=300` +
    `&bbox=${minLat},${minLon},${maxLat},${maxLon},EPSG:4326`;
  try {
    const res = await fetch(url, {
      signal: opts.signal ?? AbortSignal.timeout(20_000),
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const gj = (await res.json()) as {
      features?: { properties?: Record<string, unknown>; geometry?: { type?: string; coordinates?: unknown } }[];
    };
    const feats = Array.isArray(gj.features) ? gj.features : [];
    const out: Fire[] = [];
    for (let i = 0; i < feats.length; i++) {
      const ring = outerRing(feats[i]?.geometry);
      if (!ring || ring.length < 4) continue;
      const centroid = ringCentroid(ring);
      const props = feats[i]?.properties ?? {};
      const area = Number(props.area_ha ?? props.AREA_HA ?? props.area ?? props.gross_ha) || 0;
      out.push({
        slug: `effis-${i}`,
        name: 'Área quemada',
        municipality: '—',
        province: '—',
        region: 'EFFIS',
        country: 'ES',
        state: 'extinguido',
        level: null,
        hectares: Math.round(area),
        coordinates: centroid,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sources: ['effis'],
        perimeter: ring,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Anillo exterior [lon,lat][] de un Polygon o MultiPolygon GeoJSON. */
function outerRing(geom?: { type?: string; coordinates?: unknown }): [number, number][] | null {
  if (!geom) return null;
  const c = geom.coordinates;
  try {
    if (geom.type === 'Polygon') return (c as number[][][])[0] as [number, number][];
    if (geom.type === 'MultiPolygon') return (c as number[][][][])[0]![0] as [number, number][];
  } catch {
    return null;
  }
  return null;
}

function ringCentroid(ring: [number, number][]): [number, number] {
  let x = 0;
  let y = 0;
  for (const p of ring) {
    x += p[0];
    y += p[1];
  }
  return [x / ring.length, y / ring.length];
}

/**
 * Adjunta a cada incendio el perímetro EFFIS más cercano (≤ 25 km), sin crear
 * entradas propias para las áreas EFFIS no emparejadas (evita duplicar/ensuciar).
 */
export function attachPerimeters(fires: Fire[], perimeters: Fire[]): Fire[] {
  if (!perimeters.length) return fires;
  return fires.map((f) => {
    if (f.perimeter) return f;
    let best: Fire | undefined;
    let bestKm = 25;
    for (const p of perimeters) {
      const km = haversineKm(f.coordinates, p.coordinates);
      if (km < bestKm) {
        bestKm = km;
        best = p;
      }
    }
    return best?.perimeter
      ? { ...f, perimeter: best.perimeter, hectares: f.hectares || best.hectares }
      : f;
  });
}

// ── Cataluña: Bombers de la Generalitat (ArcGIS FeatureServer público) ────────
// Capa de actuaciones urgentes con fase, descubierta desde el visor oficial
// (experience.arcgis.com embebido en interior.gencat.cat). Trae fase, municipio,
// tipo de vegetación, fechas y nº de vehículos, con geometría (outSR=4326).

const CATALUNYA_QUERY =
  'https://services7.arcgis.com/ZCqVt1fRXwwK6GF4/arcgis/rest/services' +
  '/ACTUACIONS_URGENTS_online_PRO_AMB_FASE_VIEW/FeatureServer/0/query';

interface CatalunyaAttrs {
  ACT_NUM_ACTUACIO?: string;
  ACT_DAT_INICI?: number;
  ACT_DAT_ACTUACIO?: number;
  ACT_DAT_ACTUAL?: number;
  DATA_ACT?: number;
  COM_FASE?: string | null;
  TAL_DESC_ALARMA2?: string;
  MUNICIPI_DPX?: string;
  MUNICIPI_SIG?: string;
  ACT_NUM_VEH?: number;
}

/** Fase de Bombers (catalán) → FireState. null = en curso sin fase → activo. */
function catStateFromFase(fase?: string | null): FireState {
  const f = (fase ?? '').toLowerCase();
  if (f.includes('control')) return 'controlado';
  if (f.includes('estabil')) return 'estabilizado';
  if (f.includes('exting')) return 'extinguido';
  return 'activo';
}

function epochToIso(n?: number): string | undefined {
  return typeof n === 'number' && Number.isFinite(n) ? new Date(n).toISOString() : undefined;
}

function catalunyaToFire(f: {
  attributes?: CatalunyaAttrs;
  geometry?: { x?: number; y?: number };
}): Fire | null {
  const a = f.attributes ?? {};
  const g = f.geometry;
  if (!g || typeof g.x !== 'number' || typeof g.y !== 'number') return null;

  const muni = titleCase(a.MUNICIPI_DPX || a.MUNICIPI_SIG || 'Incendi');
  const desc = (a.TAL_DESC_ALARMA2 ?? '').toLowerCase();
  const type: Fire['type'] = desc.includes('agr')
    ? 'agricola'
    : desc.includes('urban')
      ? 'urbano-forestal'
      : 'forestal';
  const veh = Number(a.ACT_NUM_VEH) || 0;
  const started = epochToIso(a.ACT_DAT_INICI) ?? epochToIso(a.ACT_DAT_ACTUACIO);
  const updated = epochToIso(a.ACT_DAT_ACTUAL) ?? epochToIso(a.DATA_ACT) ?? started ?? new Date().toISOString();

  return {
    slug: `cat-${slugify(muni)}-${a.ACT_NUM_ACTUACIO ?? slugify(muni)}`,
    name: muni,
    municipality: muni,
    province: '—', // la capa solo da municipio
    region: 'Cataluña',
    country: 'ES',
    state: catStateFromFase(a.COM_FASE),
    level: null,
    type,
    hectares: 0,
    coordinates: [g.x, g.y],
    startedAt: started ?? updated,
    updatedAt: updated,
    resources: veh > 0 ? { ground: veh, groundUnits: [{ kind: 'autobomba', count: veh }] } : undefined,
    sources: ['catalunya'],
  };
}

/** Incendios de vegetación de Cataluña (Bombers), no extinguidos y recientes. */
export async function fetchCatalunyaFires(opts: FetchOptions = {}): Promise<Fire[]> {
  try {
    const url =
      `${CATALUNYA_QUERY}?where=${encodeURIComponent("TAL_COD_ALARMA1 = 'IV'")}` +
      `&outFields=*&returnGeometry=true&outSR=4326&resultRecordCount=200&f=json`;
    const res = await fetch(url, {
      signal: opts.signal ?? AbortSignal.timeout(15_000),
      headers: { 'User-Agent': INFORCYL_HEADERS['User-Agent'] },
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      features?: { attributes?: CatalunyaAttrs; geometry?: { x?: number; y?: number } }[];
    };
    const feats = Array.isArray(json.features) ? json.features : [];
    const recent = Date.now() - 3 * 86400e3;
    return feats
      .filter((f) => {
        const fase = (f.attributes?.COM_FASE ?? '').toLowerCase();
        if (fase.includes('exting')) return false; // fuera extinguidos (ruido agrícola)
        const upd = f.attributes?.ACT_DAT_ACTUAL ?? f.attributes?.DATA_ACT;
        return typeof upd !== 'number' || upd >= recent;
      })
      .map(catalunyaToFire)
      .filter((x): x is Fire => x !== null);
  } catch {
    return [];
  }
}

// ── Pendientes (fases posteriores) ───────────────────────────────────────────
// ICNF (áreas ardidas PT) queda pendiente.

export async function fetchIcnfBurntAreas(_opts: FetchOptions = {}): Promise<Fire[]> {
  return [];
}
