/** Derivaciones de datos para la UI: orden por gravedad y KPIs. */

import type { Fire, FireState } from '@/types/fire';

/** Rango de gravedad para ordenar (menor = más grave / más arriba). */
export const STATE_RANK: Record<FireState, number> = {
  activo: 0,
  controlado: 1,
  estabilizado: 2,
  extinguido: 3,
};

/**
 * Ordena por gravedad: estado (activo primero) → nivel desc → hectáreas desc.
 * No muta la entrada.
 */
export function sortByGravity(fires: Fire[]): Fire[] {
  return [...fires].sort((a, b) => {
    if (STATE_RANK[a.state] !== STATE_RANK[b.state]) {
      return STATE_RANK[a.state] - STATE_RANK[b.state];
    }
    const la = a.level ?? -1;
    const lb = b.level ?? -1;
    if (la !== lb) return lb - la;
    return b.hectares - a.hectares;
  });
}

export interface Kpis {
  activos: number;
  hectares: number;
}

/**
 * KPIs del encabezado: nº de activos y hectáreas totales.
 *
 * La superficie total incluye también las estimaciones: la cifra oficial/EFFIS
 * (`hectares`, ya sea exacta o marcada `hectaresApprox`) cuando existe y, cuando
 * no hay ninguna, la estimación por focos FIRMS (`hotspotHectares`). Así el
 * recuento general no deja fuera incendios activos confirmados que aún no tienen
 * superficie oficial (decisión del propietario). El total es, por tanto, un
 * agregado con parte estimada; la UI comunica cada cifra individual como «~».
 */
export function computeKpis(fires: Fire[]): Kpis {
  return fires.reduce<Kpis>(
    (acc, f) => {
      if (f.state === 'activo') acc.activos += 1;
      acc.hectares += f.hectares || f.hotspotHectares || 0;
      return acc;
    },
    { activos: 0, hectares: 0 },
  );
}

/** Territorios insulares (se muestran en el inset, fuera del encuadre peninsular). */
const ISLAND_REGIONS = ['Canarias', 'Baleares', 'Azores', 'Madeira'];

export function isIslandFire(f: Fire): boolean {
  return ISLAND_REGIONS.some((r) => f.region.includes(r));
}
