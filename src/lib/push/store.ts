import { Redis } from '@upstash/redis';
import type { PushSubscription } from 'web-push';
import { normalizePrefs, type AlertPrefs } from '@/lib/alerts/prefs';

/**
 * Almacén de suscripciones Web Push en Upstash Redis (REST). Se activa solo si
 * hay credenciales (UPSTASH_REDIS_REST_URL/TOKEN o KV_REST_API_URL/TOKEN). Sin
 * ellas, todo es no-op y las alertas automáticas quedan inactivas (sin romper
 * nada). Privacy-first: solo guardamos la suscripción y preferencias mínimas.
 *
 * Las preferencias (`AlertPrefs`) viven en `@/lib/alerts/prefs`. Los suscriptores
 * antiguos guardaron prefs en la forma v1; `listSubscriptions`/`getSubscription`
 * las **normalizan al leer** (migración v1→v2 idempotente) para que el matcher del
 * cron nunca lea una forma vieja (que le haría lanzar o degradar en silencio).
 */

export type { AlertPrefs };

export interface StoredSub {
  subscription: PushSubscription;
  prefs: AlertPrefs;
  createdAt: number;
}

const SUBS_KEY = 'push:subs'; // hash: endpoint → StoredSub
const SEEN_KEY = 'push:lastseen'; // string: { [slug]: signature }
const HOTSPOT_SEEN_KEY = 'push:hotspot-seen'; // string: { [cellId]: lastSentMs }
/** Tope de suscripciones (backstop anti-abuso; no una cuota real esperada). */
const MAX_SUBS = 20_000;

let client: Redis | null | undefined;
function redis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

export function storeConfigured(): boolean {
  return redis() !== null;
}

export async function saveSubscription(sub: StoredSub): Promise<boolean> {
  const r = redis();
  if (!r) return false;
  try {
    // Backstop: si es un endpoint NUEVO y ya se alcanzó el tope, no lo añadimos
    // (las actualizaciones de un endpoint existente sí pasan siempre).
    const exists = await r.hexists(SUBS_KEY, sub.subscription.endpoint);
    if (!exists && (await r.hlen(SUBS_KEY)) >= MAX_SUBS) return false;
    await r.hset(SUBS_KEY, { [sub.subscription.endpoint]: sub });
    return true;
  } catch {
    return false;
  }
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  const r = redis();
  if (!r) return;
  try {
    await r.hdel(SUBS_KEY, endpoint);
  } catch {
    /* noop */
  }
}

/** Suscripción almacenada para un endpoint, con prefs ya normalizadas a v2. */
export async function getSubscription(endpoint: string): Promise<StoredSub | null> {
  const r = redis();
  if (!r) return null;
  try {
    const s = await r.hget<StoredSub>(SUBS_KEY, endpoint);
    if (!s || !s.subscription?.endpoint) return null;
    return { ...s, prefs: normalizePrefs(s.prefs) };
  } catch {
    return null;
  }
}

export async function listSubscriptions(): Promise<StoredSub[]> {
  const r = redis();
  if (!r) return [];
  try {
    const all = await r.hgetall<Record<string, StoredSub>>(SUBS_KEY);
    if (!all) return [];
    // Migración en LECTURA: normaliza cada prefs a v2 (los subs v1 tienen `zone`
    // singular y `types` ausente; el matcher espera la forma v2).
    return Object.values(all)
      .filter((s) => s && s.subscription?.endpoint)
      .map((s) => ({ ...s, prefs: normalizePrefs(s.prefs) }));
  } catch {
    return [];
  }
}

export async function getLastSeen(): Promise<Record<string, string>> {
  const r = redis();
  if (!r) return {};
  try {
    return (await r.get<Record<string, string>>(SEEN_KEY)) ?? {};
  } catch {
    return {};
  }
}

export async function setLastSeen(map: Record<string, string>): Promise<void> {
  const r = redis();
  if (!r) return;
  try {
    await r.set(SEEN_KEY, map);
  } catch {
    /* noop */
  }
}

/** Celdas de foco satelital ya avisadas → epoch ms del último aviso (para cooldown). */
export async function getHotspotSeen(): Promise<Record<string, number>> {
  const r = redis();
  if (!r) return {};
  try {
    return (await r.get<Record<string, number>>(HOTSPOT_SEEN_KEY)) ?? {};
  } catch {
    return {};
  }
}

export async function setHotspotSeen(map: Record<string, number>): Promise<void> {
  const r = redis();
  if (!r) return;
  try {
    await r.set(HOTSPOT_SEEN_KEY, map);
  } catch {
    /* noop */
  }
}
