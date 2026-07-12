import type { MetadataRoute } from 'next';
import { getFires } from '@/lib/data';
import { listBoletines } from '@/lib/boletin/store';

// Dominio canónico del proyecto (custom domain), sobreescribible por entorno.
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://incendib.es';

// Refresca el sitemap con la periodicidad de ISR de los datos.
export const revalidate = 3600;

function safeDate(iso?: string): Date | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? undefined : new Date(t);
}

/**
 * Sitemap dinámico: rutas estáticas + fichas de incendios (`/f/[slug]`) +
 * ediciones del boletín (`/boletin/[id]`). Sirve para que fichas y boletines
 * sean indexables y citables (objetivo del research). Nunca lanza: si una
 * fuente falla, incluye al menos lo que haya.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: `${SITE}/informe`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE}/boletines`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/historico`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${SITE}/noticias`, lastModified: now, changeFrequency: 'hourly', priority: 0.6 },
    { url: `${SITE}/fuentes`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE}/alertas`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE}/legal`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  let fireRoutes: MetadataRoute.Sitemap = [];
  try {
    const fires = await getFires();
    fireRoutes = fires.map((f) => ({
      url: `${SITE}/f/${f.slug}`,
      lastModified: safeDate(f.updatedAt) ?? now,
      changeFrequency: 'hourly',
      priority: 0.5,
    }));
  } catch {
    /* una fuente caída no debe romper el sitemap */
  }

  let boletinRoutes: MetadataRoute.Sitemap = [];
  try {
    boletinRoutes = listBoletines().map((b) => ({
      url: `${SITE}/boletin/${b.id}`,
      lastModified: safeDate(b.publishedAt) ?? now,
      changeFrequency: 'never',
      priority: 0.7,
    }));
  } catch {
    /* sin ediciones aún */
  }

  return [...staticRoutes, ...fireRoutes, ...boletinRoutes];
}
