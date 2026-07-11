/**
 * Punto de entrada de datos. En modo "mock" (por defecto) devuelve datos de
 * demostración; en modo "live" agregará y deduplicará las fuentes reales.
 *
 * La agregación live vive en el servidor (API routes) para cachear FIRMS y no
 * agotar su rate limit (5000 tx / 10 min) — ver docs/DATA-SOURCES.md §Recommendations.
 */

import type { Fire, Hotspot, SourceId, SourceStatus } from '@/types/fire';
import { MOCK_FIRES, MOCK_HOTSPOTS, MOCK_SOURCE_STATUS } from './mock';
import {
  fetchFirmsHotspots,
  fetchFogosActive,
  fetchJcylFires,
  fetchInfocaFires,
  fetchCatalunyaFires,
  fetchEffisPerimeters,
  attachPerimeters,
} from './adapters';

export type DataMode = 'mock' | 'live';

export function getDataMode(): DataMode {
  const explicit = process.env.NEXT_PUBLIC_DATA_MODE;
  if (explicit === 'live') return 'live';
  if (explicit === 'mock') return 'mock';
  // Sin señal explícita legible (p. ej. la env var pública no se inyectó en el
  // build): en Vercel (producción/preview) servimos datos reales; en local, mock.
  return process.env.VERCEL === '1' ? 'live' : 'mock';
}

/**
 * Incendios agregados y normalizados.
 *
 * En live combina las fuentes con datos reales usables: fogos.pt (Portugal),
 * Castilla y León (INFORCYL), Andalucía (INFOCA) y Cataluña (Bombers). El resto
 * de España no tiene API de incendios activos en tiempo real, así que ahí solo
 * hay focos satelitales (getHotspots). Los perímetros de EFFIS se adjuntan al
 * incendio oficial más cercano. Nunca lanza: si todo falla, devuelve [] (vacío =
 * buena noticia).
 */
export async function getFires(): Promise<Fire[]> {
  if (getDataMode() === 'live') {
    const [pt, cyl, and, cat, perimeters] = await Promise.all([
      fetchFogosActive(),
      fetchJcylFires(),
      fetchInfocaFires(),
      fetchCatalunyaFires(),
      fetchEffisPerimeters(),
    ]);
    return attachPerimeters(dedupeFires([...pt, ...cyl, ...and, ...cat]), perimeters);
  }
  return MOCK_FIRES;
}

/** Dedup por slug (las fuentes PT/ES no se solapan, pero por seguridad). */
function dedupeFires(fires: Fire[]): Fire[] {
  const seen = new Set<string>();
  const out: Fire[] = [];
  for (const f of fires) {
    if (seen.has(f.slug)) continue;
    seen.add(f.slug);
    out.push(f);
  }
  return out;
}

export async function getFire(slug: string): Promise<Fire | null> {
  const fires = await getFires();
  return fires.find((f) => f.slug === slug) ?? null;
}

/**
 * Focos satelitales (NASA FIRMS). Detección térmica, NO incendio confirmado.
 * En live consulta FIRMS (cacheado en el servidor por su rate limit); en mock
 * devuelve un cúmulo determinista. Nunca lanza: ante fallo devuelve [].
 */
export async function getHotspots(): Promise<Hotspot[]> {
  if (getDataMode() === 'live') {
    // 2 días: robusto ante ventanas VIIRS/NRT vacías (madrugada). El mapa los
    // atenúa por antigüedad y el KPI "Focos 24 h" cuenta solo las últimas 24 h.
    return fetchFirmsHotspots({ days: 2 });
  }
  return MOCK_HOTSPOTS;
}

/**
 * Áreas quemadas recientes (EFFIS) para la capa de perímetros del mapa. Son
 * incendios pasados/mapeados por satélite (no incidentes activos): se dibujan
 * como perímetro real de área quemada, aparte de los marcadores de incidentes.
 * En mock ya vienen perímetros en los propios incendios, así que devuelve [].
 */
export async function getBurnedAreas(): Promise<Fire[]> {
  if (getDataMode() !== 'live') return [];
  const areas = await fetchEffisPerimeters();
  // Cap por higiene visual/perf; ya vienen ordenadas por actualización reciente.
  return areas.slice(0, 250);
}

/** Recuento de focos de las últimas 24 h (KPI), relativo a `now` (ms). */
export function countHotspots24h(hotspots: Hotspot[], now: number): number {
  const cutoff = now - 24 * 3600e3;
  return hotspots.filter((h) => Date.parse(h.acquiredAt) >= cutoff).length;
}

/** ISO más reciente de una lista, o `fallback` si está vacía. */
function latestIso(isos: string[], fallback: string): string {
  let max = 0;
  for (const s of isos) {
    const t = Date.parse(s);
    if (t > max) max = t;
  }
  return max ? new Date(max).toISOString() : fallback;
}

const plural = (n: number, s: string) => `${n} ${s}${n === 1 ? '' : 's'}`;

/**
 * Estado de las fuentes. En mock, datos de demostración; en live, refleja las
 * fuentes realmente integradas y la frescura de sus datos.
 */
export async function getSourceStatus(): Promise<SourceStatus[]> {
  if (getDataMode() !== 'live') return MOCK_SOURCE_STATUS;

  const [fires, hotspots] = await Promise.all([getFires(), getHotspots()]);
  const now = new Date().toISOString();
  const bySrc = (id: SourceId) => fires.filter((f) => f.sources.includes(id));
  const pt = bySrc('fogos');
  const cyl = bySrc('jcyl');
  const and = bySrc('infoca');
  const cat = bySrc('catalunya');
  const perims = fires.filter((f) => f.perimeter).length;

  return [
    {
      id: 'firms',
      label: 'NASA FIRMS',
      description: 'focos VIIRS/MODIS',
      status: 'ok',
      note: hotspots.length ? 'Dominio público · últimas 48 h' : 'Sin focos en la ventana actual',
      lastUpdate: latestIso(hotspots.map((h) => h.acquiredAt), now),
    },
    {
      id: 'fogos',
      label: 'fogos.pt / ANEPC',
      description: 'incidentes activos (PT)',
      status: 'ok',
      note: plural(pt.length, 'incidente activo'),
      lastUpdate: latestIso(pt.map((f) => f.updatedAt), now),
    },
    {
      id: 'jcyl',
      label: 'INFORCYL · JCyL',
      description: 'Castilla y León',
      status: 'ok',
      note: plural(cyl.length, 'incidente'),
      lastUpdate: latestIso(cyl.map((f) => f.updatedAt), now),
    },
    {
      id: 'infoca',
      label: 'INFOCA · Andalucía',
      description: 'Plan INFOCA',
      status: 'ok',
      note: plural(and.length, 'incidente'),
      lastUpdate: latestIso(and.map((f) => f.updatedAt), now),
    },
    {
      id: 'catalunya',
      label: 'Bombers · Catalunya',
      description: 'incendis de vegetació',
      status: 'ok',
      note: plural(cat.length, 'incidente'),
      lastUpdate: latestIso(cat.map((f) => f.updatedAt), now),
    },
    {
      id: 'effis',
      label: 'EFFIS / Copernicus EMS',
      description: 'perímetros de área quemada',
      status: perims ? 'ok' : 'degraded',
      note: perims ? plural(perims, 'perímetro') : 'sin perímetros disponibles',
      lastUpdate: now,
    },
  ];
}

export { MOCK_FIRES, MOCK_HOTSPOTS, MOCK_SOURCE_STATUS };
