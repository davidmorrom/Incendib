'use client';

/**
 * Utilidades de Web Push en cliente: soporte, permiso y suscripción con la clave
 * VAPID pública. La suscripción se envía al backend (`/api/push/subscribe`); el
 * envío real de notificaciones lo hace el servidor con `web-push`.
 */

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export type PermissionState = NotificationPermission | 'unsupported';

export function notificationPermission(): PermissionState {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** Espera al SW activo con un tope, para no colgarse si no hay SW (p. ej. dev). */
async function readyRegistration(timeoutMs = 4000): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  const reg = await readyRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

/** Pide permiso (si hace falta) y devuelve la suscripción, o null si se deniega. */
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!pushSupported() || !vapidPublicKey) return null;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return null;
  const reg = await readyRegistration();
  if (!reg) return null;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  });
}

export async function unsubscribeFromPush(): Promise<void> {
  const sub = await getExistingSubscription();
  if (sub) await sub.unsubscribe();
}
