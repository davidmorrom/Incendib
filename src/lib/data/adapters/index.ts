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
import { inEsPt, inRing } from '@/lib/geo/point-in-region';
import { utmToLonLat } from '@/lib/geo/utm';
import { districtForConcelho } from '@/lib/geo/pt-concelhos';
import { findProvince } from '@/lib/geo/provinces';
import { slugify as slugifyShared } from '@/lib/utils/slug';
import { convex, buffer, points as turfPoints, area as turfArea } from '@turf/turf';

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
export function haversineKm(a: [number, number], b: [number, number]): number {
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

// ── Portugal: ANEPC / SGIFR (FeatureServer oficial de ocorrências) ────────────
// Fuente OFICIAL facilitada a Incendib por la AGIF y el ICNF: el FeatureServer
// público de la ANEPC que alimenta el SIFOR /
// GeoSIFOR (sgifr.gov.pt/fogos-incendios-rurais-ativos y geosifor.sgifr.gov.pt).
// Es la MISMA fuente subyacente que fogos.pt (Sistema de Informação Operacional
// da ANEPC), pero desde el endpoint autoritativo y sin registro: por eso pasa a
// ser la fuente PRIMARIA de Portugal y fogos.pt queda de respaldo.
//
// Condiciones (AGIF/ICNF, jul 2026): no hay límite de peticiones configurado pero
// el servicio se congestiona en picos de incendios → se cachea del lado servidor
// (revalidate) y se consulta con moderación (la BD se actualiza ~cada 10 min).
// Atribución: ANEPC (https://prociv.gov.pt); NO AGIF ni fogos.pt para este servicio.
//
// Filtro por campo `CodNatureza` (AGIF): 3101 povoamentos florestais, 3103 matos,
// 3105 áreas agrícolas = incendios reales. 3107 rescaldo, 3109 fogo controlado,
// 3111 queima y 4335 prevenção NO son incendios (se excluyen). El feed contiene
// solo ocorrências actuales (verificado: no es un log acumulativo, no trae
// «Encerrada»), a diferencia de INFOCAM.

const ANEPC_QUERY =
  'https://services-eu1.arcgis.com/VlrHb7fn5ewYhX6y/ArcGIS/rest/services' +
  '/OcorrenciasSite/FeatureServer/0/query';

/** CodNatureza que corresponden a incendios reales (AGIF): povoamentos/matos/agrícola. */
const ANEPC_FIRE_NATUREZA = [3101, 3103, 3105] as const;

interface AnepcAttrs {
  Numero?: string | number;
  ID?: string | number;
  CodNatureza?: number;
  EstadoOcorrencia?: string;
  EstadoAgrupado?: string;
  DataOcorrencia?: number; // epoch ms (início da ocorrência)
  DataInicioOcorrencia?: string; // "DD/MM/YYYY HH:MM" (hora local)
  DataDosDados?: number; // epoch ms (frescura del dato)
  Regiao?: string;
  SubRegiao?: string;
  Concelho?: string;
  Freguesia?: string;
  Localidade?: string;
  Operacionais?: number;
  MeiosTerrestres?: number;
  MeiosAereos?: number;
  Latitude?: number;
  Longitude?: number;
}

/** CodNatureza de incendio real → tipo. 3105 = áreas agrícolas; resto, forestal. */
function anepcType(cod?: number): Fire['type'] {
  return cod === 3105 ? 'agricola' : 'forestal';
}

/** Medios de la ANEPC: totales (operacionais / meios terrestres / meios aéreos). */
function anepcResources(a: AnepcAttrs): Fire['resources'] {
  const personnel = num(a.Operacionais);
  const ground = num(a.MeiosTerrestres);
  const aerial = num(a.MeiosAereos);
  if (!personnel && !ground && !aerial) return undefined;
  // La ANEPC da recuentos totales, sin desglosar tipo de aeronave ni de vehículo:
  // aéreo genérico y terrestre como autobomba (igual criterio que fogos.pt).
  return {
    aerial: aerial || undefined,
    ground: ground || undefined,
    personnel: personnel || undefined,
    aerialUnits: aerial > 0 ? [{ kind: 'aereo', count: aerial }] : undefined,
    groundUnits: ground > 0 ? [{ kind: 'autobomba', count: ground }] : undefined,
  };
}

function anepcToFire(f: {
  attributes?: AnepcAttrs;
  geometry?: { x?: number; y?: number };
}): Fire | null {
  const a = f.attributes ?? {};
  const g = f.geometry;
  const lon = typeof g?.x === 'number' ? g.x : typeof a.Longitude === 'number' ? a.Longitude : NaN;
  const lat = typeof g?.y === 'number' ? g.y : typeof a.Latitude === 'number' ? a.Latitude : NaN;
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;

  const { state, ptState } = ptStateFromStatus(a.EstadoOcorrencia ?? '');
  const concelho = (a.Concelho ?? '').trim();
  const region = (a.SubRegiao || a.Regiao || 'Portugal').trim();
  const name = collapseDup(a.Localidade || a.Freguesia || concelho || 'Incêndio');
  // El feed publica concelho/região pero NO distrito; lo derivamos del concelho
  // (catálogo CAOP) para la «provincia»; respaldo: sub-região.
  const subReg = (a.SubRegiao || '').trim();
  const province = districtForConcelho(concelho) ?? (subReg || '—');
  const started = epochToIso(a.DataOcorrencia);
  const updated = epochToIso(a.DataDosDados) ?? started ?? new Date().toISOString();
  const estado = (a.EstadoOcorrencia ?? '').trim();
  const id = a.Numero ?? a.ID ?? slugify(name);

  return {
    slug: `pt-${slugify(concelho || name)}-${id}`,
    name,
    municipality: concelho || '—',
    province,
    region: `${region} (PT)`,
    country: 'PT',
    state,
    ptState,
    level: null,
    type: anepcType(a.CodNatureza),
    hectares: 0, // el feed de ocorrências no publica superficie (área solo tras extinción)
    coordinates: [lon, lat],
    startedAt: started ?? updated,
    updatedAt: updated,
    resources: anepcResources(a),
    timeline: buildTimeline([
      { at: started, label: 'Início', state: 'activo' },
      ...(state !== 'activo' && estado ? [{ at: updated, label: estado, state }] : []),
    ]),
    sources: ['anepc'],
  };
}

/**
 * Incendios rurales activos de Portugal desde el FeatureServer OFICIAL de la
 * ANEPC (fuente primaria de PT). El servicio solo contiene ocorrências actuales
 * (no es un log acumulativo), aun así se excluyen por seguridad los extinguidos y
 * los muy antiguos (backstop de 45 días). [] ante cualquier fallo.
 */
export async function fetchAnepcFires(opts: FetchOptions = {}): Promise<Fire[]> {
  try {
    const where = `CodNatureza IN (${ANEPC_FIRE_NATUREZA.join(',')})`;
    const url =
      `${ANEPC_QUERY}?where=${encodeURIComponent(where)}` +
      `&outFields=*&returnGeometry=true&outSR=4326&resultRecordCount=500&f=json`;
    const res = await fetch(url, {
      signal: opts.signal ?? AbortSignal.timeout(15_000),
      headers: { 'User-Agent': INFORCYL_HEADERS['User-Agent'] },
      // La BD de la ANEPC se actualiza ~cada 10 min; cacheamos para no saturar el
      // servicio en picos (condición pedida por la AGIF).
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      features?: { attributes?: AnepcAttrs; geometry?: { x?: number; y?: number } }[];
    };
    const feats = Array.isArray(json.features) ? json.features : [];
    const recent = Date.now() - 45 * 86400e3;
    return feats
      .map(anepcToFire)
      .filter((f): f is Fire => f !== null)
      .filter((f) => f.state !== 'extinguido') // defensivo: fuera «Encerrada»
      .filter((f) => {
        const t = Date.parse(f.startedAt);
        return !Number.isFinite(t) || t >= recent;
      });
  } catch {
    return [];
  }
}

/**
 * Incendios de Portugal: ANEPC (FeatureServer oficial) como PRIMARIA; si no
 * responde o viene vacía, respaldo con fogos.pt. Comparten la misma fuente
 * subyacente (Sistema de Informação Operacional da ANEPC), por eso no se combinan
 * (evita duplicados) sino que se usa una u otra (patrón de INFORCYL→Opendatasoft).
 */
export async function fetchPortugalFires(opts: FetchOptions = {}): Promise<Fire[]> {
  const anepc = await fetchAnepcFires(opts);
  if (anepc.length) return anepc;
  return fetchFogosActive(opts);
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
  const province = titleCase(a.PROVINCIA ?? '') || '—';
  // INFOCA también lista incidentes fuera de Andalucía en los que despliega apoyo
  // (caso real: La Mierla, Guadalajara): la región (CCAA) se deriva de la
  // provincia con el catálogo; solo si no se reconoce se asume Andalucía.
  const region = findProvince(slugifyShared(province))?.region ?? 'Andalucía';

  return {
    slug: `and-${slugify(muni)}-${id}`,
    name: muni,
    municipality: muni,
    province,
    region,
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
 * Tolerancia (km) por FUERA del anillo para considerar que un incendio "posee" un
 * área quemada EFFIS. Un marcador DENTRO del polígono siempre cuenta; si está
 * fuera, solo si su borde queda a ≤ este margen (el punto oficial de ignición cae
 * a veces justo fuera del área mapeada por el desfase del marcador y la resolución
 * de MODIS ~250 m; caso real: La Mierla/Guadalajara, marcador a 0,37 km del borde).
 * Un margen amplio (p. ej. 12 km) haría que un incendio pequeño y cercano heredase
 * la superficie ENORME de la cicatriz de otro fuego: dato falso, no aproximación.
 */
const ATTACH_MARGIN_KM = 3;

/**
 * Un área quemada solo puede pertenecer al incendio si no es una cicatriz vieja:
 * si EFFIS la detectó (FIREDATE→startedAt) mucho antes de que el incendio
 * empezara, es de OTRO fuego anterior en el mismo paraje (p. ej. reactivaciones
 * tipo El Barraco) y no debe prestarle ni forma ni hectáreas.
 */
const SCAR_MAX_AGE_MS = 7 * 86400e3;

/**
 * Distancia (km) de un punto al BORDE del anillo (mínima a sus vértices; los
 * anillos EFFIS son densos, ~250 m entre vértices). Devuelve un valor real también
 * para puntos interiores (no se cortocircuita a 0), para poder discriminar entre
 * varios marcadores dentro del mismo polígono por geografía y no por el orden de
 * las fuentes. La pertenencia "dentro" se comprueba aparte con `inRing`. El
 * centroide NO sirve de referencia: en un gran incendio (decenas de miles de ha)
 * queda a >20 km del punto de ignición donde la fuente pone el marcador (La
 * Mierla/Guadalajara: marcador a 0,4 km del borde y a 21 km del centroide).
 */
function distanceToRingKm(pt: [number, number], ring: [number, number][]): number {
  let best = Infinity;
  for (const v of ring) {
    const km = haversineKm(pt, v);
    if (km < best) best = km;
  }
  return best;
}

/**
 * Adjunta a los incendios el área quemada EFFIS correspondiente (borde a
 * ≤ ATTACH_RADIUS_KM y detección no anterior en >7 días al inicio del incendio):
 * le da forma (perímetro) en mapa/ficha y, **solo si la fuente oficial no publica
 * superficie**, rellena las hectáreas como ESTIMACIÓN (marcada `hectaresApprox`,
 * se muestra con «~»). La cifra oficial (p. ej. INFORCYL) siempre tiene prioridad;
 * EFFIS/MODIS (250 m) subestima y va con retraso, por eso nunca la sobrescribe.
 * Las áreas quemadas se muestran además como capa propia del mapa (getBurnedAreas).
 *
 * Admisibilidad ESTRECHA: un incendio solo "posee" un área quemada si su marcador
 * cae DENTRO del anillo o a ≤ ATTACH_MARGIN_KM de su borde. Así un incendio lejano
 * (p. ej. a 6-12 km) no hereda ni la forma ni la superficie enorme de la cicatriz
 * de otro fuego (dato falso).
 *
 * Asignación **1:1**: cada área quemada (un incendio físico) se adjudica a UN solo
 * incidente y cada incidente recibe a lo sumo una. Así un polígono grande no se
 * duplica en dos marcadores distintos (caso real: La Mierla, 35 268 ha, se
 * adjuntaba a la vez a Guadalajara/INFOCA y a Retortillo de Soria/INFORCYL, a
 * 46 km, doblando la superficie). Emparejamiento codicioso: primero los pares con
 * el marcador DENTRO del anillo y, dentro de cada grupo, por distancia al borde
 * ascendente (geografía, nunca el orden de las fuentes).
 */
export function attachPerimeters(fires: Fire[], perimeters: Fire[]): Fire[] {
  if (!perimeters.length) return fires;
  // Pre-cálculo por perímetro: bbox expandida por el margen (descarte barato) y
  // fecha de detección, para no medir miles de vértices contra cada incendio. Un
  // marcador interior siempre cae dentro de la bbox, así que el margen solo cubre
  // la tolerancia por fuera.
  const marginDeg = ATTACH_MARGIN_KM / 80; // grados; ~80 km/° de longitud en Iberia
  const candidates = perimeters
    .filter((p) => p.perimeter && p.perimeter.length >= 4)
    .map((p) => {
      let minLon = Infinity;
      let minLat = Infinity;
      let maxLon = -Infinity;
      let maxLat = -Infinity;
      for (const [x, y] of p.perimeter!) {
        if (x < minLon) minLon = x;
        if (x > maxLon) maxLon = x;
        if (y < minLat) minLat = y;
        if (y > maxLat) maxLat = y;
      }
      return {
        p,
        detectedMs: Date.parse(p.startedAt),
        bbox: [minLon - marginDeg, minLat - marginDeg, maxLon + marginDeg, maxLat + marginDeg] as const,
      };
    });

  // Pares (incendio, área quemada) admisibles: marcador dentro del anillo o a
  // ≤ ATTACH_MARGIN_KM del borde, y área no anterior en >7 días al inicio.
  const links: { fi: number; ci: number; inside: boolean; km: number }[] = [];
  fires.forEach((f, fi) => {
    if (f.perimeter) return; // ya tiene forma propia; no consume un área EFFIS
    const startMs = Date.parse(f.startedAt);
    const [lon, lat] = f.coordinates;
    candidates.forEach((c, ci) => {
      // Cicatriz detectada mucho antes del inicio del incendio → otro fuego.
      if (
        Number.isFinite(c.detectedMs) &&
        Number.isFinite(startMs) &&
        c.detectedMs < startMs - SCAR_MAX_AGE_MS
      ) {
        return;
      }
      if (lon < c.bbox[0] || lon > c.bbox[2] || lat < c.bbox[1] || lat > c.bbox[3]) return;
      const ring = c.p.perimeter!;
      const inside = inRing(lon, lat, ring);
      const km = distanceToRingKm(f.coordinates, ring);
      if (inside || km <= ATTACH_MARGIN_KM) links.push({ fi, ci, inside, km });
    });
  });

  // Emparejamiento codicioso 1:1: los marcadores DENTRO del anillo primero y,
  // dentro de cada grupo, por distancia al borde ascendente.
  links.sort((a, b) => (a.inside === b.inside ? a.km - b.km : a.inside ? -1 : 1));
  const assigned = new Map<number, Fire>(); // fireIndex → área adjudicada
  const usedFires = new Set<number>();
  const usedPerims = new Set<number>();
  for (const { fi, ci } of links) {
    if (usedFires.has(fi) || usedPerims.has(ci)) continue;
    usedFires.add(fi);
    usedPerims.add(ci);
    assigned.set(fi, candidates[ci]!.p);
  }

  return fires.map((f, fi) => {
    const best = assigned.get(fi);
    if (!best?.perimeter) return f;
    // Guarda el slug del área adjuntada para no duplicarla luego como entrada
    // independiente de área quemada (p. ej. en `/p/[provincia]`).
    const out: Fire = { ...f, perimeter: best.perimeter, perimeterSourceSlug: best.slug };
    // Rellena superficie estimada solo si no hay cifra oficial.
    if (!f.hectares && best.hectares > 0) {
      out.hectares = best.hectares;
      out.hectaresApprox = true;
    }
    return out;
  });
}

/** Distancia (km) bajo la cual dos incidentes de FUENTES distintas se tratan como
 * el mismo incendio físico. Caso real detectado: La Mierla/Guadalajara, a ~0,12 km
 * de diferencia entre el parte de INFORCYL (CyL en apoyo mutuo) y el de INFOCA
 * (Andalucía en apoyo mutuo) — el mismo fuego, dos sistemas de emergencia. Margen
 * amplio: en producción, el siguiente par de fuentes distintas más próximo está
 * a >45 km, así que este umbral no roza incidentes realmente independientes. */
const MUTUAL_AID_DUP_KM = 1;

/**
 * Dos CCAA pueden desplegar apoyo mutuo al MISMO incendio y cada una lo reporta
 * en su propio sistema con su propio id (INFORCYL e INFOCA listando ambos «La
 * Mierla»/«Guadalajara»). Sin fusionar, el incidente se cuenta dos veces en los
 * KPI («activos», total) y el mapa lo muestra como un cúmulo de 2 que nunca se
 * separa (dos marcadores a la misma coordenada están siempre a <44 px, a
 * cualquier zoom). Se fusiona en el más informativo (con preferencia por el
 * que ya tiene forma propia — la adjudicación geográfica de `attachPerimeters`
 * es una señal más fuerte que un número de hectáreas mayor en el otro gemelo —
 * y se anotan ambas fuentes.
 */
export function dedupeMutualAidFires(fires: Fire[]): Fire[] {
  const pairs: { i: number; j: number; km: number }[] = [];
  for (let i = 0; i < fires.length; i++) {
    for (let j = i + 1; j < fires.length; j++) {
      const a = fires[i]!;
      const b = fires[j]!;
      if (a.country !== b.country) continue;
      if (a.state === 'extinguido' || b.state === 'extinguido') continue;
      if (a.sources.some((s) => b.sources.includes(s))) continue; // misma fuente: no aplica
      const km = haversineKm(a.coordinates, b.coordinates);
      if (km <= MUTUAL_AID_DUP_KM) pairs.push({ i, j, km });
    }
  }
  if (!pairs.length) return fires;

  // Emparejamiento codicioso 1:1 por distancia ascendente (mismo patrón que
  // attachPerimeters): cada incendio se fusiona como mucho una vez.
  pairs.sort((x, y) => x.km - y.km);
  const used = new Set<number>();
  const absorbedBy = new Map<number, number>(); // índice absorbido → índice superviviente
  for (const { i, j } of pairs) {
    if (used.has(i) || used.has(j)) continue;
    used.add(i);
    used.add(j);
    // Preferimos conservar el gemelo que YA tiene perímetro propio: perderlo
    // solo porque el otro reporta más hectáreas dejaría un incidente con forma
    // real sin ella (y el paso siguiente, `deriveApproxPerimeters`, le
    // dibujaría una extensión aproximada como si nunca hubiera tenido una
    // oficial). Solo si ninguno tiene forma, desempatamos por hectáreas.
    const aHasPerimeter = !!fires[i]!.perimeter;
    const bHasPerimeter = !!fires[j]!.perimeter;
    const survivorIsI =
      aHasPerimeter !== bHasPerimeter ? aHasPerimeter : fires[i]!.hectares >= fires[j]!.hectares;
    const [survivor, absorbed] = survivorIsI ? [i, j] : [j, i];
    absorbedBy.set(absorbed, survivor);
  }
  if (!absorbedBy.size) return fires;

  const extraSources = new Map<number, Fire['sources']>();
  for (const [absorbedIdx, survivorIdx] of absorbedBy) {
    const list = extraSources.get(survivorIdx) ?? [];
    extraSources.set(survivorIdx, [...list, ...fires[absorbedIdx]!.sources]);
  }

  return fires
    .map((f, idx) => {
      const extra = extraSources.get(idx);
      if (!extra) return f;
      return { ...f, sources: Array.from(new Set([...f.sources, ...extra])) };
    })
    .filter((_, idx) => !absorbedBy.has(idx));
}

/** Radio (km) para agrupar focos FIRMS alrededor de un incidente confirmado sin
 * perímetro propio. Menor que el de `confirmWithHotspots` (6 km): aquí no basta
 * con corroborar actividad, hace falta que los focos describan la extensión
 * inmediata del incidente, no todo lo que arde en la comarca. */
const APPROX_PERIMETER_RADIUS_KM = 3;
/** Con <3 focos no hay envolvente fiable (un casco convexo de 1-2 puntos no es
 * una forma): mejor sin dato que una silueta inventada. */
const APPROX_PERIMETER_MIN_HOTSPOTS = 3;
/** Margen (km) sobre el casco convexo: un foco VIIRS marca el CENTRO de un
 * píxel (~375 m), no el borde real del incendio. */
const APPROX_PERIMETER_BUFFER_KM = 0.35;

/**
 * Incidentes CONFIRMADOS por una fuente oficial que siguen activos pero sin
 * ninguna forma propia (ni nativa ni EFFIS adjuntado — EFFIS tarda días en
 * mapear una cicatriz) pueden dibujarse con una EXTENSIÓN aproximada: el casco
 * convexo de los focos FIRMS que caen a su alrededor, con un pequeño margen.
 *
 * Deliberadamente conservador y limitado a un trazo en el mapa:
 * - Exige ≥3 focos cercanos; si no, el incidente queda como hoy (sin forma).
 * - NUNCA toca `hectares`/`hectaresApprox`: es geometría, no una cifra, y no
 *   debe alimentar KPI, ranking, boletín ni push (la lección del incidente de
 *   `deriveSatelliteFires`, revertido en v0.33.0, fue precisamente que un dato
 *   derivado de FIRMS se colaba como si fuera confirmado en todas partes).
 * - Se marca `perimeterApprox: true` para que la UI lo distinga siempre del
 *   perímetro real (estilo propio + aviso de detección satelital).
 *
 * Cota geométrica (por construcción, nunca puede desbocarse): todo foco usado
 * está a ≤`APPROX_PERIMETER_RADIUS_KM` del incidente (un disco es convexo, así
 * que el casco de un subconjunto siempre cae dentro), luego el polígono final
 * queda contenido en un disco de radio `RADIUS_KM + BUFFER_KM` (~3,35 km) →
 * diámetro máximo ~6,7 km. Nunca puede "escaparse" a otro municipio como le
 * pasaba a `deriveSatelliteFires`.
 *
 * Límite conocido (no resuelto, mitigado por el estilo): no exige que los
 * focos formen UN cúmulo contiguo — dos focos de calor genuinamente separados
 * dentro del radio (p. ej. el frente real + una quema agrícola cercana sin
 * relación) se fusionarían en un único casco. El trazo discontinuo + tenue +
 * el aviso de «no es un perímetro oficial» acotan el riesgo de lectura, pero
 * no lo eliminan.
 */
export function deriveApproxPerimeters(fires: Fire[], hotspots: Hotspot[]): Fire[] {
  if (!hotspots.length) return fires;
  return fires.map((f) => {
    if (f.state !== 'activo' || f.perimeter) return f;
    const nearby = hotspots.filter(
      (h) => haversineKm(f.coordinates, h.coordinates) <= APPROX_PERIMETER_RADIUS_KM,
    );
    if (nearby.length < APPROX_PERIMETER_MIN_HOTSPOTS) return f;
    const hull = convex(turfPoints(nearby.map((h) => h.coordinates)));
    if (!hull) return f; // focos colineales o coincidentes: sin envolvente válida
    const padded = buffer(hull, APPROX_PERIMETER_BUFFER_KM, { units: 'kilometers' })?.geometry;
    if (!padded || padded.type !== 'Polygon') return f;
    const ring = padded.coordinates[0] as [number, number][];
    if (ring.length < 4) return f;
    return { ...f, perimeter: ring, perimeterApprox: true };
  });
}

/**
 * Superficie (ha) de un anillo de perímetro [lon,lat] cerrado. Uso EXCLUSIVO
 * de la ficha individual del incendio, para incidentes con `perimeterApprox`
 * y sin cifra oficial: se calcula bajo demanda solo al pintar esa ficha, NUNCA
 * se escribe en `Fire.hectares` ni se agrega a KPI/ranking/boletín — el hull
 * de unos pocos focos térmicos sobrestima el área real (rellena todo lo que
 * queda entre los puntos exteriores) y es una base bastante más floja que la
 * clasificación de imagen de EFFIS, así que no debe mezclarse con esa cifra.
 */
export function estimatePerimeterHectares(ring: [number, number][]): number {
  const m2 = turfArea({ type: 'Polygon', coordinates: [ring] });
  return Math.round((m2 / 10_000) * 10) / 10;
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
