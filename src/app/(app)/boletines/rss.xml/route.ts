import { listBoletines } from '@/lib/boletin/store';
import { formatNumber } from '@/lib/utils/format';

/**
 * Feed RSS 2.0 de las ediciones del boletín semanal, para que prensa y
 * ciudadanía se suscriban. Estático a propósito: `listBoletines()` lee el
 * sistema de ficheros del repo, disponible solo en build (no en runtime
 * serverless). Se regenera al publicar una edición nueva (redeploy).
 */
export const dynamic = 'force-static';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://incendib.es';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rfc822(iso: string): string {
  const t = Date.parse(iso);
  return new Date(Number.isNaN(t) ? 0 : t).toUTCString();
}

export function GET() {
  const items = listBoletines();
  const lastBuild = rfc822(items[0]?.publishedAt ?? '');

  const entries = items
    .map((b) => {
      const url = `${SITE}/boletin/${b.id}`;
      const title = `Boletín semana ${b.isoWeek} · ${b.year}`;
      const desc =
        `Incendios en España y Portugal, ${b.periodStart} a ${b.periodEnd}. ` +
        `${formatNumber(b.kpi.firmsWeek)} detecciones FIRMS, ` +
        `${formatNumber(b.kpi.activeFires)} en seguimiento, ` +
        `${formatNumber(b.kpi.hectares)} ha afectadas, ` +
        `${formatNumber(b.kpi.perimeters)} perímetros EFFIS.`;
      return [
        '    <item>',
        `      <title>${esc(title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <pubDate>${rfc822(b.publishedAt)}</pubDate>`,
        `      <description>${esc(desc)}</description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Incendib — Boletines semanales</title>
    <link>${SITE}/boletines</link>
    <description>Situación semanal de incendios forestales en España y Portugal. Detección satelital no confirmada; no sustituye al 112.</description>
    <language>es</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${entries}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
