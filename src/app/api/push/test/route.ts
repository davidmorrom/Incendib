import { NextResponse } from 'next/server';
import type { PushSubscription } from 'web-push';
import { sendPush, pushConfigured } from '@/lib/push/server';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

/**
 * POST /api/push/test — envía una notificación de prueba a la suscripción dada.
 * Sirve para que el usuario confirme que las alertas llegan a su dispositivo.
 */
export async function POST(req: Request) {
  if (!pushConfigured()) {
    return NextResponse.json({ ok: false, error: 'push no configurado' }, { status: 503 });
  }
  try {
    const { subscription } = (await req.json()) as { subscription?: PushSubscription };
    if (!subscription?.endpoint) {
      return NextResponse.json({ ok: false, error: 'suscripción no válida' }, { status: 400 });
    }
    const res = await sendPush(subscription, {
      title: 'Incendib — notificación de prueba',
      body: 'Las alertas están activas en este dispositivo.',
      url: '/alertas',
      tag: 'incendib-test',
    });
    return NextResponse.json(res, { status: res.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
