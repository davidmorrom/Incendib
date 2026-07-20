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
  Country,
  TimelineEntry,
} from '@/types/fire';
import { inEsPt } from '@/lib/geo/point-in-region';
import { utmToLonLat } from '@/lib/geo/utm';

/**
 * Construye el timeline de evolución de un incendio a partir de los eventos
 * fechados que publica cada fuente (declaración, cambios de nivel/estado…).
 * Descarta los que no tienen fecha y ordena de más reciente a más antiguo.
 * Devuelve undefined si no hay ninguno (la ficha oculta la sección).
 */
function buildTimeline(
  entries: { at?: string; label: string; state?: FireState }[],
): TimelineEntry[] | undefined {
  const out = entries
    .filter((e): e is { at: string; label: string; state?: FireState } => Boolean(e.at))
    .map((e) => ({ at: e.at, label: e.label, state: e.state }))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return out.length ? out : undefined;
}

export interface FetchOptions {
  /** Bounding box [minLon, minLat, maxLon, maxLat]. */
  bbox?: [number, number, number, number];
  /** Ventana temporal en días (FIRMS area/csv admite 1–5). */
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
  // La API area/csv de FIRMS solo admite rango 1..5 días; pedir más devuelve
  // "Invalid day range" → []. Acotamos a 5 para que ninguna llamada falle en silencio.
  const days = Math.min(5, Math.max(1, opts.days ?? 1));
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
    timeline: buildTimeline([
      { at: started, label: 'Início', state: 'activo' },
      ...(state !== 'activo' && d.status ? [{ at: updated, label: d.status.trim(), state }] : []),
    ]),
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
  fecha_nivel_maximo?: string;
  emergencia_cpm?: number;
  emergencia_num1?: number;
  emergencia_num2?: number;
  medios?: InforcylMedio[];
  // Superficie afectada oficial (ha): arbolado + pasto.
  sup_arbolado?: number;
  sup_pasto?: number;
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

