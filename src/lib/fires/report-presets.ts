/**
 * Vistas rápidas del Informe ("presets de fábrica"): cada una es un `FireFilters`
 * completo de un toque, para demostrar la potencia del panel. Puro y sin i18n
 * (las etiquetas viven en `panel.presets`).
 */

import { DEFAULT_FILTERS, type FireFilters } from './filters';
import { filtersToQuery } from './report-url';

export type PresetId = 'activos' | 'graves' | 'grandes' | 'evacuacion' | 'expansion' | 'portugal';

/** Parche de cada preset sobre el defecto. */
export const PRESET_PATCHES: Record<PresetId, Partial<FireFilters>> = {
  activos: { states: ['activo'] },
  graves: { levels: [2, 3] },
  grandes: { minHa: 500 },
  evacuacion: { medios: ['evacuacion'] },
  expansion: { growing: true },
  portugal: { country: 'pt' },
};

export const PRESET_IDS: PresetId[] = ['activos', 'graves', 'grandes', 'evacuacion', 'expansion', 'portugal'];

/** `FireFilters` completo de un preset (defecto + parche). */
export function presetFilters(id: PresetId): FireFilters {
  return { ...DEFAULT_FILTERS, ...PRESET_PATCHES[id] };
}

/** ¿Los filtros actuales coinciden EXACTAMENTE con un preset? (para resaltarlo). */
export function activePreset(filters: FireFilters): PresetId | null {
  const q = filtersToQuery(filters);
  for (const id of PRESET_IDS) {
    if (filtersToQuery(presetFilters(id)) === q) return id;
  }
  return null;
}
