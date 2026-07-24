/**
 * Memoria del crecimiento del perímetro por focos FIRMS (Upstash Redis).
 *
 * `deriveFirmsPerimeters` recalcula el cúmulo de focos en CADA consulta a partir
 * de la ventana viva de FIRMS (2 días): si el frente se enfría (menos focos
 * térmicos activos, p. ej. un incendio ya perimetrado/controlado), el cúmulo de
 * ESA ronda encogería aunque la cicatriz real siga ahí. Para que el perímetro
 * dibujado NUNCA retroceda, aquí se guardan los puntos de foco acumulados de
 * cada incendio (todas las rondas, no solo la ventana viva) y el último anillo/
 * superficie mostrados, así `deriveFirmsPerimeters` siempre parte de «lo ya
 * visto» además de los focos de ahora.
 *
 * Reutiliza el mismo Redis que las alertas/histórico. Sin credenciales, todo es
 * no-op (el perímetro se comporta como una pasada sin memoria, igual que antes).
 *
 * OJO de arquitectura: la ESCRITURA nunca debe hacerse desde el camino de
 * render de una página (`getFires`) — un `fetch`/I/O sin caché ahí convierte la
 * ruta en dinámica (pierde ISR: `/`, `/informe`, `/fuentes`... pasarían de
 * servirse desde caché a ejecutar la función en cada visita). Por eso la
 * LECTURA usada por `getFires` va envuelta en `unstable_cache`
 * (`readFirmsGrowthCached`, mismo patrón que `getOverridesCached`) y la
 * ESCRITURA solo la dispara el cron de alertas (`getFiresAndPersistFirmsGrowth`
 * en `data/index.ts`), que ya es una ruta dinámica de por sí.
 */

import { Redis } from '@upstash/redis';
import { unstable_cache } from 'next/cache';
import type { FirmsGrowthEntry } from './adapters';

const KEY = 'firms:growth'; // slug -> StoredFirmsGrowthEntry
/** Vida máxima de una entrada sin refrescar: más que cualquier incendio real
 * (semanas), para no acumular memoria de fuegos ya extinguidos hace tiempo. */
const MAX_AGE_MS = 45 * 24 * 3600 * 1000;

/** `FirmsGrowthEntry` (cómputo puro, sin reloj) + el sello de refresco que solo
 * le hace falta a la capa de persistencia (para expirar entradas viejas). */
export interface StoredFirmsGrowthEntry extends FirmsGrowthEntry {
  /** Epoch ms de la última actualización. */
  updatedAt: number;
}

export type StoredFirmsGrowthState = Record<string, StoredFirmsGrowthEntry>;

let client: Redis | null | undefined;
function redis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

/** Estado acumulado de todos los incendios, descartando entradas caducadas.
 * `{}` si no hay Redis o falla la lectura. Nunca lanza. Se puede pasar
 * directamente como `previous` a `deriveFirmsPerimeters` (superconjunto de
 * `FirmsGrowthState`, con `updatedAt` de más). */
export async function readFirmsGrowth(now: number = Date.now()): Promise<StoredFirmsGrowthState> {
  const r = redis();
  if (!r) return {};
  try {
    const state = (await r.get<StoredFirmsGrowthState>(KEY)) ?? {};
    const fresh: StoredFirmsGrowthState = {};
    for (const [slug, entry] of Object.entries(state)) {
      if (now - entry.updatedAt <= MAX_AGE_MS) fresh[slug] = entry;
    }
    return fresh;
  } catch {
    return {};
  }
}

/** Persiste el estado acumulado. Best-effort: un fallo aquí no debe romper el
 * cron (el peor caso es perder el crecimiento acumulado de esta ronda, no la
 * ejecución de las alertas). Nunca lanza. Llamar SOLO desde una ruta ya
 * dinámica (nunca desde `getFires`, ver nota de arquitectura arriba). */
export async function writeFirmsGrowth(state: StoredFirmsGrowthState): Promise<void> {
  const r = redis();
  if (!r) return;
  try {
    await r.set(KEY, state);
  } catch {
    /* no-op */
  }
}

/** Lectura cacheada para el camino de render de página (`getFires`): compatible
 * con páginas estáticas/ISR (mismo patrón que `getOverridesCached`). Se
 * refresca sola cada 5 min, igual que la caché de FIRMS. */
export const readFirmsGrowthCached = unstable_cache(async () => readFirmsGrowth(), ['firms-growth-state'], {
  revalidate: 300,
});
