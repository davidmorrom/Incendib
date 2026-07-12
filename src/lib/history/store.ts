/**
 * Histórico de cambios por incendio (Upstash Redis). Las APIs oficiales solo dan
 * una FOTO del estado + un par de fechas hito; no publican "bajó a nivel 1 a las
 * 18:00" ni "se reforzaron los medios". Aquí lo derivamos nosotros: en cada
 * pasada del cron fotografiamos el estado y, al detectar un cambio, registramos
 * un evento con la hora de DETECCIÓN (aproximada a la frecuencia del cron). Los
 * eventos se muestran en el timeline de la ficha junto a los hitos oficiales.
 *
 * Reutiliza el mismo Redis que las alertas (activo solo si hay credenciales).
 * Sin Redis, todo es no-op (el timeline mantiene solo los hitos oficiales).
 */

import { Redis } from '@upstash/redis';
import type { Fire, TimelineEntry } from '@/types/fire';

const SNAP_KEY = 'hist:snap'; // map slug → FireSnap (última foto)
const EV_PREFIX = 'hist:ev:'; // por incendio: lista de eventos (JSON)
const MAX_EVENTS = 15;
const TTL_S = 21 * 24 * 3600; // 21 días

let client: Redis | null | undefined;
function redis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

export interface FireSnap {
  state: string;
  level: number | null;
  aerial: number;
  ground: number;
  personnel: number;
}

export function snapOf(f: Fire): FireSnap {
  return {
    state: f.state,
    level: f.level,
    aerial: f.resources?.aerial ?? 0,
    ground: f.resources?.ground ?? 0,
    personnel: f.resources?.personnel ?? 0,
  };
}

/**
 * Eventos derivados de comparar la foto anterior con la actual. Solo lo que las
 * APIs NO dan como evento fechado: cambios de nivel (sube/baja) y de medios
 * (refuerzo/retirada). Los cambios de estado (estabilizado/controlado) ya vienen
 * con fecha oficial de la fuente, así que no se duplican aquí. Función pura.
 */
export function fireChangeEvents(prev: FireSnap, cur: FireSnap, atIso: string): TimelineEntry[] {
  const evs: TimelineEntry[] = [];
  if (prev.level != null && cur.level != null && cur.level !== prev.level) {
    evs.push({
      at: atIso,
      label: cur.level > prev.level ? `Sube a nivel ${cur.level}` : `Baja a nivel ${cur.level}`,
    });
  }
  const dA = cur.aerial - prev.aerial;
  const dG = cur.ground - prev.ground;
  const dP = cur.personnel - prev.personnel;
  if (dA > 0 || dG > 0 || dP > 0) {
    const parts: string[] = [];
    if (dA > 0) parts.push(`+${dA} aéreos`);
    if (dG > 0) parts.push(`+${dG} terrestres`);
    if (dP > 0) parts.push(`+${dP} efectivos`);
    evs.push({ at: atIso, label: `Refuerzo de medios (${parts.join(', ')})` });
  } else if (dA < 0 || dG < 0 || dP < 0) {
    evs.push({ at: atIso, label: 'Retirada de medios' });
  }
  return evs;
}

/**
 * Fotografía los incendios y registra los cambios detectados respecto a la
 * última pasada. Pensado para llamarse desde el cron. No lanza.
 */
export async function recordFireHistory(fires: Fire[], atIso: string): Promise<void> {
  const r = redis();
  if (!r) return;
  try {
    const prevSnap = (await r.get<Record<string, FireSnap>>(SNAP_KEY)) ?? {};
    const nextSnap: Record<string, FireSnap> = {};
    for (const f of fires) {
      const cur = snapOf(f);
      nextSnap[f.slug] = cur;
      const prev = prevSnap[f.slug];
      if (!prev) continue; // primera vez: sin eventos (la declaración es oficial)
      const evs = fireChangeEvents(prev, cur, atIso);
      if (!evs.length) continue;
      const key = `${EV_PREFIX}${f.slug}`;
      const existing = (await r.get<TimelineEntry[]>(key)) ?? [];
      await r.set(key, [...existing, ...evs].slice(-MAX_EVENTS), { ex: TTL_S });
    }
    await r.set(SNAP_KEY, nextSnap);
  } catch {
    /* el histórico nunca debe romper el cron ni la ficha */
  }
}

/** Eventos registrados de un incendio (para el timeline de la ficha). [] si no hay. */
export async function getFireEvents(slug: string): Promise<TimelineEntry[]> {
  const r = redis();
  if (!r) return [];
  try {
    return (await r.get<TimelineEntry[]>(`${EV_PREFIX}${slug}`)) ?? [];
  } catch {
    return [];
  }
}
