/**
 * Modelo de filtros unificado (móvil rápido + panel desktop). Vacío = sin
 * filtrar. Lo comparten los chips del sheet móvil y la barra lateral desktop.
 */

import type { Fire, FireState, SeverityLevel } from '@/types/fire';

export type Period = 'todos' | '24h' | '48h' | '72h' | '7d';
export type CountryFilter = 'todos' | 'es' | 'pt';

const PERIOD_MS: Record<Exclude<Period, 'todos'>, number> = {
  '24h': 24 * 3600e3,
  '48h': 48 * 3600e3,
  '72h': 72 * 3600e3,
  '7d': 7 * 24 * 3600e3,
};

/** Tope superior del rango de superficie (∞ efectivo). */
export const HA_MAX = 100000;

export interface FireFilters {
  states: FireState[];
  levels: Exclude<SeverityLevel, null>[];
  country: CountryFilter;
  period: Period;
  minHa: number;
  maxHa: number;
}

export const DEFAULT_FILTERS: FireFilters = {
  states: [],
  levels: [],
  country: 'todos',
  period: 'todos',
  minHa: 0,
  maxHa: HA_MAX,
};

export function applyFilters(fires: Fire[], f: FireFilters, now: number): Fire[] {
  return fires.filter((x) => {
    if (f.states.length && !f.states.includes(x.state)) return false;
    if (f.levels.length && !(x.level != null && f.levels.includes(x.level))) return false;
    if (f.country === 'es' && x.country !== 'ES') return false;
    if (f.country === 'pt' && x.country !== 'PT') return false;
    if (f.period !== 'todos' && now - Date.parse(x.updatedAt) > PERIOD_MS[f.period]) return false;
    if (x.hectares < f.minHa) return false;
    if (f.maxHa < HA_MAX && x.hectares > f.maxHa) return false;
    return true;
  });
}

/** Nº de grupos de filtro activos (para "N filtros activos"). */
export function activeFilterCount(f: FireFilters): number {
  let n = 0;
  if (f.states.length) n++;
  if (f.levels.length) n++;
  if (f.country !== 'todos') n++;
  if (f.period !== 'todos') n++;
  if (f.minHa > 0 || f.maxHa < HA_MAX) n++;
  return n;
}

/** Recuento de incendios por estado (para las etiquetas de los filtros). */
export function countByState(fires: Fire[]): Record<FireState, number> {
  const c: Record<FireState, number> = { activo: 0, controlado: 0, estabilizado: 0, extinguido: 0 };
  for (const f of fires) c[f.state]++;
  return c;
}
