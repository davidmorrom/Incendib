/**
 * Punto de entrada de datos. En modo "mock" (por defecto) devuelve datos de
 * demostración; en modo "live" agregará y deduplicará las fuentes reales.
 *
 * La agregación live vive en el servidor (API routes) para cachear FIRMS y no
 * agotar su rate limit (5000 tx / 10 min) — ver docs/DATA-SOURCES.md §Recommendations.
 */

import type { Fire, Hotspot, SourceStatus } from '@/types/fire';
import { MOCK_FIRES, MOCK_HOTSPOTS, MOCK_SOURCE_STATUS } from './mock';
import {
  fetchFirmsHotspots,
  fetchFogosActive,
  fetchJcylFires,
  fetchEffisPerimeters,
  attachPerimeters,
} from './adapters';

export type DataMode = 'mock' | 'live';

export function getDataMode(): DataMode {
  return process.env.NEXT_PUBLIC_DATA_MODE === 'live' ? 'live' : 'mock';
}

/**
 * Incendios agregados y normalizados.
 *
 * En live combina las fuentes con datos reales usables: fogos.pt (Portugal) y
 * Castilla y León (JCyL). El resto de España no tiene API nacional de incendios
 * activos, así que ahí solo hay focos satelitales (getHotspots). Los perímetros
 * de EFFIS se adjuntan al incendio oficial más cercano. Nunca lanza: si todas
 * las fuentes fallan, devuelve [] (estado vacío = buena noticia).
 */
export async function getFires(): Promise<Fire[]> {
  if (getDataMode() === 'live') {
    const [pt, cyl, perimeters] = await Promise.all([
      fetchFogosActive(),
      fetchJcylFires(),
      fetchEffisPerimeters(),
    ]);
    return attachPerimeters(dedupeFires([...pt, ...cyl]), perimeters);
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
    return fetchFirmsHotspots({ days: 1 });
  }
  return MOCK_HOTSPOTS;
}

export async function getSourceStatus(): Promise<SourceStatus[]> {
  return MOCK_SOURCE_STATUS;
}

export { MOCK_FIRES, MOCK_HOTSPOTS, MOCK_SOURCE_STATUS };
