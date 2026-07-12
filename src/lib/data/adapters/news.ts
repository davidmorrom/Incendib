/**
 * Adaptador de noticias reales: RSS de Google News (búsqueda) para incendios en
 * España y Portugal. Sin clave, dominio público de titulares. Cada ítem enlaza a
 * la noticia original (redirección de Google News). El texto va en su idioma de
 * origen (no se traduce). Best-effort: [] ante cualquier fallo.
 */

import type { NewsItem } from '@/lib/data/news';

export interface Feed {
  q: string;
  hl: string;
  gl: string;
  ceid: string;
  country: 'ES' | 'PT';
}

const FEEDS: Feed[] = [
  { q: 'incendio forestal', hl: 'es', gl: 'ES', ceid: 'ES:es', country: 'ES' },
  { q: 'incêndio rural OR incêndio florestal', hl: 'pt-PT', gl: 'PT', ceid: 'PT:pt', country: 'PT' },
];

/** CCAA (ES) y distritos/regiones (PT) para etiquetar la noticia por zona. */
const REGION_HINTS: string[] = [
  'Galicia',
  'Asturias',
  'Cantabria',
  'País Vasco',
  'Navarra',
  'La Rioja',
  'Aragón',
  'Cataluña',
  'Castilla y León',
  'Castilla-La Mancha',
  'Madrid',
  'Extremadura',
  'Andalucía',
  'Murcia',
  'Comunidad Valenciana',
  'Valencia',
  'Canarias',
  'Baleares',
  'Ourense',
  'Zamora',
  'León',
  'Ávila',
  'Cáceres',
  'Huelva',
  'Málaga',
  'Portugal',
  'Algarve',
  'Guarda',
  'Bragança',
  'Viseu',
  'Coimbra',
  'Leiria',
  'Vila Real',
];

const decodeEntities = (s: string): string =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&(?:apos|#39);/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();

const inner = (block: string, tag: string): string => {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(block);
  return m ? decodeEntities(m[1] ?? '') : '';
};

function regionOf(title: string, country: Feed['country']): string {
  const hit = REGION_HINTS.find((r) => title.toLowerCase().includes(r.toLowerCase()));
  return hit ?? (country === 'PT' ? 'Portugal' : 'España');
}

/** Titulares que sugieren gravedad se marcan con acento "action" (rojo). */
const CRITICAL = /evac|desaloj|descontrol|fuera de control|n[ií]vel\s*[23]|arde sin control|cortad[ao]/i;

export function parseRss(xml: string, feed: Feed): NewsItem[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const out: NewsItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const block = items[i] ?? '';
    const rawTitle = inner(block, 'title');
    const link = inner(block, 'link');
    if (!rawTitle || !link) continue;
    const source = inner(block, 'source');
    let title = rawTitle;
    // Google News añade " - Fuente" al final del título; lo quitamos.
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3)).trim();
    const pub = inner(block, 'pubDate');
    const ms = pub ? Date.parse(pub) : NaN;
    out.push({
      id: `gn-${feed.country}-${i}`,
      region: regionOf(title, feed.country),
      tone: CRITICAL.test(title) ? 'action' : 'warn',
      at: Number.isNaN(ms) ? new Date().toISOString() : new Date(ms).toISOString(),
      source: source || 'Google News',
      title,
      url: link,
    });
  }
  return out;
}

async function fetchFeed(feed: Feed, signal?: AbortSignal): Promise<NewsItem[]> {
  const url =
    `https://news.google.com/rss/search?q=${encodeURIComponent(feed.q)}` +
    `&hl=${feed.hl}&gl=${feed.gl}&ceid=${encodeURIComponent(feed.ceid)}`;
  try {
    const res = await fetch(url, {
      signal: signal ?? AbortSignal.timeout(10_000),
      // Cache 15 min: los titulares no cambian a cada visita.
      next: { revalidate: 900 },
    });
    if (!res.ok) return [];
    return parseRss(await res.text(), feed);
  } catch {
    return [];
  }
}

/** Titulares reales de incendios (ES + PT), deduplicados y ordenados por fecha. */
export async function fetchNews(signal?: AbortSignal): Promise<NewsItem[]> {
  const per = await Promise.all(FEEDS.map((f) => fetchFeed(f, signal)));
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const it of per.flat().sort((a, b) => Date.parse(b.at) - Date.parse(a.at))) {
    const key = it.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out.slice(0, 24);
}
