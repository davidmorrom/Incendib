import { NextResponse } from 'next/server';
import { buildBoletin } from '@/lib/boletin/aggregate';
import { latestBoletin } from '@/lib/boletin/store';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';
export const dynamic = 'force-dynamic';

/**
 * GET /api/boletin/generar — construye la edición de la última semana ISO
 * cerrada a partir del dato en vivo y la devuelve como JSON. En F1 el resultado
 * se versiona a mano en `src/content/boletines/{id}.json`; en F2 un Vercel Cron
 * (lunes) lo persistirá automáticamente. Protegido con CRON_SECRET si existe.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'no autorizado' }, { status: 401 });
  }
  const prev = latestBoletin()?.kpi;
  const boletin = await buildBoletin(new Date(), prev);
  return NextResponse.json(boletin);
}
