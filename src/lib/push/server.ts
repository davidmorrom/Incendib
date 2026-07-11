import webpush from 'web-push';

/**
 * Envío de Web Push desde el servidor con las claves VAPID. La clave pública es
 * NEXT_PUBLIC_ (se comparte con el cliente); la privada es de servidor.
 */
let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:contacto@incendib.es';
  if (!pub || !priv) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export function pushConfigured(): boolean {
  return ensureConfigured();
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  severity?: 'info' | 'evacuation';
}

/** Envía una notificación a una suscripción. Nunca lanza. */
export async function sendPush(
  subscription: webpush.PushSubscription,
  payload: PushPayload,
): Promise<{ ok: boolean; status?: number }> {
  if (!ensureConfigured()) return { ok: false };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (e) {
    return { ok: false, status: (e as { statusCode?: number }).statusCode };
  }
}
