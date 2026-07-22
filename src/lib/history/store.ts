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
import type { Country, Fire, FireState, PtState, SeverityLevel, SourceId, TimelineEntry } from '@/types/fire';
import { placeKey, provinceSlug } from '@/lib/fires/place';

const SNAP_KEY = 'hist:snap'; // map slug → FireSnap (última foto)
const EV_PREFIX = 'hist:ev:'; // por incendio: lista de eventos (JSON)
const MAX_EVENTS = 15;
const TTL_S = 21 * 24 * 3600; // 21 días
// Archivo del Fire completo por incendio: última foto conocida, para que la ficha
// /f/[slug] sobreviva a la extinción (cuando el incendio sale del feed en vivo).
const ARCHIVE_PREFIX = 'hist:fire:';
const ARCHIVE_TTL_S = 365 * 24 * 3600; // 1 año desde el último cambio (un incendio nunca dura tanto)
// Índices enumerables (para la página de provincia y el descubrimiento de
// reactivaciones): resúmenes compactos de episodios por provincia y por paraje.
// Hacen que el archivo de ~1 año sea listable sin tener que escanear Redis.
const PROV_PREFIX = 'hist:prov:'; // por provincia (slug): EpisodeSnapshot[]
const PLACE_PREFIX = 'hist:place:'; // por paraje (placeKey): EpisodeSnapshot[]
const PROV_CAP = 300; // tope de episodios por provincia (higiene de cuota)
const PLACE_CAP = 30; // tope de episodios por paraje

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
    perimeterApprox: f.perimeterApprox,
    // omitidos a propósito: weather, satelliteConfirmed, hotspotKm, delta24h (señales de «ahora»)
  };
}

/**
 * Resumen compacto de un episodio para los índices por provincia/paraje. Contiene
 * los campos necesarios para (a) pintar una fila del listado y (b) recomputar
 * `placeKey`. Es un superconjunto de los campos obligatorios de `Fire`, así que
 * los lectores lo devuelven como `Fire` sin más.
 */
export interface EpisodeSnapshot {
  slug: string;
  name: string;
  municipality: string;
  province: string;
  region: string;
  country: Country;
  state: FireState;
  level: SeverityLevel;
  hectares: number;
  hectaresApprox?: boolean;
  ptState?: PtState;
  coordinates: [number, number];
  startedAt: string;
  updatedAt: string;
  sources: SourceId[];
}

function episodeOf(f: Fire): EpisodeSnapshot {
  return {
    slug: f.slug,
    name: f.name,
    municipality: f.municipality,
    province: f.province,
    region: f.region,
    country: f.country,
    state: f.state,
    level: f.level,
    hectares: f.hectares,
    hectaresApprox: f.hectaresApprox,
    ptState: f.ptState,
    coordinates: f.coordinates,
    startedAt: f.startedAt,
    updatedAt: f.updatedAt,
    sources: f.sources,
  };
}

/** Momento de un episodio (inicio, con respaldo a la última actualización). */
function episodeMs(e: EpisodeSnapshot): number {
  const s = Date.parse(e.startedAt);
  if (Number.isFinite(s)) return s;
  const u = Date.parse(e.updatedAt);
  return Number.isFinite(u) ? u : 0;
}

/**
 * Fusiona episodios entrantes sobre los existentes (dedup por slug; el entrante
 * gana, por ser más fresco), ordena de más reciente a más antiguo y recorta a
 * `cap`. Puro y testeable.
 */
export function upsertEpisodes(
  existing: EpisodeSnapshot[],
  incoming: EpisodeSnapshot[],
  cap: number,
): EpisodeSnapshot[] {
  const bySlug = new Map<string, EpisodeSnapshot>();
  for (const e of existing) bySlug.set(e.slug, e);
  for (const e of incoming) bySlug.set(e.slug, e);
  return [...bySlug.values()].sort((a, b) => episodeMs(b) - episodeMs(a)).slice(0, cap);
}

/**
 * Actualiza los índices por provincia y por paraje con los episodios recién
 * archivados. Un `get`+`set` por clave única (pocas, porque solo se archiva lo
 * nuevo o cambiado). Best-effort: cualquier fallo se ignora (nunca rompe el cron).
 */
async function updateIndexes(r: Redis, fires: Fire[]): Promise<void> {
  const byProv = new Map<string, EpisodeSnapshot[]>();
  const byPlace = new Map<string, EpisodeSnapshot[]>();
  for (const f of fires) {
    const ep = episodeOf(f);
    const pslug = provinceSlug(f.province);
    if (pslug) (byProv.get(pslug) ?? byProv.set(pslug, []).get(pslug)!).push(ep);
    const key = placeKey(f);
    if (key) (byPlace.get(key) ?? byPlace.set(key, []).get(key)!).push(ep);
  }
  for (const [pslug, eps] of byProv) {
    const existing = (await r.get<EpisodeSnapshot[]>(`${PROV_PREFIX}${pslug}`)) ?? [];
    await r.set(`${PROV_PREFIX}${pslug}`, upsertEpisodes(existing, eps, PROV_CAP), { ex: ARCHIVE_TTL_S });
  }
  for (const [key, eps] of byPlace) {
    const existing = (await r.get<EpisodeSnapshot[]>(`${PLACE_PREFIX}${key}`)) ?? [];
    await r.set(`${PLACE_PREFIX}${key}`, upsertEpisodes(existing, eps, PLACE_CAP), { ex: ARCHIVE_TTL_S });
  }
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
      // Índices enumerables por provincia/paraje (para /p/[provincia] y el enlace
      // de reactivaciones); solo lo nuevo o cambiado, para acotar la cuota.
      await updateIndexes(r, toArchive);
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

/**
 * Episodios archivados de una provincia (índice `hist:prov:<slug>`), como `Fire`.
 * Complementa —en producción— a lo que hay en vivo, en git y en EFFIS para el
 * listado de `/p/[provincia]`. [] si no hay índice o no hay Redis. Nunca lanza.
 */
export async function getProvinceArchivedFires(pslug: string): Promise<Fire[]> {
  const r = redis();
  if (!r || !pslug) return [];
  try {
    return ((await r.get<EpisodeSnapshot[]>(`${PROV_PREFIX}${pslug}`)) ?? []) as Fire[];
  } catch {
    return [];
  }
}

/**
 * Episodios archivados de un paraje (índice `hist:place:<key>`), como `Fire`.
 * Sirve para descubrir reactivaciones: episodios anteriores del mismo lugar que
 * ya salieron del feed en vivo. [] si no hay índice o no hay Redis. Nunca lanza.
 */
export async function getPlaceEpisodes(key: string): Promise<Fire[]> {
  const r = redis();
  if (!r || !key) return [];
  try {
    return ((await r.get<EpisodeSnapshot[]>(`${PLACE_PREFIX}${key}`)) ?? []) as Fire[];
  } catch {
    return [];
  }
}
