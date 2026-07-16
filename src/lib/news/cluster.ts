/**
 * Agrupado de historias: Google News devuelve el MISMO suceso publicado por
 * muchos medios (a veces con titular idéntico, a veces reformulado). Antes se
 * descartaban los duplicados exactos y se perdía la señal más útil: cuántos
 * medios cubren una historia (la amplitud de cobertura = relevancia).
 *
 * Aquí se agrupan los titulares casi idénticos en una sola historia que conserva
 * TODOS sus medios. Es CONSERVADOR a propósito: solo fusiona titulares con una
 * huella de tokens muy solapada, para no unir sucesos distintos (p. ej. dos
 * incendios en provincias diferentes) en la misma tarjeta.
 */

import type { NewsItem } from '@/lib/data/news';
import { significantTokens, jaccard, sharedCount } from './text';

export interface NewsCluster {
  /** Estable: id del titular principal. */
  id: string;
  /** Titular representativo (el más reciente del grupo). */
  lead: NewsItem;
  /** Todos los titulares del grupo, del más reciente al más antiguo. */
  items: NewsItem[];
  /** Medios distintos que cubren la historia (por nombre). */
  sources: string[];
  /** Regiones distintas mencionadas en el grupo. */
  regions: string[];
  /** ISO del titular más reciente del grupo. */
  latestAt: string;
  /** "action" si algún titular del grupo es crítico (evacuación, descontrol…). */
  tone: 'warn' | 'action';
}

/**
 * Umbral de parecido (Jaccard) para considerar dos titulares la misma historia.
 * Calibrado con titulares reales reformulados por distintos medios (sinónimos
 * como "operativo"/"despliegue" bajan el Jaccard aunque el suceso sea el mismo).
 */
const SIMILARITY = 0.4;
/** Mínimo de tokens distintivos compartidos (evita fusiones por azar). */
const MIN_SHARED = 3;

interface Bucket {
  items: NewsItem[];
  /** Huella del titular líder (el primero, más reciente) del grupo. */
  leadTokens: Set<string>;
}

const uniq = (xs: string[]): string[] => Array.from(new Set(xs.filter(Boolean)));

/**
 * Agrupa titulares casi idénticos conservando todos sus medios. Los grupos salen
 * ordenados por recencia (el titular más reciente del grupo primero).
 */
export function clusterNews(news: NewsItem[]): NewsCluster[] {
  const sorted = [...news].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const buckets: Bucket[] = [];

  for (const item of sorted) {
    const tokens = significantTokens(item.title);
    let best: Bucket | null = null;
    let bestSim = 0;
    for (const b of buckets) {
      const sim = jaccard(tokens, b.leadTokens);
      if (sim > bestSim && sim >= SIMILARITY && sharedCount(tokens, b.leadTokens) >= MIN_SHARED) {
        best = b;
        bestSim = sim;
      }
    }
    if (best) {
      best.items.push(item);
    } else {
      // El líder es el primero que llega y, como van ordenados por fecha desc,
      // también el más reciente del grupo.
      buckets.push({ items: [item], leadTokens: tokens });
    }
  }

  return buckets.map((b) => {
    const items = b.items; // ya vienen en orden de recencia
    const lead = items[0]!;
    return {
      id: lead.id,
      lead,
      items,
      sources: uniq(items.map((i) => i.source)),
      regions: uniq(items.map((i) => i.region)),
      latestAt: lead.at,
      tone: items.some((i) => i.tone === 'action') ? 'action' : 'warn',
    };
  });
}
