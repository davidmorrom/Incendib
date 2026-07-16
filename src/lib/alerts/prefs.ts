/**
 * Modelo de preferencias de alerta (v2) — fuente única de verdad, pura y
 * compartida entre cliente (AlertasScreen) y servidor (store, cron, subscribe).
 *
 * El panel avanzado permite:
 *  - Varias **zonas vigiladas** (por ubicación/pin geográfico o por provincia).
 *  - **Tipos de alerta** independientes (nuevo incendio, escalada, evacuación
 *    —siempre activa—, focos satelitales, incendios seguidos).
 *  - **Umbral** de nivel mínimo.
 *  - **Horario de silencio** (no molestar); la evacuación suena igualmente.
 *  - **Incendios seguidos**: los slugs que el usuario sigue localmente se
 *    sincronizan aquí para que el servidor pueda avisar aunque no estén en zona.
 *
 * `normalizePrefs` acepta CUALQUIER entrada (prefs v1 antiguas, v2, o basura del
 * cliente) y devuelve un `AlertPrefs` v2 saneado: es a la vez migración y clamp.
 * Así los suscriptores v1 existentes siguen funcionando sin re-suscribirse.
 */

import { PROVINCES } from '@/lib/geo/provinces';

export type AlertZoneKind = 'location' | 'pin' | 'province';

/** Una zona vigilada. Geográfica (lat/lon + radio) o por provincia (slug). */
export interface AlertZone {
  id: string;
  label: string;
  kind: AlertZoneKind;
  enabled: boolean;
  /** Zonas geográficas (`location`/`pin`). */
  lat?: number;
  lon?: number;
  radiusKm?: number;
  /** Zona por provincia/distrito (slug del catálogo `PROVINCES`). */
  provinceSlug?: string;
}

/** Tipos de evento que disparan aviso. `evacuation` está siempre activo. */
export interface AlertTypes {
  /** Nuevo incendio detectado en zona (≥ umbral). */
  newFire: boolean;
  /** Un incendio sube de nivel o empeora de estado. */
  escalation: boolean;
  /** Evacuaciones y cortes: SIEMPRE activo (no se puede desactivar). */
  evacuation: boolean;
  /** Focos satelitales nuevos (detección FIRMS, no confirmada; ruidoso). */
  hotspots: boolean;
  /** Novedades en los incendios que el usuario sigue. */
  followed: boolean;
}

/** Franja de silencio, en minutos del día (hora local del suscriptor). */
export interface QuietHours {
  /** Inicio, minutos desde medianoche [0, 1440). */
  start: number;
  /** Fin, minutos desde medianoche [0, 1440). Si end<start, cruza la medianoche. */
  end: number;
}

/** Idioma en el que enviar el texto de las notificaciones push. */
export type AlertLocale = 'es' | 'pt' | 'en';

export interface AlertPrefs {
  version: 2;
  zones: AlertZone[];
  /** Umbral: solo avisa de incendios con nivel ≥ minLevel (0..3). */
  minLevel: 0 | 1 | 2 | 3;
  types: AlertTypes;
  quietHours: QuietHours | null;
  /** Zona horaria IANA para evaluar `quietHours` en servidor (p. ej. "Europe/Madrid"). */
  timeZone?: string;
  /** Idioma de las notificaciones (para localizar el texto que envía el cron). */
  locale?: AlertLocale;
  /** Slugs de incendios seguidos (sincronizados desde el follow store local). */
  followedSlugs: string[];
}

export const MAX_ZONES = 10;
export const MAX_LABEL = 40;
export const MAX_FOLLOWED = 200;
export const DEFAULT_RADIUS_KM = 30;
export const MIN_RADIUS_KM = 1;
export const MAX_RADIUS_KM = 500;

export const DEFAULT_TYPES: AlertTypes = {
  newFire: true,
  escalation: true,
  evacuation: true,
  hotspots: false,
  followed: true,
};

export const DEFAULT_PREFS: AlertPrefs = {
  version: 2,
  zones: [],
  minLevel: 2,
  types: { ...DEFAULT_TYPES },
  quietHours: null,
  followedSlugs: [],
};

const PROVINCE_SLUGS = new Set(PROVINCES.map((p) => p.slug));

const num = (v: unknown, d: number): number => (Number.isFinite(Number(v)) ? Number(v) : d);
const clampInt = (v: unknown, lo: number, hi: number, d: number): number =>
  Math.min(hi, Math.max(lo, Math.round(num(v, d))));

