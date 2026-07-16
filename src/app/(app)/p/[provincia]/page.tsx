import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFires } from '@/lib/data';
import { getProvincePool } from '@/lib/fires/history-pool';
import { groupByPlace, provinceSlug } from '@/lib/fires/place';
import { findProvince } from '@/lib/geo/provinces';
import {
  ProvinciaScreen,
  type EpisodeRow,
  type PlaceGroupView,
} from '@/components/screens/ProvinciaScreen';

// Listado por provincia (/p/[provincia]): incendios que ha habido y está habiendo
// en la provincia, agrupados por paraje (las reactivaciones quedan juntas). Reúne
// dato en vivo, archivo de fichas (git + Redis) y áreas quemadas por satélite.
export const revalidate = 900; // ISR: 15 min

type Params = { params: Promise<{ provincia: string }> };

export async function generateStaticParams() {
  // Prerenderiza las provincias con incendios ahora; el resto (histórico, o sin
  // actividad) se sirve on-demand (dynamicParams por defecto). Nunca rompe build.
  try {
    const fires = await getFires();
    const slugs = new Set(fires.map((f) => provinceSlug(f.province)).filter(Boolean));
    return [...slugs].map((provincia) => ({ provincia }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { provincia } = await params;
  const ref = findProvince(provincia.toLowerCase());
  const name = ref?.name ?? provincia;
  const title = `Incendios en ${name}`;
  const description = ref?.region
    ? `Incendios activos e históricos en ${name}, ${ref.region}.`
    : `Incendios activos e históricos en ${name}.`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function ProvinciaPage({ params }: Params) {
  const { provincia } = await params;
  const pslug = provincia.toLowerCase();

  const pool = await getProvincePool(pslug);
  const ref = findProvince(pslug);
  // Slug desconocido y sin datos → 404. Provincia conocida sin actividad → estado vacío.
  if (!pool.length && !ref) notFound();

  // Origen (vivo/histórico) por slug, para marcar cada episodio.
  const originBySlug = new Map(pool.map((p) => [p.fire.slug, p.origin]));
  const groups = groupByPlace(pool.map((p) => p.fire));

  const view: PlaceGroupView[] = groups.map((g) => ({
    key: g.key,
    name: g.name,
    province: g.province,
    region: g.region,
    country: g.country,
    activeCount: g.episodes.filter((f) => f.state === 'activo').length,
    episodes: g.episodes.map<EpisodeRow>((f) => ({
      slug: f.slug,
      name: f.name,
      municipality: f.municipality,
      state: f.state,
      level: f.level,
      country: f.country,
      hectares: f.hectares,
      hectaresApprox: f.hectaresApprox,
      startedAt: f.startedAt,
      historical: originBySlug.get(f.slug) !== 'live',
      satelliteConfirmed: f.satelliteConfirmed,
    })),
  }));

  // Nombre y región a mostrar: preferimos el dato real de un incidente oficial
  // (no una área quemada EFFIS); si no hay, el catálogo canónico.
  const official = pool.find((p) => p.fire.region && p.fire.region !== 'EFFIS' && p.fire.region !== '—');
  const provinceName =
    official?.fire.province && official.fire.province !== '—'
      ? official.fire.province
      : (pool[0]?.fire.province && pool[0].fire.province !== '—'
          ? pool[0].fire.province
          : (ref?.name ?? provincia));
  const region = official?.fire.region.replace(/\s*\(PT\)/, '') ?? ref?.region;

  return <ProvinciaScreen provinceName={provinceName} region={region} groups={view} />;
}
