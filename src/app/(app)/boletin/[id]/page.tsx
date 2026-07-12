import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getBoletin, listBoletines } from '@/lib/boletin/store';
import { BoletinScreen } from '@/components/screens/BoletinScreen';

// Edición inmutable de una semana ISO. URL estable, citable y compartible.

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://incendib.es';

/**
 * Serializa el JSON-LD escapando `<`, `>`, `&` y los separadores de línea
 * U+2028/U+2029 para que ningún valor pueda cerrar el `<script>` (endurecimiento
 * anti-XSS; `JSON.stringify` por sí solo no escapa estos caracteres).
 */
function jsonLdSafe(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

type Params = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return listBoletines().map((b) => ({ id: b.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const b = getBoletin(id);
  if (!b) return { title: 'Boletín' };
  const title = `Boletín · semana ${b.isoWeek} de ${b.year}`;
  const description = `Situación de incendios en España y Portugal, ${b.periodStart} a ${b.periodEnd}.`;
  const url = `${SITE}/boletin/${b.id}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    // La imagen (og:image/twitter:image) la aporta opengraph-image.tsx del segmento.
    openGraph: {
      type: 'article',
      publishedTime: b.publishedAt,
      title,
      description,
      url,
      siteName: 'Incendib',
      locale: 'es_ES',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function BoletinPage({ params }: Params) {
  const { id } = await params;
  const boletin = getBoletin(id);
  if (!boletin) notFound();

  // Datos estructurados (schema.org/Report) para que buscadores y agregadores
  // entiendan la edición como un informe fechado y citable.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Report',
    name: `Boletín de incendios — semana ${boletin.isoWeek} de ${boletin.year}`,
    description: `Situación de incendios en España y Portugal, ${boletin.periodStart} a ${boletin.periodEnd}.`,
    datePublished: boletin.publishedAt,
    temporalCoverage: `${boletin.periodStart}/${boletin.periodEnd}`,
    spatialCoverage: 'España y Portugal',
    inLanguage: 'es',
    isAccessibleForFree: true,
    url: `${SITE}/boletin/${boletin.id}`,
    publisher: { '@type': 'Organization', name: 'Incendib', url: SITE },
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: `${SITE}/boletin/${boletin.id}/data.json`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }}
      />
      <BoletinScreen boletin={boletin} />
    </>
  );
}