export function clampRadiusKm(v: unknown): number {
  return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, Math.round(num(v, DEFAULT_RADIUS_KM))));
}

/** ¿Es una zona horaria IANA plausible? (validación ligera, no exhaustiva). */
function safeTimeZone(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  if (!s || s.length > 64) return undefined;
  // "UTC" o "Region/Ciudad" con caracteres de zona (letras, /, _, +, -, dígitos).
  if (s === 'UTC' || /^[A-Za-z]+\/[A-Za-z0-9_+\-/]+$/.test(s)) return s;
  return undefined;
}

/** Minuto del día [0,1440) desde "HH:MM" o número; null si no es válido. */
export function parseMinuteOfDay(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    const m = Math.round(v);
    return m >= 0 && m < 1440 ? m : null;
  }
  if (typeof v === 'string') {
    const match = v.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const h = Number(match[1]);
      const mm = Number(match[2]);
      if (h >= 0 && h < 24 && mm >= 0 && mm < 60) return h * 60 + mm;
    }
  }
  return null;
}

/** "HH:MM" a partir de minutos del día. */
export function minuteOfDayToHHMM(m: number): string {
  const mm = ((Math.round(m) % 1440) + 1440) % 1440;
  const h = Math.floor(mm / 60);
  const min = mm % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Id estable para una zona sin id explícito (permite deduplicar). */
function derivedZoneId(z: { kind: AlertZoneKind; provinceSlug?: string; lat?: number; lon?: number }): string {
  if (z.kind === 'province') return `p:${z.provinceSlug ?? ''}`;
  return `g:${Number(z.lat).toFixed(3)},${Number(z.lon).toFixed(3)}`;
}

function normalizeZone(raw: unknown): AlertZone | null {
  if (!raw || typeof raw !== 'object') return null;
  const z = raw as Record<string, unknown>;
  const kind: AlertZoneKind = z.kind === 'province' ? 'province' : z.kind === 'pin' ? 'pin' : 'location';
  const enabled = z.enabled !== false; // por defecto habilitada
  const rawLabel = typeof z.label === 'string' ? z.label.trim().slice(0, MAX_LABEL) : '';

  if (kind === 'province') {
    const slug = typeof z.provinceSlug === 'string' ? z.provinceSlug : '';
    if (!slug || !PROVINCE_SLUGS.has(slug)) return null; // slug desconocido → se descarta
    const id = typeof z.id === 'string' && z.id ? z.id.slice(0, 64) : derivedZoneId({ kind, provinceSlug: slug });
    return { id, kind: 'province', provinceSlug: slug, label: rawLabel || slug, enabled };
  }

  const lat = num(z.lat, NaN);
  const lon = num(z.lon, NaN);
  if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) return null;
  // Redondeo a ~3 decimales (≈100 m): suficiente para el radio en km y menos
  // identificable que la coordenada exacta del domicilio (minimización de PII).
  const rlat = Math.round(lat * 1000) / 1000;
  const rlon = Math.round(lon * 1000) / 1000;
  const id = typeof z.id === 'string' && z.id ? z.id.slice(0, 64) : derivedZoneId({ kind, lat: rlat, lon: rlon });
  return { id, kind, lat: rlat, lon: rlon, radiusKm: clampRadiusKm(z.radiusKm), label: rawLabel || 'Zona', enabled };
}

function normalizeZones(raw: unknown): AlertZone[] {
  if (!Array.isArray(raw)) return [];
  const out: AlertZone[] = [];
  const seen = new Set<string>();
  for (const z of raw) {
    const zone = normalizeZone(z);
    if (!zone || seen.has(zone.id)) continue;
    seen.add(zone.id);
    out.push(zone);
    if (out.length >= MAX_ZONES) break;
  }
  return out;
}

function normalizeFollowed(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of raw) {
    if (typeof s !== 'string') continue;
    // Los slugs de incendio ya vienen saneados (`[a-z0-9-]`), pero acotamos por si acaso.
    const slug = s.trim().slice(0, 80);
    if (!slug || !/^[a-z0-9-]+$/.test(slug) || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= MAX_FOLLOWED) break;
  }
  return out;
}

