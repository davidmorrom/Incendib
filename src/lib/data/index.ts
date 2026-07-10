/**
 * Punto de entrada de datos. En modo "mock" (por defecto) devuelve datos de
 * demostración; en modo "live" agregará y deduplicará las fuentes reales.
 *
 * La agregación live vive en el servidor (API routes) para cachear FIRMS y no
 * agotar su rate limit (5000 tx / 10 min) — ver docs/DATA-SOURCES.md §Recommendations.
 */

import type { Fire, SourceStatus } from '@/types/fire';
import { MOCK_FIRES, MOCK_SOURCE_STATUS } from './mock';

export type DataMode = 'mock' | 'live';

export function getDataMode(): DataMode {
  return process.env.NEXT_PUBLIC_DATA_MODE === 'live' ? 'live' : 'mock';
}

/** Devuelve los incendios agregados. TODO(fase-2): rama "live". */
export async function getFires(): Promise<Fire[]> {
  if (getDataMode() === 'live') {
    // TODO: agregar adaptadores (./adapters) + dedup + normalización.
    return MOCK_FIRES;
  }
  return MOCK_FIRES;
}

export async function getFire(slug: string): Promise<Fire | null> {
  const fires = await getFires();
  return fires.find((f) => f.slug === slug) ?? null;
}

export async function getSourceStatus(): Promise<SourceStatus[]> {
  return MOCK_SOURCE_STATUS;
}

export { MOCK_FIRES, MOCK_SOURCE_STATUS };
