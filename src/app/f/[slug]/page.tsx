import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFire, getFires } from '@/lib/data';
import { FichaScreen } from '@/components/screens/FichaScreen';

// Pantalla canónica 1c: ficha con URL propia y compartible. SIEMPRE muestra el
// estado actual (no una captura). La imagen OG se genera en opengraph-image.tsx.

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const fires = await getFires();
  return fires.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const fire = await getFire(slug);
  if (!fire) return { title: 'Incendio no encontrado' };
  const title = `Incendio de ${fire.name} · ${fire.municipality}`;
  const description = `${fire.state} · ${fire.hectares} ha · ${fire.province}, ${fire.region}`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function FichaPage({ params }: Params) {
  const { slug } = await params;
  const fire = await getFire(slug);
  if (!fire) notFound();
  return <FichaScreen fire={fire} />;
}
