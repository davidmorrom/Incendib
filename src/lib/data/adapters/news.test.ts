import { describe, it, expect } from 'vitest';
import { parseRss, type Feed } from './news';

const ES: Feed = { q: 'incendio forestal', hl: 'es', gl: 'ES', ceid: 'ES:es', country: 'ES' };

function rssItem(title: string, opts: { source?: string; link?: string; pubDate?: string } = {}): string {
  const { source = 'La Voz', link = 'https://news.google.com/rss/articles/abc', pubDate } = opts;
  return (
    `<item><title>${title}</title><link>${link}</link>` +
    (pubDate ? `<pubDate>${pubDate}</pubDate>` : '') +
    `<source url="https://x">${source}</source></item>`
  );
}

describe('parseRss (Google News)', () => {
  it('quita el sufijo " - Fuente" del título y usa la fuente', () => {
    const xml = `<rss><channel>${rssItem('Incendio en Ourense arrasa 50 ha - La Voz')}</channel></rss>`;
    const [n] = parseRss(xml, ES);
    expect(n?.title).toBe('Incendio en Ourense arrasa 50 ha');
    expect(n?.source).toBe('La Voz');
    expect(n?.url).toContain('news.google.com');
  });

  it('decodifica entidades HTML del título', () => {
    const xml = `<rss>${rssItem('Bomberos &amp; UME en Cáceres &#39;controlan&#39; el fuego - EFE', { source: 'EFE' })}</rss>`;
    const [n] = parseRss(xml, ES);
    expect(n?.title).toBe("Bomberos & UME en Cáceres 'controlan' el fuego");
  });

  it('marca tono "action" en titulares críticos (evacuación)', () => {
    const xml = `<rss>${rssItem('Evacúan tres aldeas por el incendio de Zamora - RTVE')}</rss>`;
    const [n] = parseRss(xml, ES);
    expect(n?.tone).toBe('action');
  });

  it('tono "warn" por defecto y región detectada del título', () => {
    const xml = `<rss>${rssItem('Estabilizado el incendio de Galicia - Europa Press')}</rss>`;
    const [n] = parseRss(xml, ES);
    expect(n?.tone).toBe('warn');
    expect(n?.region).toBe('Galicia');
  });

  it('cae a España/Portugal cuando no reconoce región', () => {
    const xmlEs = `<rss>${rssItem('Un incendio obliga a cortar una carretera - Diario')}</rss>`;
    expect(parseRss(xmlEs, ES)[0]?.region).toBe('España');
    const pt: Feed = { q: 'x', hl: 'pt-PT', gl: 'PT', ceid: 'PT:pt', country: 'PT' };
    const xmlPt = `<rss>${rssItem('Incêndio deflagra numa zona de mato - RTP')}</rss>`;
    expect(parseRss(xmlPt, pt)[0]?.region).toBe('Portugal');
  });

  it('convierte pubDate a ISO', () => {
    const xml = `<rss>${rssItem('Incendio - X', { pubDate: 'Fri, 10 Jul 2026 12:00:00 GMT' })}</rss>`;
    const [n] = parseRss(xml, ES);
    expect(n?.at).toBe('2026-07-10T12:00:00.000Z');
  });

  it('ignora items sin título o sin enlace', () => {
    const xml = `<rss><item><title>Sin enlace</title></item></rss>`;
    expect(parseRss(xml, ES)).toHaveLength(0);
  });
});
