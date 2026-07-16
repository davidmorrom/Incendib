/**
 * Empareja noticias de prensa con un incendio por su municipio, para enriquecer
 * el timeline de la ficha. CONSERVADOR a propósito (una mala atribución sería
 * desinformación): exige el token distintivo del municipio (≥5 caracteres, ni
 * artículo ni palabra ambigua tipo "Guardia"/"Real") como palabra completa en el
 * titular, y que la noticia no sea muy anterior al inicio del incendio. Las
 * entradas resultantes se muestran etiquetadas como «prensa» y enlazadas: son
 * menciones verificables, no un dato oficial de la fuente del incendio.
 */

import type { Fire, TimelineEntry } from '@/types/fire';
import type { NewsItem } from '@/lib/data/news';
import { norm, keyToken } from '@/lib/news/text';

// `keyToken` vive ahora en el módulo compartido de texto (lo usan también el
// panel de noticias y el agrupado de historias). Se re-exporta para no romper a
// quien lo importaba desde aquí.
export { keyToken };

/** Noticias de prensa relacionadas con el incendio, como entradas de timeline. */
export function relatedNews(fire: Fire, news: NewsItem[], max = 4): TimelineEntry[] {
  const key = keyToken(fire.municipality) ?? keyToken(fire.name);
  if (!key) return [];
  const re = new RegExp(`\\b${key}\\b`);
  const startMs = Date.parse(fire.startedAt);
  const floor = Number.isNaN(startMs) ? 0 : startMs - 2 * 86400e3; // margen de 2 días
  const out: TimelineEntry[] = [];
  for (const n of news) {
    if (!re.test(norm(n.title))) continue;
    if (Date.parse(n.at) < floor) continue;
    out.push({ at: n.at, label: n.title, source: n.source, url: n.url });
    if (out.length >= max) break;
  }
  return out;
}
