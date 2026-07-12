import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getBoletin, listBoletines } from '@/lib/boletin/store';
import { BoletinScreen } from '@/components/screens/BoletinScreen';

// Edición inmutable de una semana ISO. URL estable, citable y compartible.

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://incendib.es';

type Params = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return listBoletines().map((b) => ({ id: b.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const b = getBoletin(id);
  if (!b) return { title: 'Boletín' };
  return {
    title: `Boletín · semana ${b.isoWeek} de ${b.year}`,
    description: `Situación de incendios en España y Portugal, ${b.periodStart} a ${b.periodEnd}.`,
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
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BoletinScreen boletin={boletin} />
    </>
  );
}
