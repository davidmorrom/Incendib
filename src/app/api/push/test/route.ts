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
    const { subscription, locale } = (await req.json()) as {
      subscription?: PushSubscription;
      locale?: 'es' | 'pt' | 'en';
    };
    // No enviar a destinos no https o internos/reservados (anti-SSRF y anti-abuso
    // de relay: el servidor no debe firmar push hacia direcciones arbitrarias).
    if (!subscription?.endpoint || !isSafePushEndpoint(subscription.endpoint)) {
      return NextResponse.json({ ok: false, error: 'suscripción no válida' }, { status: 400 });
    }
    const TEXT = {
      es: { title: 'Incendib — notificación de prueba', body: 'Las alertas están activas en este dispositivo.' },
      pt: { title: 'Incendib — notificação de teste', body: 'Os alertas estão ativos neste dispositivo.' },
      en: { title: 'Incendib — test notification', body: 'Alerts are active on this device.' },
    } as const;
    const t = TEXT[locale ?? 'es'] ?? TEXT.es;
    const res = await sendPush(subscription, { title: t.title, body: t.body, url: '/alertas', tag: 'incendib-test' });
    return NextResponse.json(res, { status: res.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
