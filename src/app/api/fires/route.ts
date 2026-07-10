import { NextResponse } from 'next/server';
import { getFires, getHotspots } from '@/lib/data';

/**
 * GET /api/fires — incendios y focos satelitales agregados y normalizados.
 *
 * En modo mock devuelve datos de demostración. En modo live este endpoint
 * cachea FIRMS en el servidor para respetar el rate limit de NASA
 * (5000 tx / 10 min) — ver docs/DATA-SOURCES.md §Recommendations. Los focos son
 * detección satelital, NO incendios confirmados.
 */
export const revalidate = 300; // ISR: revalidar cada 5 min

export async function GET() {
  const [fires, hotspots] = await Promise.all([getFires(), getHotspots()]);
  return NextResponse.json(
    { fires, hotspots, updatedAt: new Date().toISOString() },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  );
}
