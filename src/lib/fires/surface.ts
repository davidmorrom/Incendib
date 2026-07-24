import type { Fire } from '@/types/fire';
import { formatNumber } from '@/lib/utils/format';

/**
 * Escalera de superficie de un incendio, en un único sitio.
 *
 * Misma preferencia que la ficha, la imagen OG y la metadata del enlace: cifra
 * oficial/EFFIS si la hay (`hectares`); si no, la estimación por focos FIRMS
 * (`hotspotHectares`), marcada «~»; si tampoco hay ninguna, «sin dato». Evita
 * el «0 ha» que salía al estampar `hectares` a secas (v0.45.1) y que esta regla
 * se copie en cada nuevo consumidor.
 *
 * `label` es la cadena lista para estampar (server, sin i18n). Los componentes
 * de UI que necesitan su propio marcado consumen `{ ha, approx, hasData }`.
 */
export interface FireSurface {
  /** Hectáreas a mostrar (0 si no hay dato). */
  ha: number;
  /** La cifra es una estimación (EFFIS o focos): mostrarla con «~». */
  approx: boolean;
  /** Hay alguna cifra que mostrar. */
  hasData: boolean;
  /** Cadena lista: «~12 600 ha», «3 241 ha» o «sin dato». */
  label: string;
}

export function fireSurface(
  fire: Pick<Fire, 'hectares' | 'hectaresApprox' | 'hotspotHectares'>,
): FireSurface {
  const ha = fire.hectares > 0 ? fire.hectares : (fire.hotspotHectares ?? 0);
  const approx = Boolean(fire.hectaresApprox || (fire.hectares === 0 && fire.hotspotHectares));
  const hasData = ha > 0;
  const label = hasData ? `${approx ? '~' : ''}${formatNumber(ha)} ha` : 'sin dato';
  return { ha, approx, hasData, label };
}
