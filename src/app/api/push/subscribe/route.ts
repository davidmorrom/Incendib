import { NextResponse } from 'next/server';
import type { PushSubscription } from 'web-push';
import { saveSubscription, deleteSubscription, type AlertPrefs } from '@/lib/push/store';
import { isSafePushEndpoint, clampPrefs } from '@/lib/push/validate';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1'; // datos personales tratados en la UE

/**
 * POST /api/push/subscribe — registra (o elimina) una suscripción Web Push.
 *  - { subscription, prefs } → guarda la suscripción y sus preferencias.
 *  - { remove: true, endpoint } → la elimina (baja).
 * Si no hay almacén configurado (Upstash), valida y confirma sin persistir.
 */
export async function POST(req: Request) {
  try {
    // Rechaza cuerpos anómalamente grandes pronto (una suscripción ronda 1 KB).
    if (Number(req.headers.get('content-length') ?? 0) > 10_000) {
      return NextResponse.json({ ok: false, error: 'cuerpo demasiado grande' }, { status: 413 });
    }
    const body = (await req.json()) as {
      subscription?: PushSubscription;
      prefs?: Partial<AlertPrefs>;
      remove?: boolean;
      endpoint?: string;
    };

    if (body.remove) {
      const endpoint = body.endpoint ?? body.subscription?.endpoint;
      if (endpoint) await deleteSubscription(endpoint);
      return NextResponse.json({ ok: true });
    }

    const sub = body.subscription;
    // Rechaza endpoints no https o hacia destinos internos/reservados (anti-SSRF):
    // este endpoint se consultará luego desde el cron con nuestras claves VAPID.
    if (!sub?.endpoint || !isSafePushEndpoint(sub.endpoint)) {
      return NextResponse.json({ ok: false, error: 'suscripción no válida' }, { status: 400 });
    }
    const prefs: AlertPrefs = clampPrefs(body.prefs);
    await saveSubscription({ subscription: sub, prefs, createdAt: Date.now() });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
