/**
 * Enlace entre episodios del mismo paraje (reactivaciones). Cuando un incendio se
 * reactiva, la fuente abre un incidente NUEVO (nuevo slug → nueva ficha) y el
 * anterior queda como ficha histórica. Aquí conectamos ambos: dado un incendio y
 * un «pool» de episodios (presentes y archivados), encontramos los del mismo
 * paraje y los clasificamos respecto al objetivo (anteriores / posteriores /
 * incidente actual). Puro y testeable; la UI (FichaScreen) pone el copy.
 */

import type { Fire, FireState, SeverityLevel } from '@/types/fire';
import type { FireOrigin } from '@/lib/fires/resolve';
import { placeKey, startedMs } from '@/lib/fires/place';

/** Episodio con su procedencia (vivo, archivo o boletín). */
export interface PooledFire {
  fire: Fire;
  origin: FireOrigin;
  /** Fecha del último dato conocido (histórico), si aplica. */
  asOf?: string;
}

/** Referencia serializable de un episodio para pasar del servidor a la ficha. */
export interface EpisodeRef {
  slug: string;
  name: string;
  municipality: string;
  province: string;
  state: FireState;
  level: SeverityLevel;
  hectares: number;
  startedAt: string;
  updatedAt: string;
  /** true si el episodio NO está en las fuentes en vivo (ficha histórica). */
  historical: boolean;
}

export interface EpisodeLinks {
  /** Todos los demás episodios del paraje, del más reciente al más antiguo. */
  related: EpisodeRef[];
  /** Episodios anteriores al objetivo (el objetivo es una reactivación de estos). */
  prior: EpisodeRef[];
  /** Episodios posteriores al objetivo (el objetivo se reactivó en estos). */
  later: EpisodeRef[];
  /** Incidente al que apuntar como «actual» (el más reciente aún vivo), si existe. */
  current?: EpisodeRef;
}

function toRef(p: PooledFire): EpisodeRef {
  const f = p.fire;
  return {
    slug: f.slug,
    name: f.name,
    municipality: f.municipality,
    province: f.province,
    state: f.state,
    level: f.level,
    hectares: f.hectares,
    startedAt: f.startedAt,
    updatedAt: f.updatedAt,
    historical: p.origin !== 'live',
  };
}

/** ¿Es un incidente «vivo» aún en curso (no extinguido)? */
function liveOngoing(p: PooledFire): boolean {
  return p.origin === 'live' && p.fire.state !== 'extinguido';
}

/**
 * Clasifica los episodios del mismo paraje que `target` dentro de `pool`.
 * Devuelve `null` si el objetivo no tiene identidad de lugar o no hay más
 * episodios (no es una reactivación). `pool` puede incluir al propio objetivo:
 * se excluye por slug. `target` se pasa con su procedencia real (vivo/archivo)
 * para decidir si debe apuntarse a un «incidente actual».
 */
export function findEpisodeLinks(target: PooledFire, pool: PooledFire[]): EpisodeLinks | null {
  const key = placeKey(target.fire);
  if (!key) return null;

  const related = pool
    .filter((p) => p.fire.slug !== target.fire.slug && placeKey(p.fire) === key)
    .sort((a, b) => startedMs(b.fire) - startedMs(a.fire));
  if (!related.length) return null;

  const t = startedMs(target.fire);
  const prior = related.filter((p) => startedMs(p.fire) < t);
  const later = related.filter((p) => startedMs(p.fire) >= t);

  // «Actual»: el incidente vivo más reciente entre los posteriores; si ninguno de
  // los posteriores está vivo, cualquier episodio vivo del paraje (defensa ante
  // fechas de inicio poco fiables). Solo tiene sentido si el propio objetivo NO
  // es ya el incidente vivo.
  const current = liveOngoing(target)
    ? undefined
    : (later.find(liveOngoing) ?? related.find(liveOngoing));

  return {
    related: related.map(toRef),
    prior: prior.map(toRef),
    later: later.map(toRef),
    current: current ? toRef(current) : undefined,
  };
}
