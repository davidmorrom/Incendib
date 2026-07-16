/**
 * Facetas y estadísticas agregadas del Informe.
 *
 * `computeFacets` calcula las OPCIONES disponibles de cada filtro con su
 * recuento (a partir del dataset completo): qué CCAA/provincias/tipos/fuentes
 * existen y cuántos incendios hay en cada uno. Alimenta el panel de filtros
 * (mostrar solo lo que existe, con contador). Es honesto: no ofrece territorios
 * sin datos.
 *
 * `computeStats` calcula AGREGADOS de la selección visible (tras filtrar) para
 * los KPIs y los gráficos sobrios: distribución por estado / CCAA / nivel,
 * medios totales, superficie y variación 24 h.
 *
 * Módulo PURO (sin red/disco): apto para servidor y cliente, y testeable.
 */

import type {
  Country,
  Fire,
  FireState,
  FireType,
  SeverityLevel,
  SourceId,
} from '@/types/fire';
import {
  hasAerial,
  hasEvacuation,
  hasForeignAid,
  hasGround,
  personnelOf,
  type MediaKey,
} from './filters';

export interface FacetCount<T> {
  value: T;
  count: number;
}

export interface ProvinceFacet {
  value: string;
  region: string;
  country: Country;
  count: number;
  activos: number;
}

export interface RegionFacet {
  value: string;
  country: Country;
  count: number;
  activos: number;
  /** Provincias/distritos de esta región presentes en los datos. */
  provinces: ProvinceFacet[];
}

export interface Facets {
  /** CCAA (ES) / regiones (PT) con sus provincias anidadas. */
  regions: RegionFacet[];
  /** Provincias/distritos en plano (ordenadas por actividad). */
  provinces: ProvinceFacet[];
  types: FacetCount<FireType>[];
  sources: FacetCount<SourceId>[];
  levels: FacetCount<Exclude<SeverityLevel, null>>[];
  states: FacetCount<FireState>[];
  medios: FacetCount<MediaKey>[];
  satellite: { si: number; no: number };
  /** ¿Hay incendios en cada país? (para mostrar/ocultar el filtro de país). */
  countries: { es: number; pt: number };
}

const STATE_ORDER: FireState[] = ['activo', 'controlado', 'estabilizado', 'extinguido'];
const LEVEL_ORDER: Exclude<SeverityLevel, null>[] = [0, 1, 2, 3];
const MEDIA_ORDER: MediaKey[] = ['aereos', 'terrestres', 'internacional', 'evacuacion'];

