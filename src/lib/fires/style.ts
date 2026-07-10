/** Mapas estado → clase Tailwind. El color codifica el dato (WCAG + daltonismo,
 * siempre acompañado de forma en los marcadores). */

import type { FireState } from '@/types/fire';

export type GlyphState = FireState | 'foco';

/** Color de texto legible del estado (para cifras/etiquetas de estado). */
export const STATE_TEXT_CLASS: Record<FireState, string> = {
  activo: 'text-state-activo-text',
  controlado: 'text-state-controlado-text',
  estabilizado: 'text-state-estabilizado-text',
  extinguido: 'text-state-extinguido-text',
};

/** Color base saturado del estado (para el glifo, vía currentColor). */
export const STATE_BASE_CLASS: Record<GlyphState, string> = {
  activo: 'text-state-activo',
  controlado: 'text-state-controlado',
  estabilizado: 'text-state-estabilizado',
  extinguido: 'text-state-extinguido',
  foco: 'text-state-foco',
};

/** Clave i18n de la etiqueta de estado. */
export const STATE_LABEL_KEY: Record<GlyphState, keyof import('@/lib/i18n').Dictionary['states']> = {
  activo: 'activo',
  controlado: 'controlado',
  estabilizado: 'estabilizado',
  extinguido: 'extinguido',
  foco: 'focoSatelital',
};
