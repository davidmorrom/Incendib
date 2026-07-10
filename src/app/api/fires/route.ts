import { NextResponse } from 'next/server';
import { getFires } from '@/lib/data';

/**
 * GET /api/fires — incendios agregados y normalizados.
 *
 * En modo mock devuelve datos de demostración. En modo live este endpoint es
 * el que cachea FIRMS/EFFIS en el servidor para respetar el rate limit de
 * NASA (5000 tx / 10 min) — ver docs/DATA-SOURCES.md §Recommendations.
 */
export const revalidate = 300; // ISR: revalidar cada 5 min

export async function GET() {
  const fires = await getFires();
  return NextResponse.json(
    { fires, updatedAt: new Date().toISOString() },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  );
}