function bump<T>(map: Map<T, number>, key: T, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

/**
 * Calcula las facetas del dataset: opciones de cada filtro con recuento.
 * Ordena territorios por actividad (activos, luego total, luego alfabético).
 */
export function computeFacets(fires: Fire[]): Facets {
  const provMap = new Map<string, ProvinceFacet>();
  const regionMeta = new Map<string, { country: Country; count: number; activos: number }>();
  const types = new Map<FireType, number>();
  const sources = new Map<SourceId, number>();
  const levels = new Map<Exclude<SeverityLevel, null>, number>();
  const states = new Map<FireState, number>();
  const medios = new Map<MediaKey, number>();
  let satSi = 0;
  let esCount = 0;
  let ptCount = 0;

  for (const f of fires) {
    const active = f.state === 'activo';
    if (f.country === 'ES') esCount++;
    else ptCount++;

    // Provincia (clave país|región|provincia para no fusionar homónimas)
    const provKey = `${f.country}|${f.region}|${f.province}`;
    let pf = provMap.get(provKey);
    if (!pf) {
      pf = { value: f.province, region: f.region, country: f.country, count: 0, activos: 0 };
      provMap.set(provKey, pf);
    }
    pf.count++;
    if (active) pf.activos++;

    // Región
    const rKey = `${f.country}|${f.region}`;
    let rm = regionMeta.get(rKey);
    if (!rm) {
      rm = { country: f.country, count: 0, activos: 0 };
      regionMeta.set(rKey, rm);
    }
    rm.count++;
    if (active) rm.activos++;

    if (f.type) bump(types, f.type);
    for (const s of f.sources) bump(sources, s);
    if (f.level != null) bump(levels, f.level);
    bump(states, f.state);
    if (hasAerial(f)) bump(medios, 'aereos');
    if (hasGround(f)) bump(medios, 'terrestres');
    if (hasForeignAid(f)) bump(medios, 'internacional');
    if (hasEvacuation(f)) bump(medios, 'evacuacion');
    if (f.satelliteConfirmed) satSi++;
  }

  const provinces = [...provMap.values()].sort(byActivity);

  // Agrupa provincias bajo su región.
  const regions: RegionFacet[] = [...regionMeta.entries()].map(([key, rm]) => {
    const region = key.slice(key.indexOf('|') + 1);
    return {
      value: region,
      country: rm.country,
      count: rm.count,
      activos: rm.activos,
      provinces: provinces.filter((p) => p.region === region && p.country === rm.country),
    };
  });
  regions.sort(byActivity);

  return {
    regions,
    provinces,
    types: orderedCounts(types, undefined),
    sources: orderedCounts(sources, undefined),
    levels: orderedCounts(levels, LEVEL_ORDER),
    states: orderedCounts(states, STATE_ORDER),
    medios: orderedCounts(medios, MEDIA_ORDER),
    satellite: { si: satSi, no: fires.length - satSi },
    countries: { es: esCount, pt: ptCount },
  };
}

function byActivity(a: { activos: number; count: number; value: string }, b: { activos: number; count: number; value: string }) {
  return b.activos - a.activos || b.count - a.count || a.value.localeCompare(b.value, 'es');
}

/** Convierte el mapa de recuentos en lista ordenada (por orden fijo si se da, si no por recuento desc). */
function orderedCounts<T>(map: Map<T, number>, order?: T[]): FacetCount<T>[] {
  if (order) {
    return order.filter((v) => map.has(v)).map((v) => ({ value: v, count: map.get(v)! }));
  }
  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

// ── Estadísticas agregadas (de la selección visible) ─────────────────────────

export interface DistributionRow {
  key: string;
  count: number;
  activos: number;
  hectares: number;
  /** Alguna superficie sumada es estimación satélite (marcar «~»). */
  approx: boolean;
}

export interface StateRow {
  state: FireState;
  count: number;
  hectares: number;
}

export interface MediaTotals {
  aerial: number;
  ground: number;
  personnel: number;
  conAereos: number;
  conTerrestres: number;
  internacional: number;
}

export interface ReportStats {
  total: number;
  activos: number;
  hectares: number;
  /** Alguna superficie contribuyente es estimación satélite. */
  hectaresApprox: boolean;
  superficieMedia: number;
  superficieMax: number;
  /** Crecimiento agregado en 24 h (suma de delta24h positivos). */
  crecimiento24h: number;
  conEvacuacion: number;
  confirmadosSatelite: number;
  byState: StateRow[];
  /** Nivel de gravedad (ES). `sinNivel` = PT + ES sin nivel publicado. */
  byLevel: FacetCount<Exclude<SeverityLevel, null>>[];
  sinNivel: number;
  /** Distribución por CCAA/región (ordenada por superficie). */
  byRegion: DistributionRow[];
  medios: MediaTotals;
}

/** Agrega estadísticas de la selección visible para KPIs y gráficos. */
export function computeStats(fires: Fire[]): ReportStats {
  const stateAgg = new Map<FireState, StateRow>();
  const regionAgg = new Map<string, DistributionRow>();
  const levels = new Map<Exclude<SeverityLevel, null>, number>();

  let hectares = 0;
  let hectaresApprox = false;
  let activos = 0;
  let superficieMax = 0;
  let crecimiento24h = 0;
  let conEvacuacion = 0;
  let confirmadosSatelite = 0;
  let sinNivel = 0;
  const medios: MediaTotals = {
    aerial: 0,
    ground: 0,
    personnel: 0,
    conAereos: 0,
    conTerrestres: 0,
    internacional: 0,
  };

  for (const f of fires) {
    const ha = Number.isFinite(f.hectares) ? f.hectares : 0;
    hectares += ha;
    if (ha > superficieMax) superficieMax = ha;
    if (ha > 0 && f.hectaresApprox) hectaresApprox = true;
    if (f.state === 'activo') activos++;
    if (typeof f.delta24h === 'number' && f.delta24h > 0) crecimiento24h += f.delta24h;
    if (hasEvacuation(f)) conEvacuacion++;
    if (f.satelliteConfirmed) confirmadosSatelite++;
    if (f.level != null) bump(levels, f.level);
    else sinNivel++;

    // Medios
    const aerial = f.resources?.aerial ?? 0;
    const ground = f.resources?.ground ?? 0;
    medios.aerial += aerial;
    medios.ground += ground;
    medios.personnel += personnelOf(f);
    if (hasAerial(f)) medios.conAereos++;
    if (hasGround(f)) medios.conTerrestres++;
    if (hasForeignAid(f)) medios.internacional++;

    // Por estado
    let sr = stateAgg.get(f.state);
    if (!sr) {
      sr = { state: f.state, count: 0, hectares: 0 };
      stateAgg.set(f.state, sr);
    }
    sr.count++;
    sr.hectares += ha;

    // Por región
    let rr = regionAgg.get(f.region);
    if (!rr) {
      rr = { key: f.region, count: 0, activos: 0, hectares: 0, approx: false };
      regionAgg.set(f.region, rr);
    }
    rr.count++;
    if (f.state === 'activo') rr.activos++;
    rr.hectares += ha;
    if (ha > 0 && f.hectaresApprox) rr.approx = true;
  }

  const byState = STATE_ORDER.filter((s) => stateAgg.has(s)).map((s) => stateAgg.get(s)!);
  const byLevel = LEVEL_ORDER.filter((l) => levels.has(l)).map((l) => ({ value: l, count: levels.get(l)! }));
  const byRegion = [...regionAgg.values()].sort(
    (a, b) => b.hectares - a.hectares || b.activos - a.activos || b.count - a.count,
  );

  const total = fires.length;
  return {
    total,
    activos,
    hectares,
    hectaresApprox,
    superficieMedia: total ? hectares / total : 0,
    superficieMax,
    crecimiento24h,
    conEvacuacion,
    confirmadosSatelite,
    byState,
    byLevel,
    sinNivel,
    byRegion,
    medios,
  };
}