  // Histórico de evolución con los eventos fechados de INFORCYL (la fuente más rica).
  const nivelMax = Number(e.nivel_maximo);
  const timeline = buildTimeline([
    { at: started, label: 'Declarado', state: 'activo' },
    {
      at: parseCylDateTime(e.fecha_nivel_maximo),
      label: Number.isFinite(nivelMax) ? `Nivel máximo ${nivelMax}` : 'Nivel máximo',
    },
    { at: parseCylDateTime(e.fecha_estabilizado), label: 'Estabilizado', state: 'estabilizado' },
    { at: parseCylDateTime(e.fecha_control), label: 'Controlado', state: 'controlado' },
  ]);

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
    // Superficie oficial INFORCYL = arbolado + pasto (ha).
    hectares: Math.round((num(e.sup_arbolado) + num(e.sup_pasto)) * 10) / 10,
    coordinates: [lon, lat],
    startedAt: started ?? updated,
    updatedAt: updated,
    resources: inforcylMedios(e.medios ?? []),
    timeline,
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
    // INFOCA no publica fechas de cambio de estado; solo la declaración.
    timeline: buildTimeline([{ at: startedAt, label: 'Declarado', state: 'activo' }]),
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

/**
 * Ventana de campaña: la capa `modis.ba.poly` es MULTI-ANUAL (contiene áreas
 * quemadas de años pasados). Solo nos interesan las recientes, para (a) enriquecer
 * incendios activos con su superficie/perímetro y (b) dibujar el área quemada de
 * la campaña. Filtramos por FIREDATE dentro de esta ventana.
 */
const EFFIS_RECENT_DAYS = 45;

/** Claves en minúscula para leer propiedades sin depender de mayúsculas. */
function lowerKeys(p?: Record<string, unknown>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (p) for (const k of Object.keys(p)) o[k.toLowerCase()] = p[k];
  return o;
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

/** "2026-07-08 11:51:00[.micros]" → ISO UTC; null si no parsea. Exportada para tests. */
export function parseEffisDate(v: unknown): string | null {
  const s = typeof v === 'string' ? v : '';
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(s);
  if (m) return `${m[1]}T${m[2]}Z`;
  const d = /^(\d{4}-\d{2}-\d{2})$/.exec(s);
  return d ? `${d[1]}T00:00:00Z` : null;
}

/**
 * Áreas quemadas EFFIS (Copernicus, CC BY 4.0) recientes como `Fire` con
 * perímetro real + centroide. Sirven para adjuntar superficie/perímetro a los
 * incendios oficiales cercanos y para la capa de área quemada del mapa.
 *
 * Detalles del WFS de EFFIS (MapServer): hay que pedir `outputFormat=geojson`
 * (ignora `application/json` y devolvería GML → fallo silencioso), y ordenar por
 * `LASTUPDATE` desc para quedarnos con la campaña en curso de una capa multi-anual.
 * Best-effort: [] ante cualquier fallo (nunca rompe el mapa).
 */
export async function fetchEffisPerimeters(opts: FetchOptions = {}): Promise<Fire[]> {
  const [minLon, minLat, maxLon, maxLat] = opts.bbox ?? IBERIA_BBOX;
  // WFS 2.0.0 + EPSG:4326 ⇒ orden de ejes lat,lon en el bbox.
  // `count` acotado: la respuesta trae geometría a resolución nativa (MODIS) y
  // 1000 polígonos son ~9 MB (supera el límite de caché de Next y agota el
  // tiempo). Ordenado por actualización reciente, los primeros ~200 son la
  // campaña en curso; el filtro por fecha de abajo afina a la ventana reciente.
  const url =
    `${EFFIS_WFS}?service=WFS&version=2.0.0&request=GetFeature&typeName=ms:modis.ba.poly` +
    `&outputFormat=geojson&srsName=EPSG:4326&sortBy=LASTUPDATE+D&count=80` +
    `&bbox=${minLat},${minLon},${maxLat},${maxLon},EPSG:4326`;
  try {
    const res = await fetch(url, {
      signal: opts.signal ?? AbortSignal.timeout(30_000),
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const gj = (await res.json()) as {
      features?: { properties?: Record<string, unknown>; geometry?: { type?: string; coordinates?: unknown } }[];
    };
    const feats = Array.isArray(gj.features) ? gj.features : [];
    const cutoff = Date.now() - EFFIS_RECENT_DAYS * 86_400_000;
    const out: Fire[] = [];
    for (const feat of feats) {
      const ring = outerRing(feat?.geometry);
      if (!ring || ring.length < 4) continue;
      // Recorte a tierra de España/Portugal: el bbox incluye Francia/Andorra/mar,
      // pero Incendib es solo ES+PT (evita "áreas quemadas" francesas).
      const centroid = ringCentroid(ring);
      if (!inEsPt(centroid[0], centroid[1])) continue;
      const props = lowerKeys(feat?.properties);
      const started = parseEffisDate(props.firedate);
      // Solo campaña reciente (capa multi-anual): descarta áreas de años previos.
      if (started && Date.parse(started) < cutoff) continue;
      const updated = parseEffisDate(props.lastupdate) ?? started ?? new Date().toISOString();
      const commune = str(props.commune).trim();
      const province = str(props.province).trim();
      const country: Country = str(props.country).toUpperCase() === 'PT' ? 'PT' : 'ES';
      const area = num(props.area_ha ?? props.area ?? props.gross_ha);
      out.push({
        slug: `effis-${str(props.id) || out.length}`,
        name: commune || 'Área quemada',
        municipality: commune || '—',
        province: province || '—',
        region: 'EFFIS',
        country,
        state: 'extinguido',
        level: null,
        hectares: Math.round(area),
        coordinates: centroid,
        startedAt: started ?? updated,
        updatedAt: updated,
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
 * Adjunta a cada incendio el área quemada EFFIS más cercana (≤ 12 km): le da
 * forma (perímetro) en mapa/ficha y, **solo si la fuente oficial no publica
 * superficie**, rellena las hectáreas como ESTIMACIÓN (marcada `hectaresApprox`,
 * se muestra con «~»). La cifra oficial (p. ej. INFORCYL) siempre tiene prioridad;
 * EFFIS/MODIS (250 m) subestima y va con retraso, por eso nunca la sobrescribe.
 * Las áreas quemadas se muestran además como capa propia del mapa (getBurnedAreas).
 */
export function attachPerimeters(fires: Fire[], perimeters: Fire[]): Fire[] {
  if (!perimeters.length) return fires;
  return fires.map((f) => {
    if (f.perimeter) return f;
    let best: Fire | undefined;
    let bestKm = 12;
    for (const p of perimeters) {
      const km = haversineKm(f.coordinates, p.coordinates);
      if (km < bestKm) {
        bestKm = km;
        best = p;
      }
    }
    if (!best?.perimeter) return f;
    const out: Fire = { ...f, perimeter: best.perimeter };
    // Rellena superficie estimada solo si no hay cifra oficial.
    if (!f.hectares && best.hectares > 0) {
      out.hectares = best.hectares;
      out.hectaresApprox = true;
    }
    return out;
  });
}

// ── Capa de calidad: confirmación por focos FIRMS ────────────────────────────

/**
 * Marca `satelliteConfirmed` (+ distancia `hotspotKm`) en los incendios con un
 * foco FIRMS a ≤ radiusKm. Es CONFIRMACIÓN, no filtro: la presencia de foco
 * corrobora actividad térmica real ahora; su ausencia NO descarta el incendio
 * (FIRMS falla por nubes, tamaño o paso del satélite), así que no elimina
 * ninguno. Para fuentes con estado "activo" poco fiable úsese `gateByHotspots`.
 */
export function confirmWithHotspots(fires: Fire[], hotspots: Hotspot[], radiusKm = 6): Fire[] {
  if (!fires.length || !hotspots.length) return fires;
  return fires.map((f) => {
    let best = Infinity;
    for (const h of hotspots) {
      const km = haversineKm(f.coordinates, h.coordinates);
      if (km < best) best = km;
      if (best <= radiusKm) break;
    }
    return best <= radiusKm
      ? { ...f, satelliteConfirmed: true, hotspotKm: Math.round(best * 10) / 10 }
      : f;
  });
}

/**
 * Gate por satélite: deja SOLO los incendios confirmados por un foco FIRMS
 * cercano. Para fuentes cuya señal de "activo" no es fiable (logs acumulativos,
 * p. ej. INFOCAM); NO usar con fuentes que ya marcan extinguidos y filtran por
 * recencia (ahí generaría falsos negativos por los fallos de detección de FIRMS).
 */
export function gateByHotspots(fires: Fire[], hotspots: Hotspot[], radiusKm = 5): Fire[] {
  return confirmWithHotspots(fires, hotspots, radiusKm).filter((f) => f.satelliteConfirmed);
}

// ── Incendios derivados de satélite (zonas sin cobertura oficial) ─────────────

export interface DeriveSatelliteOptions {
  /** Un foco a ≤ este radio de un incendio oficial ya está representado (se ignora). */
  representedKm?: number;
  /** Focos a ≤ este radio se agrupan en el mismo clúster (mismo incendio). */
  clusterKm?: number;
  /** Nº mínimo de focos para promover un clúster sin respaldo de EFFIS. */
  minCluster?: number;
  /** Distancia máx. para adjuntar un área quemada EFFIS al clúster. */
  matchKm?: number;
  /** "Ahora" en ms (inyectable para pruebas deterministas). */
  now?: number;
}

interface HotspotCluster {
  hotspots: Hotspot[];
  /** Centroide ponderado por FRP [lon,lat]. */
  center: [number, number];
}

/** Agrupa focos por cercanía (enlace simple: cae en el clúster si está a ≤ km de alguno). */
function clusterHotspots(hotspots: Hotspot[], km: number): HotspotCluster[] {
  const clusters: Hotspot[][] = [];
  for (const h of hotspots) {
    let target: Hotspot[] | undefined;
    for (const c of clusters) {
      if (c.some((o) => haversineKm(o.coordinates, h.coordinates) <= km)) {
        target = c;
        break;
      }
    }
    if (target) target.push(h);
    else clusters.push([h]);
  }
  return clusters.map((c) => ({ hotspots: c, center: frpCentroid(c) }));
}

/** Centroide ponderado por FRP (un foco sin FRP pesa 1); cae a media simple si suma 0. */
function frpCentroid(hs: Hotspot[]): [number, number] {
  let x = 0;
  let y = 0;
  let w = 0;
  for (const h of hs) {
    const weight = h.frp > 0 ? h.frp : 1;
    x += h.coordinates[0] * weight;
    y += h.coordinates[1] * weight;
    w += weight;
  }
  return w > 0 ? [x / w, y / w] : [hs[0]!.coordinates[0], hs[0]!.coordinates[1]];
}

/** ¿Hay algún incendio a ≤ km del punto? (para saber si el clúster ya está representado). */
function nearAny(point: [number, number], fires: Fire[], km: number): boolean {
  for (const f of fires) if (haversineKm(point, f.coordinates) <= km) return true;
  return false;
}

/**
 * Construye incidentes PROVISIONALES a partir de focos FIRMS en zonas SIN fuente
 * oficial (Madrid, Castilla-La Mancha, Extremadura, Aragón…), donde hoy un gran
 * incendio solo se ve como puntos satelitales sueltos y nunca como marcador.
 *
 * Estrategia honesta (detección satelital ≠ incendio confirmado):
 *   1. Descarta los focos que ya están junto a un incendio oficial (ya representados).
 *   2. Agrupa el resto por cercanía: cada clúster = un frente activo.
 *   3. Adjunta el área quemada EFFIS más cercana (perímetro + superficie ~ +
 *      municipio/provincia) si la hay; eso da nombre y forma reales al incidente.
 *   4. Promueve el clúster a `Fire` (state 'activo', `satelliteOnly`) si tiene
 *      respaldo de EFFIS o al menos `minCluster` focos (evita ruido de un pixel
 *      aislado: quema agrícola, industria…).
 *
 * NUNCA inventa cifras: sin EFFIS, la superficie queda en 0 («sin dato»). El
 * resultado se marca `satelliteOnly` para que la UI lo comunique como detección
 * satelital, no como parte oficial. Módulo puro y determinista (testeable).
 */
export function deriveSatelliteFires(
  official: Fire[],
  hotspots: Hotspot[],
  perimeters: Fire[],
  opts: DeriveSatelliteOptions = {},
): Fire[] {
  const representedKm = opts.representedKm ?? 6;
  const clusterKm = opts.clusterKm ?? 4;
  const minCluster = opts.minCluster ?? 3;
  const matchKm = opts.matchKm ?? 8;
  const now = opts.now ?? Date.now();

  // 1. Solo focos que NO estén ya junto a un incendio oficial.
  const orphan = hotspots.filter((h) => !nearAny(h.coordinates, official, representedKm));
  if (!orphan.length) return [];

  const usedPerimeters = new Set<Fire>();
  const out: Fire[] = [];

  for (const cluster of clusterHotspots(orphan, clusterKm)) {
    // 3. Área quemada EFFIS más cercana aún sin usar (da nombre, forma y superficie).
    let match: Fire | undefined;
    let matchKmBest = matchKm;
    for (const p of perimeters) {
      if (usedPerimeters.has(p)) continue;
      const dist = haversineKm(cluster.center, p.coordinates);
      if (dist < matchKmBest) {
        matchKmBest = dist;
        match = p;
      }
    }

    // 4. Umbral de promoción: respaldo EFFIS, o suficientes focos agrupados.
    if (!match && cluster.hotspots.length < minCluster) continue;
    if (match) usedPerimeters.add(match);

    const times = cluster.hotspots.map((h) => Date.parse(h.acquiredAt)).filter(Number.isFinite);
    const startedAt = match?.startedAt ?? new Date(times.length ? Math.min(...times) : now).toISOString();
    const updatedAt = new Date(times.length ? Math.max(...times) : now).toISOString();
    const center = match ? match.coordinates : cluster.center;
    const key = `${center[0].toFixed(3)}-${center[1].toFixed(3)}`;

    out.push({
      slug: match ? `sat-${match.slug}` : `sat-${key}`,
      name: match && match.name !== 'Área quemada' ? match.name : 'Foco activo',
      municipality: match?.municipality ?? '—',
      province: match?.province ?? '—',
      region: match && match.region !== 'EFFIS' ? match.region : 'Detección satelital',
      country: match?.country ?? 'ES',
      state: 'activo',
      level: null,
      type: 'forestal',
      hectares: match?.hectares ?? 0,
      hectaresApprox: match && match.hectares > 0 ? true : undefined,
      coordinates: center,
      startedAt,
      updatedAt,
      satelliteOnly: true,
      perimeter: match?.perimeter,
      // Fuentes reales que sustentan el incidente: siempre FIRMS; EFFIS si enriquece.
      sources: match ? ['effis', 'firms'] : ['firms'],
    });
  }

  return out;
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
    timeline: buildTimeline([
      { at: started, label: 'Declarat', state: 'activo' },
      ...(a.COM_FASE && catStateFromFase(a.COM_FASE) !== 'activo'
        ? [{ at: updated, label: titleCase(a.COM_FASE), state: catStateFromFase(a.COM_FASE) }]
        : []),
    ]),
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

// ── Castilla-La Mancha: INFOCAM (ArcGIS FeatureServer público de la JCCM) ──────
// ⚠️ NO SE USA en getFires (a propósito). La capa V_Incendio (org
// LVA9E9zjh6QfM7Mo) es un LOG ACUMULATIVO: nunca cierra incidentes (`Estado`
// queda "Activo" para siempre, `Fecha_Fin` casi siempre nula) y no publica
// "última actualización". Verificado contra prensa (2026-07-12): de los 11 que
// mostraba como activos, 0 lo estaban (todos extintos/controlados; alguno ni
// existía). Por eso se desconecta: mejor sin CLM que con activos falsos.
// Para re-activar con honestidad: cruzar cada incendio con focos FIRMS recientes
// (<48 h, <~4 km) y mostrar solo los confirmados por satélite. Se conserva el
// adaptador (endpoint + parseo) para ese futuro. Trae punto, municipio y fechas;
// sin nivel, sin medios, sin superficie.

const INFOCAM_QUERY =
  'https://services-eu1.arcgis.com/LVA9E9zjh6QfM7Mo/arcgis/rest/services/V_Incendio/FeatureServer/0/query';

interface InfocamAttrs {
  OBJECTID?: number;
  Incendios?: string; // nombre del incendio
  Estado?: string; // Activo / Extinguido (no fiable)
  CCAA?: string;
  Provincia?: string;
  Municipio?: string;
  Paraje?: string;
  Fecha_Inicio?: number; // epoch ms
  Fecha_Fin?: number | null; // epoch ms; null si sigue abierto
  ID_Incendio?: string | number;
}

function infocamToFire(f: {
  attributes?: InfocamAttrs;
  geometry?: { x?: number; y?: number };
}): Fire | null {
  const a = f.attributes ?? {};
  const g = f.geometry;
  if (!g || typeof g.x !== 'number' || typeof g.y !== 'number') return null;

  const muni = titleCase(a.Municipio || a.Incendios || 'Incendio');
  const started = typeof a.Fecha_Inicio === 'number' ? new Date(a.Fecha_Inicio).toISOString() : undefined;
  const id = a.ID_Incendio ?? a.OBJECTID ?? slugify(muni);

  return {
    slug: `clm-${slugify(muni)}-${id}`,
    name: muni,
    municipality: muni,
    province: titleCase(a.Provincia ?? '') || '—',
    region: 'Castilla-La Mancha',
    country: 'ES',
    // La fuente solo distingue Activo/Extinguido; los extintos se filtran fuera.
    state: 'activo',
    level: null,
    type: 'forestal',
    hectares: 0, // INFOCAM no publica superficie → estimación EFFIS por cercanía
    coordinates: [g.x, g.y],
    startedAt: started ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeline: buildTimeline([{ at: started, label: 'Declarado', state: 'activo' }]),
    sources: ['infocam'],
  };
}

/** Incendios de Castilla-La Mancha (INFOCAM): abiertos y recientes. [] si falla. */
export async function fetchInfocamFires(opts: FetchOptions = {}): Promise<Fire[]> {
  try {
    // Traemos todo (dataset pequeño, ~200) ordenado por fecha y filtramos en JS,
    // porque el filtro por fecha en el `where` de este servicio es poco fiable.
    const url =
      `${INFOCAM_QUERY}?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326` +
      `&orderByFields=${encodeURIComponent('Fecha_Inicio DESC')}&resultRecordCount=500&f=json`;
    const res = await fetch(url, {
      signal: opts.signal ?? AbortSignal.timeout(15_000),
      headers: { 'User-Agent': INFORCYL_HEADERS['User-Agent'] },
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      features?: { attributes?: InfocamAttrs; geometry?: { x?: number; y?: number } }[];
    };
    const feats = Array.isArray(json.features) ? json.features : [];
    // Ventana de 7 días: INFOCAM casi nunca cierra los incendios (Fecha_Fin queda
    // nula ~siempre) y no publica "última actualización", así que la única señal
    // fiable de "activo ahora" es una Fecha_Inicio reciente. 30 días arrastraba
    // decenas de incendios ya apagados; 7 días ≈ incidentes de esta semana.
    const recent = Date.now() - 7 * 86400e3;
    return feats
      .filter((ft) => {
        const a = ft.attributes ?? {};
        if (typeof a.Fecha_Inicio !== 'number') return false; // sin fecha → descartar
        if (a.Fecha_Inicio < recent) return false; // solo campaña de la última semana
        if (a.Fecha_Fin != null) return false; // cerrado (si algún día lo marcan)
        if ((a.Estado ?? '').toLowerCase().includes('exting')) return false;
        // Solo CLM (el dataset trae incendios fronterizos de otras CCAA).
        if (a.CCAA && !/mancha/i.test(a.CCAA)) return false;
        return true;
      })
      .map(infocamToFire)
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
