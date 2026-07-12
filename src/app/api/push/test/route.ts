import { NextResponse } from 'next/server';
import type { PushSubscription } from 'web-push';
import { sendPush, pushConfigured } from '@/lib/push/server';
import { isSafePushEndpoint } from '@/lib/push/validate';
import { allowRequest, clientIp } from '@/lib/push/ratelimit';

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
    if (Number(req.headers.get('content-length') ?? 0) > 10_000) {
      return NextResponse.json({ ok: false, error: 'cuerpo demasiado grande' }, { status: 413 });
    }
    // Rate-limit estricto: este endpoint firma y envía push (fail-open sin almacén).
    if (!(await allowRequest(clientIp(req), { bucket: 'test', limit: 10, windowSec: 60 }))) {
      return NextResponse.json({ ok: false, error: 'demasiadas peticiones' }, { status: 429 });
    }
    const { subscription } = (await req.json()) as { subscription?: PushSubscription };
    // No enviar a destinos no https o internos/reservados (anti-SSRF y anti-abuso
    // de relay: el servidor no debe firmar push hacia direcciones arbitrarias).
    if (!subscription?.endpoint || !isSafePushEndpoint(subscription.endpoint)) {
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
