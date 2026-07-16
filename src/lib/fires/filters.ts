/**
 * Modelo de filtros unificado (móvil rápido + panel desktop + panel avanzado del
 * Informe). Vacío = sin filtrar. Lo comparten los chips del sheet móvil, la
 * barra lateral del mapa y el panel avanzado del Informe.
 *
 * Cada campo es un grupo de filtro independiente; se combinan con AND. Dentro de
 * un grupo multivalor (estados, niveles, CCAA, provincias, tipos, medios,
 * fuentes) el criterio es OR (basta con que el incendio cumpla uno). Extender
 * este modelo NO rompe a quien use `DEFAULT_FILTERS` + `applyFilters`: los
 * campos nuevos por defecto no filtran.
 */

import type { Fire, FireState, FireType, SeverityLevel, SourceId } from '@/types/fire';

export type Period = 'todos' | '24h' | '48h' | '72h' | '7d';
export type CountryFilter = 'todos' | 'es' | 'pt';
/** Confirmación por foco satelital FIRMS cercano. */
export type SatelliteFilter = 'todos' | 'si' | 'no';
/**
 * Filtros de medios/afección. Un incendio los cumple si:
 *  · aereos → tiene medios aéreos desplegados
 *  · terrestres → tiene medios terrestres desplegados
 *  · internacional → recibe ayuda internacional (rescEU / MPCU)
 *  · evacuacion → hay aviso de evacuación o corte
 */
export type MediaKey = 'aereos' | 'terrestres' | 'internacional' | 'evacuacion';

export const MEDIA_KEYS: MediaKey[] = ['aereos', 'terrestres', 'internacional', 'evacuacion'];

const PERIOD_MS: Record<Exclude<Period, 'todos'>, number> = {
  '24h': 24 * 3600e3,
  '48h': 48 * 3600e3,
  '72h': 72 * 3600e3,
  '7d': 7 * 24 * 3600e3,
};

/** Tope superior del rango de superficie (∞ efectivo). */
export const HA_MAX = 100000;

export interface FireFilters {
  /** Búsqueda libre por nombre, municipio, provincia o CCAA (sin acentos). */
  query: string;
  states: FireState[];
  levels: Exclude<SeverityLevel, null>[];
  types: FireType[];
  country: CountryFilter;
  /** Comunidades autónomas (ES) o regiones (PT), por grafía de la fuente. */
  regions: string[];
  /** Provincias (ES) o distritos (PT), por grafía de la fuente. */
  provinces: string[];
  period: Period;
  minHa: number;
  maxHa: number;
  /** Medios/afección exigidos (AND entre ellos). */
  medios: MediaKey[];
  /** Umbral mínimo de efectivos (personal). 0 = sin filtro. */
  minPersonnel: number;
  /** Solo incendios en expansión (crecimiento de superficie en 24 h > 0). */
  growing: boolean;
  /** Confirmación satelital. */
  satellite: SatelliteFilter;
  /** Fuentes de datos (OR). */
  sources: SourceId[];
}

export const DEFAULT_FILTERS: FireFilters = {
  query: '',
  states: [],
  levels: [],
  types: [],
  country: 'todos',
  regions: [],
  provinces: [],
  period: 'todos',
  minHa: 0,
  maxHa: HA_MAX,
  medios: [],
  minPersonnel: 0,
  growing: false,
  satellite: 'todos',
  sources: [],
};

/** Normaliza texto para búsqueda insensible a acentos y mayúsculas. */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** ¿El incendio tiene medios aéreos desplegados? */
export function hasAerial(f: Fire): boolean {
  const r = f.resources;
  return !!r && ((r.aerial ?? 0) > 0 || !!r.aerialUnits?.length);
}

/** ¿El incendio tiene medios terrestres desplegados? */
export function hasGround(f: Fire): boolean {
  const r = f.resources;
  return !!r && ((r.ground ?? 0) > 0 || !!r.groundUnits?.length);
}

/** ¿El incendio recibe ayuda internacional (medios extranjeros)? */
export function hasForeignAid(f: Fire): boolean {
  return !!f.resources?.foreign?.length;
}

/** ¿Hay aviso de evacuación / corte? */
export function hasEvacuation(f: Fire): boolean {
  return !!f.evacuation && f.evacuation.trim() !== '';
}

/** Efectivos (personal) desplegados; 0 si la fuente no lo publica. */
export function personnelOf(f: Fire): number {
  return f.resources?.personnel ?? 0;
}

function matchesMedia(f: Fire, key: MediaKey): boolean {
  switch (key) {
    case 'aereos':
      return hasAerial(f);
    case 'terrestres':
      return hasGround(f);
    case 'internacional':
      return hasForeignAid(f);
    case 'evacuacion':
      return hasEvacuation(f);
  }
}

export function applyFilters(fires: Fire[], f: FireFilters, now: number): Fire[] {
  const q = normalizeText(f.query);
  return fires.filter((x) => {
    if (f.states.length && !f.states.includes(x.state)) return false;
    if (f.levels.length && !(x.level != null && f.levels.includes(x.level))) return false;
    if (f.types.length && !(x.type != null && f.types.includes(x.type))) return false;
    if (f.country === 'es' && x.country !== 'ES') return false;
    if (f.country === 'pt' && x.country !== 'PT') return false;
    if (f.regions.length && !f.regions.includes(x.region)) return false;
    if (f.provinces.length && !f.provinces.includes(x.province)) return false;
    if (f.period !== 'todos' && now - Date.parse(x.updatedAt) > PERIOD_MS[f.period]) return false;
    if (x.hectares < f.minHa) return false;
    if (f.maxHa < HA_MAX && x.hectares > f.maxHa) return false;
    if (f.medios.length && !f.medios.every((m) => matchesMedia(x, m))) return false;
    if (f.minPersonnel > 0 && personnelOf(x) < f.minPersonnel) return false;
    if (f.growing && !(x.delta24h != null && x.delta24h > 0)) return false;
    if (f.satellite === 'si' && !x.satelliteConfirmed) return false;
    if (f.satellite === 'no' && x.satelliteConfirmed) return false;
    if (f.sources.length && !x.sources.some((s) => f.sources.includes(s))) return false;
    if (q) {
      const hay = normalizeText(`${x.name} ${x.municipality} ${x.province} ${x.region}`);
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** Nº de grupos de filtro activos (para "N filtros activos"). */
export function activeFilterCount(f: FireFilters): number {
  let n = 0;
  if (f.query.trim()) n++;
  if (f.states.length) n++;
  if (f.levels.length) n++;
  if (f.types.length) n++;
  if (f.country !== 'todos') n++;
  if (f.regions.length) n++;
  if (f.provinces.length) n++;
  if (f.period !== 'todos') n++;
  if (f.minHa > 0 || f.maxHa < HA_MAX) n++;
  if (f.medios.length) n++;
  if (f.minPersonnel > 0) n++;
  if (f.growing) n++;
  if (f.satellite !== 'todos') n++;
  if (f.sources.length) n++;
  return n;
}

/** ¿Hay algún filtro activo? (para mostrar «Limpiar»). */
export function hasActiveFilters(f: FireFilters): boolean {
  return activeFilterCount(f) > 0;
}

/** Recuento de incendios por estado (para las etiquetas de los filtros). */
export function countByState(fires: Fire[]): Record<FireState, number> {
  const c: Record<FireState, number> = { activo: 0, controlado: 0, estabilizado: 0, extinguido: 0 };
  for (const f of fires) c[f.state]++;
  return c;
}
