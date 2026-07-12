import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFire, getFires, getWeather, getNews } from '@/lib/data';
import { relatedNews } from '@/lib/fires/news-match';
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
  // Meteo local real (Open-Meteo) + noticias de prensa relacionadas por municipio.
  const [weather, news] = await Promise.all([
    fire.weather ? Promise.resolve(fire.weather) : getWeather(fire.coordinates),
    getNews(),
  ]);
  const press = relatedNews(fire, news);
  const timeline = [...(fire.timeline ?? []), ...press].sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at),
  );
  return (
    <FichaScreen
      fire={{
        ...fire,
        weather: weather ?? fire.weather,
        timeline: timeline.length ? timeline : fire.timeline,
      }}
    />
  );
}
