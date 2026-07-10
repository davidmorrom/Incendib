/**
 * Adaptadores de fuente (STUBS de estructura).
 *
 * Cada adaptador consulta su API y NORMALIZA al modelo `Fire`/`Hotspot`. Aún
 * no implementados: devuelven vacío. La lógica real (fetch + normalización +
 * caché) llega en fases posteriores; los endpoints y la estrategia están en
 * docs/DATA-SOURCES.md y en src/lib/data/sources.ts.
 *
 * Estrategia de arquitectura (docs/DATA-SOURCES.md §Recommendations):
 *   FIRMS  → capa universal de hotspots (cacheada en backend por rate limit)
 *   EFFIS  → perímetros de área quemada + FWI
 *   fogos/ICNF → estado operativo PT
 *   JCyL/Catalunya → estado operativo ES donde hay API abierta
 */

import type { Fire, Hotspot } from '@/types/fire';

export interface FetchOptions {
  /** Bounding box [minLon, minLat, maxLon, maxLat]. */
  bbox?: [number, number, number, number];
  /** Ventana temporal en días (FIRMS admite 1–10). */
  days?: number;
  signal?: AbortSignal;
}

// TODO(fase-2): implementar fetch + normalización. Ver docs/DATA-SOURCES.md.
export async function fetchFirmsHotspots(_opts: FetchOptions = {}): Promise<Hotspot[]> {
  return [];
}

export async function fetchEffisPerimeters(_opts: FetchOptions = {}): Promise<Fire[]> {
  return [];
}

export async function fetchFogosActive(_opts: FetchOptions = {}): Promise<Fire[]> {
  return [];
}

export async function fetchIcnfBurntAreas(_opts: FetchOptions = {}): Promise<Fire[]> {
  return [];
}

export async function fetchJcylFires(_opts: FetchOptions = {}): Promise<Fire[]> {
  return [];
}

export async function fetchCatalunyaFires(_opts: FetchOptions = {}): Promise<Fire[]> {
  return [];
}
