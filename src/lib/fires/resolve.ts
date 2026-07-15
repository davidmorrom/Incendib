import { cache } from 'react';
import { getFire } from '@/lib/data';
import { getArchivedFire } from '@/lib/history/store';
import { findHighlight } from '@/lib/boletin/store';
import type { Fire } from '@/types/fire';
import type { Boletin, BoletinHighlight } from '@/types/boletin';

export type FireOrigin = 'live' | 'archive' | 'boletin';

export interface ResolvedFire {
  fire: Fire;
  /** De dónde sale el dato: en vivo, archivo Redis o destacado del boletín. */
  origin: FireOrigin;
  /** Fecha del último dato conocido (histórico); ausente si en vivo. */
  asOf?: string;
  /** Edición del boletín de la que procede (solo origin='boletin'). */
  boletinId?: string;
  /** Hay coordenadas reales (para decidir si se dibuja el mapa). */
  hasLocation: boolean;
}

/** Coordenadas reales, no el centinela [0,0] del dato reconstruido del boletín. */
function hasRealLocation(fire: Fire): boolean {
  const [lon, lat] = fire.coordinates;
  return !(lon === 0 && lat === 0);
}

/**
 * Reconstruye un Fire mínimo desde un destacado del boletín (dato slim: sin
 * coordenadas reales, sin timeline, sin meteo). `startedAt`/`updatedAt` se fijan
 * al periodo de la edición. `coordinates` es un centinela [0,0] (el tipo lo exige)
 * → la ficha oculta el mapa vía hasLocation=false. Exportada para tests.
 */
export function fireFromHighlight(h: BoletinHighlight, b: Boletin): Fire {
  return {
    slug: h.slug,
    name: h.name,
    municipality: '—',
    province: '—',
    region: h.region,
    country: h.country,
    state: h.state,
    level: h.level,
    hectares: h.hectares,
    coordinates: [0, 0],
    startedAt: b.periodStart,
    updatedAt: b.periodEnd,
    sources: b.sources,
  };
}

/**
 * Resuelve la ficha de un incendio por slug con permanencia en cascada:
 *   1) en vivo (getFire)              → estado actual, como hoy
 *   2) archivo Redis (getArchivedFire)→ última foto rica congelada (mapa incluido)
 *   3) destacado del boletín (git)    → dato slim permanente; recupera enlaces viejos
 *   4) null                           → 404
 * Envuelta en cache() para deduplicar dentro de una misma request (page +
 * generateMetadata comparten el resultado). Nunca lanza (cada capa es null-safe).
 */
export const resolveFire = cache(async (slug: string): Promise<ResolvedFire | null> => {
  const live = await getFire(slug);
  if (live) return { fire: live, origin: 'live', hasLocation: hasRealLocation(live) };

  const archived = await getArchivedFire(slug);
  if (archived) {
    return { fire: archived, origin: 'archive', asOf: archived.updatedAt, hasLocation: hasRealLocation(archived) };
  }

  const found = findHighlight(slug);
  if (found) {
    return {
      fire: fireFromHighlight(found.highlight, found.boletin),
      origin: 'boletin',
      asOf: found.boletin.periodEnd,
      boletinId: found.boletin.id,
      hasLocation: false,
    };
  }
  return null;
});
