import { Redis } from '@upstash/redis';

/**
 * Rate-limiting por IP con ventana fija en Redis (Upstash REST). Reutiliza el
 * mismo almacén que las suscripciones. Diseño **fail-open**: si no hay almacén
 * configurado o Redis falla, se permite la petición (nunca rompe el servicio;
 * solo añade protección cuando el almacén está disponible).
 */

let client: Redis | null | undefined;
function redis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

/** IP del cliente a partir de las cabeceras de proxy (Vercel). */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim() || 'unknown';
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * ¿Se permite esta petición? Cuenta peticiones por IP en una ventana fija.
 * @returns `true` si se permite (incluye el caso sin almacén: fail-open).
 */
export async function allowRequest(
  ip: string,
  opts?: { limit?: number; windowSec?: number; bucket?: string },
): Promise<boolean> {
  const r = redis();
  if (!r) return true; // sin almacén → no se limita
  const limit = opts?.limit ?? 20;
  const windowSec = opts?.windowSec ?? 60;
  const bucket = opts?.bucket ?? 'push';
  try {
    const slot = Math.floor(Date.now() / 1000 / windowSec);
    const key = `rl:${bucket}:${ip}:${slot}`;
    const n = await r.incr(key);
    if (n === 1) await r.expire(key, windowSec);
    return n <= limit;
  } catch {
    return true; // fail-open ante cualquier error de Redis
  }
}
