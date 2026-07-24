import type { Fire } from '@/types/fire';
import { formatNumber } from '@/lib/utils/format';

/**
 * Superficie a mostrar de un incendio, en un único sitio.
 *
 * Dos cifras posibles conviven:
 *   · oficial/EFFIS  → `fire.hectares` (con `hectaresApprox` si es estimación EFFIS)
 *   · por focos      → `fire.hotspotHectares`, envolvente del cúmulo de focos FIRMS
 *
 * Decisión del propietario: cuando la estimación por focos IGUALA o SUPERA a la
 * oficial (caso típico de un activo en expansión, p. ej. Burgohondo: 5 074 oficial
 * vs ~12 700 por focos), la de FOCOS es la cifra PRINCIPAL —siempre marcada «~»
 * como estimación (sobrestima: casco convexo con huecos sin quemar)— y la oficial
 * se conserva como cifra SECUNDARIA. Si la oficial es mayor (o no hay focos), manda
 * la oficial. Si no hay ninguna, «sin dato».
 *
 * Esto es SOLO presentación: `hotspotHectares` sigue sin entrar en KPI/ranking/
 * boletín (ver `types/fire.ts`). `label` es la cadena principal lista para estampar
 * (server, sin i18n); los componentes con marcado propio consumen los campos.
 */
export interface FireSurface {
  /** Hectáreas de la cifra PRINCIPAL (0 si no hay dato). */
  ha: number;
  /** La principal es una estimación → mostrarla con «~». */
  approx: boolean;
  /** La principal procede de los focos FIRMS (nota «estimación por focos»). */
  fromHotspots: boolean;
  /** Hay alguna cifra que mostrar. */
  hasData: boolean;
  /** Cadena principal: «~12 700 ha», «5 074 ha» o «sin dato». */
  label: string;
  /** Cifra oficial mostrada como SECUNDARIA (solo cuando la principal son los focos). */
  officialHa?: number;
  /** Cadena de la secundaria: «5 074 ha». */
  officialLabel?: string;
}

export function fireSurface(
  fire: Pick<Fire, 'hectares' | 'hectaresApprox' | 'hotspotHectares'>,
): FireSurface {
  const official = fire.hectares > 0 ? fire.hectares : 0;
  const focos = fire.hotspotHectares ?? 0;

  // Focos como principal cuando igualan/superan a la oficial (o no hay oficial).
  if (focos > 0 && focos >= official) {
    return {
      ha: focos,
      approx: true,
      fromHotspots: true,
      hasData: true,
      label: `~${formatNumber(focos)} ha`,
      ...(official > 0
        ? { officialHa: official, officialLabel: `${formatNumber(official)} ha` }
        : {}),
    };
  }

  if (official > 0) {
    const approx = Boolean(fire.hectaresApprox);
    return {
      ha: official,
      approx,
      fromHotspots: false,
      hasData: true,
      label: `${approx ? '~' : ''}${formatNumber(official)} ha`,
    };
  }

  return { ha: 0, approx: false, fromHotspots: false, hasData: false, label: 'sin dato' };
}
