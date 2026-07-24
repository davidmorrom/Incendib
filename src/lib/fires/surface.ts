import type { Fire } from '@/types/fire';
import { formatNumber } from '@/lib/utils/format';

/**
 * Superficie a mostrar de un incendio, en un único sitio.
 *
 * Preferencia única en toda la app: cifra oficial/EFFIS si la hay (`hectares`,
 * con `hectaresApprox` si es estimación EFFIS) — SIEMPRE manda, aunque la
 * estimación por focos apunte a más (el casco convexo del cúmulo de focos
 * FIRMS sobrestima: incluye huecos sin quemar). Si no hay oficial, cae a la
 * estimación por focos (`hotspotHectares`), marcada «~». Si no hay ninguna,
 * «sin dato».
 *
 * Esto es SOLO presentación: `hotspotHectares` sigue sin entrar en KPI/ranking/
 * boletín (ver `types/fire.ts`). `label` es la cadena lista para estampar
 * (server, sin i18n); los componentes con marcado propio consumen los campos.
 */
export interface FireSurface {
  /** Hectáreas a mostrar (0 si no hay dato). */
  ha: number;
  /** La cifra es una estimación (EFFIS o focos) → mostrarla con «~». */
  approx: boolean;
  /** La cifra procede de los focos FIRMS a falta de oficial (nota «estimación por focos»). */
  fromHotspots: boolean;
  /** Hay alguna cifra que mostrar. */
  hasData: boolean;
  /** Cadena lista: «~12 600 ha», «3 241 ha» o «sin dato». */
  label: string;
}

export function fireSurface(
  fire: Pick<Fire, 'hectares' | 'hectaresApprox' | 'hotspotHectares'>,
): FireSurface {
  const hasOfficial = fire.hectares > 0;
  const fromHotspots = !hasOfficial && Boolean(fire.hotspotHectares);
  const ha = hasOfficial ? fire.hectares : (fire.hotspotHectares ?? 0);
  const approx = fromHotspots || Boolean(fire.hectaresApprox);
  const hasData = ha > 0;
  const label = hasData ? `${approx ? '~' : ''}${formatNumber(ha)} ha` : 'sin dato';
  return { ha, approx, fromHotspots, hasData, label };
}
