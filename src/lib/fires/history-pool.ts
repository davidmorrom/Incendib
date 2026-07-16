/**
 * «Pool» de incendios presentes y pasados, enumerable de forma determinista:
 *   · en vivo            (getFires)                       → estado actual
 *   · áreas quemadas     (getBurnedAreas, EFFIS)          → incendios recientes por satélite
 *   · archivo git        (destacados de boletín)          → fichas permanentes
 *   · índices Redis      (por provincia / por paraje)     → archivo de ~1 año (best-effort)
 *
 * Se usa para el listado de `/p/[provincia]` y para descubrir reactivaciones
 * (episodios del mismo paraje). Deduplica por slug con prioridad
 * vivo > archivo. Nunca lanza: si una capa falla, se omite.
 */

import type { Fire } from '@/types/fire';
import { getFires, getBurnedAreas } from '@/lib/data';
import { listArchivedGitSlugs, readArchivedFireGit } from '@/lib/history/archive-git';
import { getProvinceArchivedFires, getPlaceEpisodes } from '@/lib/history/store';
import { placeKey, provinceSlug } from '@/lib/fires/place';
import type { PooledFire } from '@/lib/fires/reactivation';
import type { FireOrigin } from '@/lib/fires/resolve';

const ORIGIN_RANK: Record<FireOrigin, number> = { live: 0, archive: 1, boletin: 2 };

/** Dedup por slug quedándose con la mejor procedencia (vivo antes que archivo). */
function dedupe(items: PooledFire[]): PooledFire[] {
  const best = new Map<string, PooledFire>();
  for (const it of items) {
    const prev = best.get(it.fire.slug);
    if (!prev || ORIGIN_RANK[it.origin] < ORIGIN_RANK[prev.origin]) best.set(it.fire.slug, it);
  }
  return [...best.values()];
}

/** Fichas archivadas en git (destacados de boletín), como `Fire[]`. */
function gitArchiveFires(): Fire[] {
  return listArchivedGitSlugs()
    .map((s) => readArchivedFireGit(s))
    .filter((f): f is Fire => f !== null);
}

async function safeFires(): Promise<Fire[]> {
  try {
    return await getFires();
  } catch {
    return [];
  }
}

async function safeBurned(): Promise<Fire[]> {
  try {
    return await getBurnedAreas();
  } catch {
    return [];
  }
}

/**
 * Episodios (presentes y pasados) de una provincia, para el listado `/p/[slug]`.
 */
export async function getProvincePool(pslug: string): Promise<PooledFire[]> {
  if (!pslug) return [];
  const [live, burned, archived] = await Promise.all([
    safeFires(),
    safeBurned(),
    getProvinceArchivedFires(pslug),
  ]);
  const git = gitArchiveFires();
  const inProv = (f: Fire) => provinceSlug(f.province) === pslug;
  const pooled: PooledFire[] = [
    ...live.filter(inProv).map((fire) => ({ fire, origin: 'live' as const })),
    ...archived.filter(inProv).map((fire) => ({ fire, origin: 'archive' as const, asOf: fire.updatedAt })),
    ...git.filter(inProv).map((fire) => ({ fire, origin: 'archive' as const, asOf: fire.updatedAt })),
    ...burned.filter(inProv).map((fire) => ({ fire, origin: 'archive' as const, asOf: fire.updatedAt })),
  ];
  return dedupe(pooled);
}

/**
 * Episodios del mismo paraje que `target` (para enlazar reactivaciones). Incluye
 * el propio objetivo si está en alguna capa; el consumidor lo excluye por slug.
 */
export async function getPlacePool(target: Fire): Promise<PooledFire[]> {
  const key = placeKey(target);
  if (!key) return [];
  const [live, episodes] = await Promise.all([safeFires(), getPlaceEpisodes(key)]);
  const git = gitArchiveFires();
  const pooled: PooledFire[] = [
    ...live.map((fire) => ({ fire, origin: 'live' as const })),
    ...episodes.map((fire) => ({ fire, origin: 'archive' as const, asOf: fire.updatedAt })),
    ...git.map((fire) => ({ fire, origin: 'archive' as const, asOf: fire.updatedAt })),
  ].filter((p) => placeKey(p.fire) === key);
  return dedupe(pooled);
}
