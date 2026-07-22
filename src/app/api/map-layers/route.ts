import { NextResponse } from 'next/server';
import { getHotspots, getBurnedAreas } from '@/lib/data';

/**
 * GET /api/map-layers — capas satelitales del mapa (focos FIRMS + perímetros
 * EFFIS de áreas quemadas).
 *
 * Estas capas solo las consume el mapa (componente client-only, ssr:false) y NO
 * son necesarias para el primer paint de la home, así que NO viajan en el
 * HTML/SSR: el mapa las pide aquí al montar. Así el HTML de la home no arrastra
 * el payload RSC de ~1000+ focos + polígonos (ver MapCanvasClient).
 *
 * Cacheado en el servidor (ISR 5 min) igual que /api/fires, para respetar el
 * rate limit de NASA FIRMS. No lee la petición (query/headers) a propósito: eso
 * lo volvería dinámico y desactivaría el cacheo. Los focos son detección
 * satelital, NO incendios confirmados.
 */
export const revalidate = 300; // ISR: revalidar cada 5 min

export async function GET() {
  const [hotspots, burnedAreas] = await Promise.all([getHotspots(), getBurnedAreas()]);
  return NextResponse.json(
    { hotspots, burnedAreas, updatedAt: new Date().toISOString() },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  );
}
