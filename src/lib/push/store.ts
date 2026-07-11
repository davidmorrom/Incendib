import { Redis } from '@upstash/redis';
import type { PushSubscription } from 'web-push';

/**
 * Almacén de suscripciones Web Push en Upstash Redis (REST). Se activa solo si
 * hay credenciales (UPSTASH_REDIS_REST_URL/TOKEN o KV_REST_API_URL/TOKEN). Sin
 * ellas, todo es no-op y las alertas automáticas quedan inactivas (sin romper
 * nada). Privacy-first: solo guardamos la suscripción y preferencias mínimas.
 */

export interface AlertPrefs {
  minLevel: number;
  radiusKm: number;
  silence: boolean;
  zone: { lat: number; lon: number } | null;
}
export interface StoredSub {
  subscription: PushSubscription;
  prefs: AlertPrefs;
  createdAt: number;
}

const SUBS_KEY = 'push:subs'; // hash: endpoint → StoredSub
const SEEN_KEY = 'push:lastseen'; // string: { [slug]: signature }

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

export async function listSubscriptions(): Promise<StoredSub[]> {
  const r = redis();
  if (!r) return [];
  try {
    const all = await r.hgetall<Record<string, StoredSub>>(SUBS_KEY);
    return all ? Object.values(all).filter((s) => s && s.subscription?.endpoint) : [];
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
