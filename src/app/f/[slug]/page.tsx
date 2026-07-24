import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFires, getWeather, getNews } from '@/lib/data';
import { resolveFire } from '@/lib/fires/resolve';
import { allHighlightSlugs } from '@/lib/boletin/store';
import { listArchivedGitSlugs } from '@/lib/history/archive-git';
import { relatedNews } from '@/lib/fires/news-match';
import { getFireEvents } from '@/lib/history/store';
import { getPlacePool } from '@/lib/fires/history-pool';
import { findEpisodeLinks } from '@/lib/fires/reactivation';
import { FichaScreen } from '@/components/screens/FichaScreen';
import { formatNumber } from '@/lib/utils/format';
import type { TimelineEntry } from '@/types/fire';

// Pantalla canónica 1c: ficha con URL propia y compartible. En vivo muestra el
// estado actual; si el incendio ya no está en las fuentes, cae al archivo (Redis)
// o al destacado del boletín (git) como ficha histórica. La imagen OG se genera
// en opengraph-image.tsx.

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  // Prerenderiza los incendios en vivo + los referenciados en boletines (sus
  // enlaces deben resolver siempre). El resto (archivo) se sirve on-demand
  // (dynamicParams por defecto). Nunca rompe el build si una fuente falla.
  try {
    const fires = await getFires();
    const slugs = new Set<string>([
      ...fires.map((f) => f.slug),
      ...allHighlightSlugs(),
      ...listArchivedGitSlugs(),
    ]);
    return [...slugs].map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveFire(slug);
  if (!resolved) return { title: 'Incendio no encontrado' };
  const { fire, origin } = resolved;
  const region = fire.region.replace(/\s*\(PT\)/, '');
  const place = fire.municipality && fire.municipality !== '—' ? fire.municipality : region;
  const loc = [fire.province, region].filter((x) => x && x !== '—').join(', ');
  const title = `Incendio de ${fire.name} · ${place}`;
  // Superficie con el mismo criterio que la ficha/OG: oficial/EFFIS si la hay; si
  // no, estimación por focos FIRMS marcada «~»; si tampoco, «sin dato» (evita el
  // «0 ha» que salía al compartir un incendio sin cifra oficial).
  const surfaceHa = fire.hectares > 0 ? fire.hectares : (fire.hotspotHectares ?? 0);
  const surfaceApprox = fire.hectaresApprox || (fire.hectares === 0 && !!fire.hotspotHectares);
  const haStr = surfaceHa > 0 ? `${surfaceApprox ? '~' : ''}${formatNumber(surfaceHa)} ha` : 'sin dato';
  // Histórico: nunca afirmar el estado (p. ej. «activo») como si fuera actual.
  const description =
    origin === 'live' ? `${fire.state} · ${haStr} · ${loc}` : `Ficha histórica · ${haStr} · ${loc}`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function FichaPage({ params }: Params) {
  const { slug } = await params;
  const resolved = await resolveFire(slug);
  if (!resolved) notFound();
  const { fire, origin, asOf, boletinId, hasLocation } = resolved;

  // Meteo/prensa solo en vivo: mostrarlas sobre un incendio ido sería engañoso.
  // Los eventos de seguimiento propios se conservan también en el archivo.
  let weather = fire.weather;
  const parts: TimelineEntry[] = [...(fire.timeline ?? [])];
  if (origin === 'live') {
    const [w, news, events] = await Promise.all([
      fire.weather ? Promise.resolve(fire.weather) : getWeather(fire.coordinates),
      getNews(),
      getFireEvents(fire.slug),
    ]);
    weather = w ?? fire.weather;
    parts.push(...events, ...relatedNews(fire, news));
  } else if (origin === 'archive') {
    parts.push(...(await getFireEvents(fire.slug)));
  }
  const timeline = parts.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  // Episodios del mismo paraje (reactivaciones): conecta la ficha con incendios
  // anteriores/posteriores del lugar. Determinista sobre el pool enumerable
  // (vivo + archivo git + índice Redis del paraje). null si no hay identidad de
  // lugar o no hay más episodios.
  const pool = await getPlacePool(fire);
  const related = findEpisodeLinks({ fire, origin }, pool) ?? undefined;

  return (
    <FichaScreen
      fire={{ ...fire, weather, timeline: timeline.length ? timeline : fire.timeline }}
      origin={origin}
      asOf={asOf}
      boletinId={boletinId}
      hasLocation={hasLocation}
      related={related}
    />
  );
}
