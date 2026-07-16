/**
 * Normalización y tokenización de titulares, compartida por el emparejamiento
 * titular↔incendio (ficha y panel de noticias) y por el agrupado de historias.
 *
 * Todo aquí es determinista y sin estado: mismas entradas → mismas salidas
 * (necesario para SSR consistente entre servidor y cliente).
 */

/** Artículos/preposiciones que nunca son token distintivo de un topónimo. */
const ARTICLES = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'y', 'e', 'en', 'a']);

/** Palabras comunes que también son topónimos → falsos positivos si se usan solas. */
const AMBIGUOUS = new Set([
  'guardia', 'civil', 'real', 'monte', 'sierra', 'vega', 'puerto', 'campo', 'valle',
  'nuevo', 'nueva', 'villa', 'santa', 'santo', 'aldea', 'torre', 'fuente', 'cerro',
]);

/**
 * Vocabulario ubicuo en titulares de incendios (ES/PT) + palabras vacías: aparece
 * en casi todos, así que NO distingue una historia de otra. Se descarta al medir
 * el parecido entre titulares para no fusionar sucesos distintos por compartir
 * "incendio", "forestal", etc.
 */
const STOPWORDS = new Set([
  // fuego (ES/PT)
  'incendio', 'incendios', 'incendia', 'incendian', 'incendiario', 'fuego', 'fuegos',
  'llamas', 'forestal', 'forestales', 'incendie', 'incendio', 'incendios',
  'incendiar', 'incendiaria', 'incendiarios', 'incendioforestal',
  'incendo', 'igneo',
  'incndio', 'incndios', // "incêndio"/"incêndios" sin acento tras norm()
  'fogo', 'fogos', 'florestal', 'florestais', 'mato', 'chamas',
  // superficie / genéricos de suceso
  'hectareas', 'hectarea', 'hectares', 'hectare', 'quema', 'quemada', 'quemadas',
  'queima', 'queimada', 'zona', 'zonas', 'area', 'areas', 'foco', 'focos',
  // conectores / verbos huecos frecuentes (ES/PT)
  'para', 'por', 'con', 'sin', 'los', 'las', 'del', 'una', 'unos', 'unas',
  'este', 'esta', 'estas', 'estos', 'mas', 'muy', 'ante', 'tras', 'entre',
  'sobre', 'desde', 'hasta', 'cerca', 'donde', 'como', 'sus', 'que', 'nao',
  'pelo', 'pela', 'pelos', 'pelas', 'dos', 'das', 'num', 'numa', 'aos',
  'tem', 'esta', 'esto', 'ese', 'esa', 'segun', 'seguem',
  // meta-noticia
  'video', 'directo', 'ultima', 'hora', 'hoy', 'ayer', 'noticias', 'noticia',
]);

/**
 * Minúsculas, sin acentos, solo alfanumérico y espacios. NFD separa cada acento
 * en su marca combinante; se ELIMINAN (no se sustituyen por espacio, que partiría
 * la palabra: "Aragón" → "aragon", no "arago n"). El resto de signos → espacio.
 */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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

/** ¿El titular menciona el token como palabra completa? (ya normaliza el titular). */
export function titleMentions(title: string, token: string): boolean {
  if (!token) return false;
  return new RegExp(`\\b${token}\\b`).test(norm(title));
}

/**
 * Conjunto de tokens distintivos de un titular (≥4 chars, sin vocabulario ubicuo
 * ni palabras vacías). Es la huella que define de qué suceso habla el titular.
 */
export function significantTokens(title: string): Set<string> {
  const out = new Set<string>();
  for (const t of norm(title).split(' ')) {
    if (t.length >= 4 && !STOPWORDS.has(t)) out.add(t);
  }
  return out;
}

/** Índice de Jaccard entre dos conjuntos de tokens (0..1). */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Nº de tokens compartidos entre dos conjuntos. */
export function sharedCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n;
}
