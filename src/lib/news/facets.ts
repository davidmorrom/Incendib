/**
 * Filtrado, facetas y agrupado por recencia del panel de noticias. Opera sobre
 * historias YA agrupadas (NewsCluster) enriquecidas con los incendios que
 * mencionan. Todo es cliente y determinista (recibe `now` inyectado).
 */

import type { Fire } from '@/types/fire';
import type { NewsCluster } from './cluster';
import { norm } from './text';

/** Historia con los incendios rastreados que menciona (puede ir vacío). */
export interface FacetCluster extends NewsCluster {
  fires: Fire[];
}

export interface NewsFilters {
  /** Búsqueda por texto (todas las palabras deben aparecer). */
  query: string;
  /** Regiones seleccionadas (etiqueta). Vacío = todas. */
  regions: string[];
  country: 'todos' | 'es' | 'pt';
  /** Solo historias críticas (evacuación, descontrol…). */
  critical: boolean;
  /** Solo historias vinculadas a un incendio que rastreamos. */
  linkedOnly: boolean;
}

export const DEFAULT_NEWS_FILTERS: NewsFilters = {
  query: '',
  regions: [],
  country: 'todos',
  critical: false,
  linkedOnly: false,
};

export interface RegionFacet {
  region: string;
  count: number;
}

/** Región representativa de la historia (la del titular líder). */
export const clusterRegion = (c: NewsCluster): string => c.lead.region;

/** Recuento de historias por región, de más a menos (desempate alfabético). */
export function regionFacets(clusters: NewsCluster[]): RegionFacet[] {
  const counts = new Map<string, number>();
  for (const c of clusters) {
    const r = clusterRegion(c);
    counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  return Array.from(counts, ([region, count]) => ({ region, count })).sort(
    (a, b) => b.count - a.count || a.region.localeCompare(b.region),
  );
}

/** ¿Coinciden todas las palabras de la búsqueda con la historia? */
function matchesQuery(c: FacetCluster, q: string): boolean {
  const terms = norm(q).split(' ').filter(Boolean);
  if (!terms.length) return true;
  const hay = norm(
    [
      ...c.items.map((i) => i.title),
      ...c.sources,
      ...c.regions,
      ...c.fires.map((f) => `${f.name} ${f.municipality} ${f.province}`),
    ].join(' '),
  );
  return terms.every((t) => hay.includes(t));
}

/** Aplica todos los filtros activos a las historias (conserva el orden). */
export function applyNewsFilters(clusters: FacetCluster[], f: NewsFilters): FacetCluster[] {
  return clusters.filter((c) => {
    if (f.country === 'es' && c.lead.country !== 'ES') return false;
    if (f.country === 'pt' && c.lead.country !== 'PT') return false;
    if (f.critical && c.tone !== 'action') return false;
    if (f.linkedOnly && c.fires.length === 0) return false;
    if (f.regions.length && !f.regions.includes(clusterRegion(c))) return false;
    if (!matchesQuery(c, f.query)) return false;
    return true;
  });
}

/** Nº de grupos de filtro activos (para "N filtros activos"). */
export function activeNewsFilterCount(f: NewsFilters): number {
  let n = 0;
  if (f.query.trim()) n++;
  if (f.regions.length) n++;
  if (f.country !== 'todos') n++;
  if (f.critical) n++;
  if (f.linkedOnly) n++;
  return n;
}

export type RecencyBucket = 'ultimaHora' | 'hoy' | 'ayer' | 'anteriores';

const BUCKET_ORDER: RecencyBucket[] = ['ultimaHora', 'hoy', 'ayer', 'anteriores'];

/** Día natural (Europe/Madrid) como medianoche UTC, para diferencias de días. */
function madridMidnightUtc(ms: number): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ms); // "2026-07-16"
  const [y, m, d] = parts.split('-').map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Clasifica un timestamp en su cubo de recencia relativo a `now` (ms). */
export function recencyBucket(iso: string, now: number): RecencyBucket {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 'anteriores';
  if (now - t < 2 * 3600e3) return 'ultimaHora';
  const dayDiff = Math.round((madridMidnightUtc(now) - madridMidnightUtc(t)) / 86400e3);
  if (dayDiff <= 0) return 'hoy';
  if (dayDiff === 1) return 'ayer';
  return 'anteriores';
}

export interface FireCoverage {
  fire: Fire;
  clusters: FacetCluster[];
  /** Nº de medios distintos que cubren este incendio (en todas sus historias). */
  sources: number;
}

const COVERAGE_STATE_RANK: Record<Fire['state'], number> = {
  activo: 0,
  controlado: 1,
  estabilizado: 2,
  extinguido: 3,
};

/**
 * Invierte el enlace historia→incendio: para cada incendio rastreado con prensa
 * enlazada, las historias que lo mencionan. Ordena por estado (activos primero) y
 * luego por amplitud de cobertura. Es cobertura MEDIÁTICA, no tamaño ni peligro.
 */
export function coverageByFire(clusters: FacetCluster[]): FireCoverage[] {
  const bySlug = new Map<string, { fire: Fire; clusters: FacetCluster[] }>();
  for (const c of clusters) {
    for (const fire of c.fires) {
      const entry = bySlug.get(fire.slug);
      if (entry) entry.clusters.push(c);
      else bySlug.set(fire.slug, { fire, clusters: [c] });
    }
  }
  return Array.from(bySlug.values())
    .map(({ fire, clusters: cs }) => ({
      fire,
      clusters: cs,
      sources: new Set(cs.flatMap((c) => c.sources)).size,
    }))
    .sort(
      (a, b) =>
        COVERAGE_STATE_RANK[a.fire.state] - COVERAGE_STATE_RANK[b.fire.state] ||
        b.clusters.length - a.clusters.length ||
        b.sources - a.sources,
    );
}

export interface RecencyGroup {
  bucket: RecencyBucket;
  clusters: FacetCluster[];
}

/**
 * Agrupa las historias por recencia en orden fijo (última hora → anteriores),
 * omitiendo los cubos vacíos. Dentro de cada cubo conserva el orden de entrada
 * (que ya viene por fecha desc).
 */
export function groupByRecency(clusters: FacetCluster[], now: number): RecencyGroup[] {
  const map = new Map<RecencyBucket, FacetCluster[]>();
  for (const c of clusters) {
    const b = recencyBucket(c.latestAt, now);
    const arr = map.get(b);
    if (arr) arr.push(c);
    else map.set(b, [c]);
  }
  return BUCKET_ORDER.filter((b) => map.has(b)).map((bucket) => ({
    bucket,
    clusters: map.get(bucket)!,
  }));
}
