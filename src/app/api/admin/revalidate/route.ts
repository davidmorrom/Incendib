import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { BANNER_TAG, STATE_TAG } from '@/lib/overrides/store';

/**
 * Invalida la caché de los overrides del panel (banner y estado) cuando este los
 * cambia: el layout lee el banner y `getFires()` lee el estado con `unstable_cache`
 * (tags `BANNER_TAG`/`STATE_TAG`); invalidar el tag regenera las páginas que lo
 * consumieron, sin esperar al TTL de 5 min. Protegido por Bearer `PANEL_TOKEN`,
 * fail-CLOSED: sin token, 503. Ver `Incendib-Panel/docs/INTEGRACION-INCENDIB.md`.
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
  revalidateTag(STATE_TAG);
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
