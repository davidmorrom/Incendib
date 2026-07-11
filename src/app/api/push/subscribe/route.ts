import { NextResponse } from 'next/server';
import type { PushSubscription } from 'web-push';
import { saveSubscription, deleteSubscription, type AlertPrefs } from '@/lib/push/store';

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
    if (!sub?.endpoint) {
      return NextResponse.json({ ok: false, error: 'suscripción no válida' }, { status: 400 });
    }
    const prefs: AlertPrefs = {
      minLevel: Number(body.prefs?.minLevel ?? 2),
      radiusKm: Number(body.prefs?.radiusKm ?? 30),
      silence: Boolean(body.prefs?.silence ?? false),
      zone: body.prefs?.zone ?? null,
    };
    await saveSubscription({ subscription: sub, prefs, createdAt: Date.now() });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
