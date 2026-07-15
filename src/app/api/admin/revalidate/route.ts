import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { BANNER_TAG } from '@/lib/overrides/store';

/**
 * Invalida la caché del banner global cuando el panel privado lo cambia (el layout lo
 * lee con `unstable_cache` tag `BANNER_TAG`; sin esto tardaría hasta el TTL de 5 min).
 * Protegido por Bearer `PANEL_TOKEN`, fail-CLOSED: sin token configurado, 503. Ver
 * `Incendib-Panel/docs/INTEGRACION-INCENDIB.md` (Cambio 3).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const token = process.env.PANEL_TOKEN;
  if (!token) return NextResponse.json({ error: 'no configurado' }, { status: 503 });
  if (req.headers.get('authorization') !== `Bearer ${token}`) {
    return NextResponse.json({ error: 'no autorizado' }, { status: 401 });
  }
  revalidateTag(BANNER_TAG);
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
