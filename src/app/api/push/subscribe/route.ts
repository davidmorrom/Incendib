import { NextResponse } from 'next/server';
import type { PushSubscription } from 'web-push';
import { saveSubscription, deleteSubscription, getSubscription } from '@/lib/push/store';
import { mergePrefsForStorage, type AlertPrefs } from '@/lib/alerts/prefs';
import { isSafePushEndpoint } from '@/lib/push/validate';
import { allowRequest, clientIp } from '@/lib/push/ratelimit';

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
    // Rate-limit por IP (fail-open si no hay almacén).
    if (!(await allowRequest(clientIp(req), { bucket: 'subscribe', limit: 30, windowSec: 60 }))) {
      return NextResponse.json({ ok: false, error: 'demasiadas peticiones' }, { status: 429 });
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
    // Exige las claves de cifrado del Push API (p256dh ~65 B, auth 16 B en base64url):
    // sin ellas `web-push` no puede firmar y solo guardaríamos basura.
    const keys = (sub as { keys?: { p256dh?: unknown; auth?: unknown } }).keys;
    const b64 = (v: unknown, min: number, max: number) =>
      typeof v === 'string' && /^[A-Za-z0-9_-]+$/.test(v) && v.length >= min && v.length <= max;
    if (!keys || !b64(keys.p256dh, 80, 100) || !b64(keys.auth, 16, 32)) {
      return NextResponse.json({ ok: false, error: 'suscripción no válida' }, { status: 400 });
    }
    // Fusiona contra lo guardado: un cliente cacheado antiguo (forma v1) no debe
    // borrar en silencio la configuración v2 (zonas/tipos/silencio) del usuario.
    const existing = await getSubscription(sub.endpoint);
    const prefs: AlertPrefs = mergePrefsForStorage(body.prefs, existing?.prefs ?? null);
    await saveSubscription({ subscription: sub, prefs, createdAt: existing?.createdAt ?? Date.now() });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
