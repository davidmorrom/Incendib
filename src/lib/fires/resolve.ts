import { cache } from 'react';
import { getFire } from '@/lib/data';
import { getArchivedFire } from '@/lib/history/store';
import { readArchivedFireGit } from '@/lib/history/archive-git';
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
    // Coordenadas del destacado si la edición las guardó (ediciones nuevas → mapa);
    // si no, centinela [0,0] → la ficha oculta el mapa (hasLocation=false).
    coordinates: h.coordinates ?? [0, 0],
    startedAt: b.periodStart,
    updatedAt: b.periodEnd,
    sources: b.sources,
  };
}

/**
 * Resuelve la ficha de un incendio por slug con permanencia en cascada:
 *   1) en vivo (getFire)                  → estado actual, como hoy
 *   2) archivo Redis (getArchivedFire)    → última foto rica congelada (mapa); ~1 año
 *   3) archivo git (readArchivedFireGit)  → instantánea rica PERMANENTE (destacados)
 *   4) destacado del boletín (findHighlight) → dato slim permanente; recupera enlaces viejos
 *   5) null                               → 404
 * Redis va antes que git porque captura la última foto (más fresca, hasta la
 * extinción); git es el suelo permanente cuando Redis ya caducó. Envuelta en
 * cache() para deduplicar dentro de una misma request. Nunca lanza.
 */
export const resolveFire = cache(async (slug: string): Promise<ResolvedFire | null> => {
  const live = await getFire(slug);
  if (live) return { fire: live, origin: 'live', hasLocation: hasRealLocation(live) };

  const archived = await getArchivedFire(slug);
  if (archived) {
    return { fire: archived, origin: 'archive', asOf: archived.updatedAt, hasLocation: hasRealLocation(archived) };
  }

  const git = readArchivedFireGit(slug);
  if (git) {
    return { fire: git, origin: 'archive', asOf: git.updatedAt, hasLocation: hasRealLocation(git) };
  }

  const found = findHighlight(slug);
  if (found) {
    const fire = fireFromHighlight(found.highlight, found.boletin);
    return {
      fire,
      origin: 'boletin',
      asOf: found.boletin.periodEnd,
      boletinId: found.boletin.id,
      // Mapa solo si el destacado guardó coordenadas reales (ediciones nuevas).
      hasLocation: hasRealLocation(fire),
    };
  }
  return null;
});
