import { NextResponse } from 'next/server';
import {
  getFires,
  getHotspots,
  getBurnedAreas,
  getSourceStatus,
  countHotspots24h,
  getDataMode,
} from '@/lib/data';

/**
 * Salud del visor para la «sala de situación» del panel privado. Reutiliza
 * `getSourceStatus()` (ok/degraded/down + lastUpdate por fuente) y añade recuentos y
 * un chequeo de presencia de variables de entorno (nunca sus valores). Protegido por
 * Bearer `PANEL_TOKEN` (fail-closed: sin token configurado, 401). Ver
 * `Incendib-Panel/docs/INTEGRACION-INCENDIB.md` (Cambio 4).
 */
export const runtime = 'nodejs';
export const preferredRegion = 'fra1';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const token = process.env.PANEL_TOKEN;
  if (!token || req.headers.get('authorization') !== `Bearer ${token}`) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
  }

  const [fires, hotspots, burned, sources] = await Promise.all([
    getFires(),
    getHotspots(),
    getBurnedAreas(),
    getSourceStatus(),
  ]);

  return NextResponse.json(
    {
      ts: new Date().toISOString(),
      dataMode: getDataMode(),
      version: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      counts: {
        fires: fires.length,
        hotspots24h: countHotspots24h(hotspots, Date.now()),
        burned: burned.length,
      },
      sources, // ok/degraded/down + lastUpdate por fuente, tal cual
      env: {
        // solo presencia, nunca el valor
        firmsKey: !!process.env.FIRMS_MAP_KEY,
        upstash: !!(process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL),
        cronSecret: !!process.env.CRON_SECRET,
        panelToken: !!process.env.PANEL_TOKEN,
        vapid: !!process.env.VAPID_PRIVATE_KEY,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
