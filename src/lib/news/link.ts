/**
 * Enlaza una historia de prensa con los incendios que YA rastreamos, para poder
 * saltar del titular a la ficha (/f/{slug}) y al mapa. Reusa el emparejamiento
 * conservador por topónimo (keyToken): exige el token distintivo del municipio (o
 * del nombre) del incendio como palabra completa en el titular. Una atribución
 * errónea sería desinformación, así que ante la duda NO se enlaza.
 */

import type { Fire, FireState } from '@/types/fire';
import type { NewsCluster } from './cluster';
import { keyToken, titleMentions } from './text';

interface FireKey {
  fire: Fire;
  token: string;
}

/** Prioridad de estado: un incendio activo pesa más que uno extinguido. */
const STATE_RANK: Record<FireState, number> = {
  activo: 0,
  controlado: 1,
  estabilizado: 2,
  extinguido: 3,
};

/** Precalcula el token distintivo de cada incendio (municipio, si no, nombre). */
export function fireIndex(fires: Fire[]): FireKey[] {
  const out: FireKey[] = [];
  for (const fire of fires) {
    const token = keyToken(fire.municipality) ?? keyToken(fire.name);
    if (token) out.push({ fire, token });
  }
  return out;
}

/** Incendios cuyo topónimo aparece (palabra completa) en el titular. */
function firesForTitle(title: string, index: FireKey[]): Fire[] {
  const hits: FireKey[] = index.filter((k) => titleMentions(title, k.token));
  return hits.map((h) => h.fire);
}

/**
 * Devuelve un enlazador: dado un grupo de titulares, los incendios rastreados que
 * mencionan (cualquiera de sus medios). Deduplicado por slug, priorizando los
 * activos y los topónimos más largos (más específicos), acotado a `max`.
 */
export function fireLinker(fires: Fire[], max = 2): (cluster: NewsCluster) => Fire[] {
  const index = fireIndex(fires);
  if (!index.length) return () => [];
  return (cluster: NewsCluster) => {
    const bySlug = new Map<string, Fire>();
    for (const item of cluster.items) {
      for (const fire of firesForTitle(item.title, index)) {
        if (!bySlug.has(fire.slug)) bySlug.set(fire.slug, fire);
      }
    }
    return Array.from(bySlug.values())
      .sort((a, b) => {
        const r = STATE_RANK[a.state] - STATE_RANK[b.state];
        if (r !== 0) return r;
        return b.municipality.length - a.municipality.length;
      })
      .slice(0, max);
  };
}
