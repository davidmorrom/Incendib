/**
 * Adaptador de noticias reales: RSS de Google News (búsqueda) para incendios en
 * España y Portugal. Sin clave, dominio público de titulares. Cada ítem enlaza a
 * la noticia original (redirección de Google News). El texto va en su idioma de
 * origen (no se traduce). Best-effort: [] ante cualquier fallo.
 */

import { UNDATED_AT, type NewsItem } from '@/lib/data/news';
import { norm } from '@/lib/news/text';

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

/**
 * Zonas para etiquetar la noticia. Orden = prioridad: primero CCAA/grandes
 * regiones (más general), luego provincias/distritos (más específicos), de modo
 * que "Castilla y León" gana a "León" cuando ambos aparecen. La detección es por
 * palabra completa y sin acentos (ver `regionOf`).
 */
const REGION_HINTS: string[] = [
  // CCAA (ES)
  'Galicia',
  'Asturias',
  'Cantabria',
  'País Vasco',
  'Euskadi',
  'Navarra',
  'La Rioja',
  'Aragón',
  'Cataluña',
  'Catalunya',
  'Castilla y León',
  'Castilla-La Mancha',
  'Comunidad de Madrid',
  'Extremadura',
  'Andalucía',
  'Región de Murcia',
  'Comunidad Valenciana',
  'Canarias',
  'Baleares',
  'Illes Balears',
  // Grandes regiones (PT)
  'Algarve',
  'Alentejo',
  'Trás-os-Montes',
  'Beira',
  'Minho',
  // Provincias (ES)
  'A Coruña', 'Coruña', 'Lugo', 'Ourense', 'Pontevedra',
  'León', 'Zamora', 'Salamanca', 'Ávila', 'Segovia', 'Soria', 'Burgos', 'Palencia', 'Valladolid',
  'Cáceres', 'Badajoz',
  'Huelva', 'Sevilla', 'Cádiz', 'Córdoba', 'Málaga', 'Jaén', 'Granada', 'Almería',
  'Huesca', 'Teruel', 'Zaragoza',
  'Girona', 'Lleida', 'Tarragona', 'Barcelona',
  'Toledo', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Albacete',
  'Alicante', 'Castellón', 'Valencia',
  'Madrid', 'Murcia', 'Cantabria', 'Asturias',
  // Distritos (PT)
  'Faro', 'Beja', 'Setúbal', 'Santarém', 'Castelo Branco', 'Portalegre', 'Évora',
  'Guarda', 'Bragança', 'Vila Real', 'Viseu', 'Coimbra', 'Leiria', 'Aveiro',
  'Porto', 'Braga', 'Viana do Castelo', 'Lisboa', 'Madeira', 'Açores',
  // País como último recurso genérico
  'Portugal',
  'España',
];

/** Índice precomputado: hint original + su forma normalizada para regex. */
const REGION_INDEX = REGION_HINTS.map((h) => ({ label: h, key: norm(h) }));

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
  const t = norm(title);
  const hit = REGION_INDEX.find(({ key }) => new RegExp(`\\b${key}\\b`).test(t));
  return hit?.label ?? (country === 'PT' ? 'Portugal' : 'España');
}

/**
 * Titulares que MENCIONAN gravedad (evacuación, descontrol…). No es gravedad
 * verificada: la UI lo rotula «menciona … según el titular», no como estado
 * oficial. Se descartan negaciones obvias («sin evacuaciones», «descartan
 * evacuar») para no dar falsas alarmas.
 */
const CRITICAL = /evac|desaloj|descontrol|fuera de control|n[ií]vel\s*[23]|arde sin control|cortad[ao]/i;
const NEGATED = /\b(sin|no)\s+(que\s+)?(hay\s+)?(evac|desaloj|corte)|descart\w*\s+(la\s+)?(evac|desaloj)/i;
const mentionsCritical = (title: string): boolean => CRITICAL.test(title) && !NEGATED.test(title);

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
    // Sin fecha válida NO se inventa "ahora" (haría pasar un titular viejo por
    // reciente): se marca `undated` y se ordena al final con la fecha centinela.
    const undated = Number.isNaN(ms);
    out.push({
      id: `gn-${feed.country}-${i}`,
      region: regionOf(title, feed.country),
      country: feed.country,
      tone: mentionsCritical(title) ? 'action' : 'warn',
      at: undated ? UNDATED_AT : new Date(ms).toISOString(),
      ...(undated ? { undated: true } : {}),
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

/**
 * Titulares reales de incendios (ES + PT), ordenados por fecha. Solo se colapsan
 * los duplicados EXACTOS de titular+medio (el mismo artículo repetido en el
 * feed); los casi-duplicados de distintos medios se conservan a propósito, para
 * que el agrupado de historias (clusterNews) pueda medir la amplitud de cobertura.
 * Se devuelve un margen amplio (60) como material para agrupar y filtrar.
 */
export async function fetchNews(signal?: AbortSignal): Promise<NewsItem[]> {
  const per = await Promise.all(FEEDS.map((f) => fetchFeed(f, signal)));
  // Cupo por feed antes de mezclar: una ráfaga de titulares ES no puede expulsar
  // por completo la cobertura PT (o viceversa) y dar una foto sesgada.
  const capped = per.flatMap((items) =>
    items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 45),
  );
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const it of capped.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))) {
    const key = `${it.source}|${it.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out.slice(0, 70);
}
