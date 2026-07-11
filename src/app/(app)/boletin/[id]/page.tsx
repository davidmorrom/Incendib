import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getBoletin, listBoletines } from '@/lib/boletin/store';
import { BoletinScreen } from '@/components/screens/BoletinScreen';

// Edición inmutable de una semana ISO. URL estable, citable y compartible.

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
  return <BoletinScreen boletin={boletin} />;
}