function normalizeQuietHours(raw: unknown): QuietHours | null {
  if (!raw || typeof raw !== 'object') return null;
  const q = raw as Record<string, unknown>;
  const start = parseMinuteOfDay(q.start);
  const end = parseMinuteOfDay(q.end);
  if (start == null || end == null) return null;
  if (start === end) return null; // franja vacía → sin silencio
  return { start, end };
}

/**
 * Normaliza/migra cualquier entrada a `AlertPrefs` v2 saneado.
 * - Entrada v1 `{ minLevel, radiusKm, silence, zone }` → una zona `location`
 *   (o ninguna si `zone` era null). El `silence` booleano v1 se descarta (el
 *   nuevo silencio es por horario, no por severidad).
 * - Entrada v2 → se sanea (zonas válidas, tipos, umbral, franja, tz, seguidos).
 * - Basura → `DEFAULT_PREFS`.
 */
export function normalizePrefs(raw: unknown): AlertPrefs {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  let zones: AlertZone[];
  if (Array.isArray(r.zones)) {
    zones = normalizeZones(r.zones);
  } else if (r.zone && typeof r.zone === 'object') {
    // Migración v1: la única zona era la ubicación del usuario.
    const migrated = normalizeZone({
      kind: 'location',
      label: 'Mi zona',
      lat: (r.zone as Record<string, unknown>).lat,
      lon: (r.zone as Record<string, unknown>).lon,
      radiusKm: r.radiusKm,
      enabled: true,
    });
    zones = migrated ? [migrated] : [];
  } else {
    zones = [];
  }

  const rawTypes = (r.types && typeof r.types === 'object' ? r.types : {}) as Record<string, unknown>;
  const types: AlertTypes = {
    newFire: rawTypes.newFire !== undefined ? Boolean(rawTypes.newFire) : DEFAULT_TYPES.newFire,
    escalation: rawTypes.escalation !== undefined ? Boolean(rawTypes.escalation) : DEFAULT_TYPES.escalation,
    evacuation: true, // siempre activo, no configurable
    hotspots: rawTypes.hotspots !== undefined ? Boolean(rawTypes.hotspots) : DEFAULT_TYPES.hotspots,
    followed: rawTypes.followed !== undefined ? Boolean(rawTypes.followed) : DEFAULT_TYPES.followed,
  };

  const quietHours = normalizeQuietHours(r.quietHours);
  const timeZone = safeTimeZone(r.timeZone);
  const locale: AlertLocale | undefined =
    r.locale === 'es' || r.locale === 'pt' || r.locale === 'en' ? r.locale : undefined;

  // El silencio se evalúa en servidor en la tz del suscriptor. Sin una tz válida
  // no podemos silenciar con corrección (desfase por huso/DST): mejor NO silenciar
  // (fail-open, app de evacuaciones) que suprimir a la hora equivocada. Y solo
  // guardamos la tz si hay horario de silencio (minimización de datos).
  const keepQuiet = quietHours && timeZone ? quietHours : null;

  return {
    version: 2,
    zones,
    minLevel: clampInt(r.minLevel, 0, 3, DEFAULT_PREFS.minLevel) as 0 | 1 | 2 | 3,
    types,
    quietHours: keepQuiet,
    timeZone: keepQuiet ? timeZone : undefined,
    locale,
    followedSlugs: normalizeFollowed(r.followedSlugs),
  };
}

/**
 * Fusiona prefs entrantes contra las ya almacenadas al guardar en servidor. Evita
 * que un cliente PWA cacheado ANTIGUO (que envía la forma v1 sin `zones`/`types`/
 * `quietHours`) borre en silencio la configuración v2 del usuario: si la entrada
 * no expresa la estructura v2 pero existe una v2 guardada, se conserva la guardada
 * y solo se actualiza lo que el cliente sí expresa (el umbral). Un cliente v2
 * (envía `version:2` o un array `zones`) reemplaza normalmente.
 */
export function mergePrefsForStorage(incomingRaw: unknown, stored?: AlertPrefs | null): AlertPrefs {
  const r = (incomingRaw && typeof incomingRaw === 'object' ? incomingRaw : {}) as Record<string, unknown>;
  const isV2Client = r.version === 2 || Array.isArray(r.zones);
  if (!stored || isV2Client) return normalizePrefs(incomingRaw);
  // Cliente antiguo (v1): conservar la config v2 guardada, actualizar solo minLevel.
  return { ...stored, minLevel: clampInt(r.minLevel, 0, 3, stored.minLevel) as 0 | 1 | 2 | 3 };
}
