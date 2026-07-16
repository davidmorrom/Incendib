/**
 * Serializa `FireFilters` a/desde una querystring, para que el estado del panel
 * del Informe sea COMPARTIBLE (un enlace reproduce la misma vista) y persista al
 * recargar. Diseño: claves cortas, valores multivalor separados por «|» (ningún
 * nombre de CCAA/provincia/fuente lo contiene), y decodificación TOLERANTE
 * (ignora lo desconocido, acota rangos) para no romper ante enlaces viejos.
 *
 * Módulo PURO: apto para servidor y cliente, y testeable.
 */

import type { FireState, FireType, SeverityLevel, SourceId } from '@/types/fire';
import {
  DEFAULT_FILTERS,
  HA_MAX,
  MEDIA_KEYS,
  type CountryFilter,
  type FireFilters,
  type MediaKey,
  type Period,
  type SatelliteFilter,
} from './filters';

const SEP = '|';

const STATES: FireState[] = ['activo', 'controlado', 'estabilizado', 'extinguido'];
const LEVELS: Exclude<SeverityLevel, null>[] = [0, 1, 2, 3];
const TYPES: FireType[] = ['forestal', 'agricola', 'urbano-forestal'];
const PERIODS: Period[] = ['todos', '24h', '48h', '72h', '7d'];
const COUNTRIES: CountryFilter[] = ['todos', 'es', 'pt'];
const SATS: SatelliteFilter[] = ['todos', 'si', 'no'];
const SOURCE_IDS: SourceId[] = [
  'firms',
  'effis',
  'fogos',
  'icnf',
  'jcyl',
  'catalunya',
  'infoca',
  'infocam',
  'aemet',
  'nacional',
];

function joinList(xs: readonly (string | number)[]): string {
  return xs.map(String).join(SEP);
}

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(SEP).map((s) => s.trim()).filter(Boolean);
}

/** Filtra a los valores del enum permitido conservando el orden canónico. */
function keepEnum<T extends string>(values: string[], allowed: readonly T[]): T[] {
  const set = new Set(values);
  return allowed.filter((a) => set.has(a));
}

function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  if (raw == null) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** `FireFilters` → querystring (sin «?»). Solo escribe lo que difiere del defecto. */
export function filtersToQuery(f: FireFilters): string {
  const p = new URLSearchParams();
  if (f.query.trim()) p.set('q', f.query.trim());
  if (f.states.length) p.set('estado', joinList(f.states));
  if (f.levels.length) p.set('nivel', joinList(f.levels));
  if (f.types.length) p.set('tipo', joinList(f.types));
  if (f.country !== 'todos') p.set('pais', f.country);
  if (f.regions.length) p.set('ccaa', joinList(f.regions));
  if (f.provinces.length) p.set('prov', joinList(f.provinces));
  if (f.period !== 'todos') p.set('periodo', f.period);
  if (f.minHa > 0) p.set('hamin', String(f.minHa));
  if (f.maxHa < HA_MAX) p.set('hamax', String(f.maxHa));
  if (f.medios.length) p.set('medios', joinList(f.medios));
  if (f.minPersonnel > 0) p.set('pers', String(f.minPersonnel));
  if (f.growing) p.set('crece', '1');
  if (f.satellite !== 'todos') p.set('sat', f.satellite);
  if (f.sources.length) p.set('fuente', joinList(f.sources));
  return p.toString();
}

/** querystring / URLSearchParams → `FireFilters` (tolerante; parte del defecto). */
export function queryToFilters(input: string | URLSearchParams): FireFilters {
  const p = typeof input === 'string' ? new URLSearchParams(input) : input;
  const country = p.get('pais');
  const period = p.get('periodo');
  const sat = p.get('sat');
  const minHa = clampInt(p.get('hamin'), 0, HA_MAX, 0);
  const maxHa = clampInt(p.get('hamax'), 0, HA_MAX, HA_MAX);
  return {
    ...DEFAULT_FILTERS,
    query: (p.get('q') ?? '').slice(0, 120),
    states: keepEnum(parseList(p.get('estado')), STATES),
    levels: keepEnum(parseList(p.get('nivel')), LEVELS.map(String)).map(Number) as Exclude<
      SeverityLevel,
      null
    >[],
    types: keepEnum(parseList(p.get('tipo')), TYPES),
    country: (COUNTRIES as string[]).includes(country ?? '') ? (country as CountryFilter) : 'todos',
    regions: parseList(p.get('ccaa')),
    provinces: parseList(p.get('prov')),
    period: (PERIODS as string[]).includes(period ?? '') ? (period as Period) : 'todos',
    minHa,
    maxHa: maxHa >= minHa ? maxHa : HA_MAX,
    medios: keepEnum(parseList(p.get('medios')), MEDIA_KEYS) as MediaKey[],
    minPersonnel: clampInt(p.get('pers'), 0, 100000, 0),
    growing: p.get('crece') === '1',
    satellite: (SATS as string[]).includes(sat ?? '') ? (sat as SatelliteFilter) : 'todos',
    sources: keepEnum(parseList(p.get('fuente')), SOURCE_IDS),
  };
}
