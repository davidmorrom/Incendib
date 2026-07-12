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

const ARTICLES = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'y', 'e', 'en', 'a']);
/** Palabras comunes que también son topónimos → falsos positivos si se usan solas. */
const AMBIGUOUS = new Set([
  'guardia', 'civil', 'real', 'monte', 'sierra', 'vega', 'puerto', 'campo', 'valle',
  'nuevo', 'nueva', 'villa', 'santa', 'santo', 'aldea', 'torre', 'fuente', 'cerro',
]);

function norm(s: string): string {
  // NFD separa los acentos; el filtro [^a-z0-9\s] los elimina junto al resto.
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Token distintivo de un topónimo (≥5 chars, sin artículos ni ambiguos). */
export function keyToken(place: string): string | null {
  const toks = norm(place)
    .split(' ')
    .filter((t) => t.length >= 5 && !ARTICLES.has(t) && !AMBIGUOUS.has(t));
  toks.sort((a, b) => b.length - a.length);
  return toks[0] ?? null;
}

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
