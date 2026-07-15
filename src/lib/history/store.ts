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
// Archivo del Fire completo por incendio: última foto conocida, para que la ficha
// /f/[slug] sobreviva a la extinción (cuando el incendio sale del feed en vivo).
const ARCHIVE_PREFIX = 'hist:fire:';
const ARCHIVE_TTL_S = 365 * 24 * 3600; // 1 año desde el último cambio (un incendio nunca dura tanto)

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
  /** Superficie: parte de la firma de cambio para refrescar el archivo cuando crece. */
  hectares: number;
}

export function snapOf(f: Fire): FireSnap {
  return {
    state: f.state,
    level: f.level,
    aerial: f.resources?.aerial ?? 0,
    ground: f.resources?.ground ?? 0,
    personnel: f.resources?.personnel ?? 0,
    hectares: f.hectares ?? 0,
  };
}

/** Cambió algo relevante entre dos fotos (estado, nivel, medios o superficie).
 * Gobierna cuándo se reescribe el archivo del incendio: solo ante un cambio real,
 * no en cada pasada del cron (acota la cuota de comandos de Upstash). */
function snapChanged(a: FireSnap, b: FireSnap): boolean {
  return (
    a.state !== b.state ||
    a.level !== b.level ||
    a.aerial !== b.aerial ||
    a.ground !== b.ground ||
    a.personnel !== b.personnel ||
    a.hectares !== b.hectares
  );
}

/** Fire para el archivo: sin las señales de «ahora» (meteo, confirmación satelital,
 * delta 24 h) y con el timeline capado. Es la última foto conocida de la ficha. */
function slimForArchive(f: Fire): Fire {
  return {
    slug: f.slug,
    name: f.name,
    municipality: f.municipality,
    province: f.province,
    region: f.region,
    country: f.country,
    ptState: f.ptState,
    state: f.state,
    level: f.level,
    type: f.type,
    hectares: f.hectares,
    hectaresApprox: f.hectaresApprox,
    coordinates: f.coordinates,
    startedAt: f.startedAt,
    updatedAt: f.updatedAt,
    resources: f.resources,
    evacuation: f.evacuation,
    sources: f.sources,
    timeline: f.timeline?.slice(-20),
    fwi: f.fwi,
    perimeter: f.perimeter,
    // omitidos a propósito: weather, satelliteConfirmed, hotspotKm, delta24h (señales de «ahora»)
  };
}

/**
 * Eventos derivados de comparar la foto anterior con la actual. Solo lo que las
 * APIs NO dan como evento fechado: cambios de nivel (sube/baja) y de medios
 * (refuerzo/retirada). Los cambios de estado (estabilizado/controlado) ya vienen
 * con fecha oficial de la fuente, así que no se duplican aquí. Función pura.
 */
// Umbrales por dimensión para NO registrar el vaivén normal de medios entre
// pasadas del cron (los efectivos entran y salen constantemente). Solo se anota
// una escalada apreciable ("se despliegan más medios"). Las RETIRADAS no se
// registran: son ruido y la desescalada ya la marca el estado oficial
// (estabilizado/controlado) con su hora.
const SIG_AERIAL = 3;
const SIG_GROUND = 5;
const SIG_PERSONNEL = 25;

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
  const parts: string[] = [];
  if (dA >= SIG_AERIAL) parts.push(`+${dA} aéreos`);
  if (dG >= SIG_GROUND) parts.push(`+${dG} terrestres`);
  if (dP >= SIG_PERSONNEL) parts.push(`+${dP} efectivos`);
  if (parts.length) evs.push({ at: atIso, label: `Refuerzo de medios (${parts.join(', ')})` });
  return evs;
}

/**
 * Fotografía los incendios y registra los cambios detectados respecto a la
 * última pasada. Además, archiva el Fire completo (hist:fire:<slug>) la primera
 * vez que se ve y cuando cambia algo relevante, para que la ficha sobreviva a la
 * extinción. Pensado para llamarse desde el cron. No lanza.
 */
export async function recordFireHistory(fires: Fire[], atIso: string): Promise<void> {
  const r = redis();
  if (!r) return;
  try {
    const prevSnap = (await r.get<Record<string, FireSnap>>(SNAP_KEY)) ?? {};
    const nextSnap: Record<string, FireSnap> = {};
    const toArchive: Fire[] = [];
    for (const f of fires) {
      const cur = snapOf(f);
      nextSnap[f.slug] = cur;
      const prev = prevSnap[f.slug];
      // Archivo: primera vez o cambio real. NO en cada pasada (acota la cuota de
      // comandos de Upstash y evita alargar el cron de alertas).
      if (!prev || snapChanged(prev, cur)) toArchive.push(f);
      if (!prev) continue; // primera vez: sin eventos (la declaración es oficial)
      const evs = fireChangeEvents(prev, cur, atIso);
      if (evs.length) {
        const key = `${EV_PREFIX}${f.slug}`;
        const existing = (await r.get<TimelineEntry[]>(key)) ?? [];
        await r.set(key, [...existing, ...evs].slice(-MAX_EVENTS), { ex: TTL_S });
      }
    }
    await r.set(SNAP_KEY, nextSnap);
    // Escritura del archivo en un solo round-trip (pipeline).
    if (toArchive.length) {
      const p = r.pipeline();
      for (const f of toArchive) {
        p.set(`${ARCHIVE_PREFIX}${f.slug}`, slimForArchive(f), { ex: ARCHIVE_TTL_S });
      }
      await p.exec();
    }
  } catch {
    /* el histórico nunca debe romper el cron ni la ficha */
  }
}

/** Último Fire conocido de un incendio (para la ficha histórica tras la extinción).
 * null si no hay archivo o no hay Redis. Nunca lanza. */
export async function getArchivedFire(slug: string): Promise<Fire | null> {
  const r = redis();
  if (!r) return null;
  try {
    return (await r.get<Fire>(`${ARCHIVE_PREFIX}${slug}`)) ?? null;
  } catch {
    return null;
  }
}

/** Eventos registrados de un incendio (para el timeline de la ficha). [] si no hay. */
export async function getFireEvents(slug: string): Promise<TimelineEntry[]> {
  const r = redis();
  if (!r) return [];
  try {
    const evs = (await r.get<TimelineEntry[]>(`${EV_PREFIX}${slug}`)) ?? [];
    // Marca como "detectado" (hora aproximada, no oficial) para distinguirlos.
    return evs.map((e) => ({ ...e, detected: true }));
  } catch {
    return [];
  }
}
