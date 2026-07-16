'use client';

/**
 * Persistencia y sincronización de las preferencias de alerta en cliente.
 *
 * La **fuente de verdad en el dispositivo** es `localStorage` (clave
 * `incendib-alerts`), como en la versión anterior; así el panel «detecta lo
 * activado» sin exponer un endpoint que devuelva la ubicación del usuario. Si hay
 * una suscripción Web Push activa, las prefs se replican al servidor (que las
 * usa el cron). Sin suscripción, el panel es editable igualmente y solo se guarda
 * en local hasta que se activen las notificaciones.
 */

import { getExistingSubscription } from '@/lib/push/client';
import { normalizePrefs, DEFAULT_PREFS, type AlertPrefs } from './prefs';

export const PREFS_KEY = 'incendib-alerts';

/** Carga y normaliza las prefs locales (migra la forma v1 si existía). */
export function loadPrefs(): AlertPrefs {
  if (typeof localStorage === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? normalizePrefs(JSON.parse(raw)) : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefsLocal(prefs: AlertPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* noop */
  }
}

/** Envía las prefs al servidor si hay suscripción activa (no-op en caso contrario). */
export async function syncPrefsToServer(prefs: AlertPrefs): Promise<void> {
  try {
    const sub = await getExistingSubscription();
    if (!sub) return;
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), prefs }),
    });
  } catch {
    /* noop */
  }
}

/**
 * Actualiza la lista de incendios seguidos dentro de las prefs y sincroniza.
 * Se llama desde la ficha (`/f/[slug]`) al seguir/dejar de seguir, de modo que
 * las alertas «de incendios que sigo» llegan aunque el usuario no visite Alertas.
 */
export async function syncFollowedToServer(slugs: string[]): Promise<void> {
  const prefs: AlertPrefs = { ...loadPrefs(), followedSlugs: slugs.slice(0, 200) };
  savePrefsLocal(prefs);
  await syncPrefsToServer(prefs);
}

/** Zona horaria IANA del navegador (para evaluar el horario de silencio en servidor). */
export function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}
