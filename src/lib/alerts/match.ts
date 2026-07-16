/**
 * Lógica pura de emparejamiento de alertas (usada por el cron de push).
 *
 * Separada del route handler para poder testearla sin Redis ni red. Decide, para
 * un incendio (o un foco satelital) y unas preferencias de suscriptor, si procede
 * enviar aviso y por qué motivo. Una sola decisión por (incendio, suscriptor):
 * evita doble-push cuando encaja por varias vías (evacuación > seguido > nuevo/
 * escalada) y respeta el horario de silencio salvo para evacuaciones.
 */

import type { Fire, Hotspot } from '@/types/fire';
import { slugify } from '@/lib/utils/slug';
import type { AlertPrefs, AlertZone, QuietHours } from './prefs';

/** Datos mínimos de un incendio para emparejar (subconjunto de `Fire`). */
export type MatchableFire = Pick<
  Fire,
  'slug' | 'level' | 'evacuation' | 'coordinates' | 'province' | 'region'
>;

export type FireEvent = 'new' | 'escalated';
export type AlertReason = 'evacuation' | 'followed' | 'newFire' | 'escalation';

/**
 * Alias de grafía → slug canónico del catálogo `PROVINCES`. Las fuentes usan
 * exónimos/variantes bilingües que `slugify` no resuelve (Orense↔Ourense,
 * Lérida↔Lleida…); sin esta tabla, vigilar «A Coruña» y recibir un incendio con
 * `province: "La Coruña"` daría un falso negativo silencioso.
 */
const PROVINCE_ALIASES: Record<string, string> = {
  orense: 'ourense',
  'la-coruna': 'a-coruna',
  coruna: 'a-coruna',
  lerida: 'lleida',
  gerona: 'girona',
  guipuzcoa: 'gipuzkoa',
  vizcaya: 'bizkaia',
  araba: 'alava',
  baleares: 'illes-balears',
  'islas-baleares': 'illes-balears',
  balears: 'illes-balears',
  alacant: 'alicante',
  castello: 'castellon',
};

/** Slug canónico de provincia a partir de la grafía de la fuente. */
export function canonicalProvinceSlug(name: string | undefined | null): string {
  const s = slugify(name ?? '');
  return PROVINCE_ALIASES[s] ?? s;
}

export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const la1 = (a[1] * Math.PI) / 180;
  const la2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** ¿El incendio cae dentro de esta zona concreta? */
export function fireInZone(fire: MatchableFire, zone: AlertZone): boolean {
  if (!zone.enabled) return false;
  if (zone.kind === 'province') {
    if (!zone.provinceSlug) return false;
    // Solo por provincia (nunca por región/CCAA: comparar la CCAA contra un slug
    // de provincia sobre-notifica o no casa nunca). Alias resuelve exónimos.
    return canonicalProvinceSlug(fire.province) === zone.provinceSlug;
  }
  // Zona geográfica: distancia al centro ≤ radio.
  if (zone.lat == null || zone.lon == null) return false;
  const radius = zone.radiusKm ?? 30;
  return haversineKm(fire.coordinates, [zone.lon, zone.lat]) <= radius;
}

/** Zonas habilitadas. */
function enabledZones(zones: AlertZone[]): AlertZone[] {
  return zones.filter((z) => z.enabled);
}

/**
 * ¿El incendio está «en zona» según las prefs?
 *  - Sin ninguna zona definida → toda la península/islas (por defecto: no dejar
 *    mudo a quien nunca ha fijado zona).
 *  - Con zonas definidas pero TODAS en pausa → no casa ninguna (el usuario
 *    silenció explícitamente sus zonas; no debe recibir una avalancha nacional).
 *  - Con ≥1 zona habilitada → exige pertenencia a alguna.
 */
export function fireMatchesZones(fire: MatchableFire, zones: AlertZone[]): boolean {
  if (zones.length === 0) return true;
  const active = enabledZones(zones);
  if (active.length === 0) return false;
  return active.some((z) => fireInZone(fire, z));
}

/**
 * Minuto del día [0,1440) en la zona horaria dada. `null` si la tz es inválida
 * (para no suprimir avisos por un dato de tz corrupto → se falla hacia entregar).
 */
export function localMinuteOfDay(now: Date, timeZone: string | undefined): number | null {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const parts = fmt.formatToParts(now);
    const h = Number(parts.find((p) => p.type === 'hour')?.value);
    const m = Number(parts.find((p) => p.type === 'minute')?.value);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return (h % 24) * 60 + (m % 60);
  } catch {
    return null;
  }
}

/** ¿Estamos dentro del horario de silencio? Franja que puede cruzar medianoche. */
export function inQuietHours(quiet: QuietHours | null, timeZone: string | undefined, now: Date): boolean {
  if (!quiet) return false;
  if (!timeZone) return false; // sin tz no podemos evaluar bien → no silenciar (fail-open)
  const m = localMinuteOfDay(now, timeZone);
  if (m == null) return false; // tz corrupta → no silenciar
  const { start, end } = quiet;
  if (start === end) return false;
  return start < end ? m >= start && m < end : m >= start || m < end;
}

/**
 * Decide si enviar aviso de un incendio a un suscriptor y por qué motivo.
 * Prioridad: evacuación (ignora silencio) > seguido > nuevo/escalada. Una sola
 * decisión ⇒ nunca dos push por el mismo incendio y suscriptor.
 */
export function decideFireAlert(
  event: FireEvent,
  fire: MatchableFire,
  prefs: AlertPrefs,
  now: Date,
): { send: boolean; reason: AlertReason | null } {
  const level = fire.level ?? 0;
  const followed = prefs.types.followed && prefs.followedSlugs.includes(fire.slug);
  const inZone = fireMatchesZones(fire, prefs.zones);

  // Evacuación: prioridad máxima; suena aunque sea horario de silencio.
  // Requiere estar en zona o seguir el incendio (no notificar evacuaciones del
  // otro extremo del país a quien fijó una zona local).
  if (fire.evacuation && prefs.types.evacuation && (inZone || followed)) {
    return { send: true, reason: 'evacuation' };
  }

  // A partir de aquí, el silencio suprime.
  if (inQuietHours(prefs.quietHours, prefs.timeZone, now)) return { send: false, reason: null };

  // Incendio seguido: cualquier novedad (respeta zona=libre y umbral=libre).
  if (followed) return { send: true, reason: 'followed' };

  if (!inZone) return { send: false, reason: null };
  if (level < prefs.minLevel) return { send: false, reason: null };

  if (event === 'new' && prefs.types.newFire) return { send: true, reason: 'newFire' };
  if (event === 'escalated' && prefs.types.escalation) return { send: true, reason: 'escalation' };
  return { send: false, reason: null };
}

/**
 * ¿Enviar aviso de un foco satelital nuevo a un suscriptor? Los focos no tienen
 * provincia ni estado: solo se emparejan por proximidad a una zona GEOGRÁFICA
 * habilitada (nunca «global», que sería demasiado ruidoso) y solo si el tipo está
 * activo. Respeta el horario de silencio (un foco nunca es una evacuación).
 */
export function hotspotMatches(hotspot: Pick<Hotspot, 'coordinates'>, prefs: AlertPrefs, now: Date): boolean {
  if (!prefs.types.hotspots) return false;
  if (inQuietHours(prefs.quietHours, prefs.timeZone, now)) return false;
  const geoZones = enabledZones(prefs.zones).filter((z) => z.kind !== 'province' && z.lat != null && z.lon != null);
  if (geoZones.length === 0) return false;
  return geoZones.some(
    (z) => haversineKm(hotspot.coordinates, [z.lon as number, z.lat as number]) <= (z.radiusKm ?? 30),
  );
}

/** ¿Alguna suscripción quiere focos satelitales? (para no hacer el diff si nadie). */
export function anyoneWantsHotspots(prefsList: AlertPrefs[]): boolean {
  return prefsList.some(
    (p) =>
      p.types.hotspots &&
      enabledZones(p.zones).some((z) => z.kind !== 'province' && z.lat != null && z.lon != null),
  );
}

/**
 * Id de celda para deduplicar focos satelitales: redondea [lon,lat] a 2 decimales
 * (≈1.1 km). Los ids crudos de FIRMS incluyen la hora de la pasada, así que cada
 * paso del satélite sobre el mismo fuego sería «nuevo»; la celda + un cooldown
 * temporal evitan ese spam y acotan el conjunto guardado.
 */
export function hotspotCellId(coordinates: [number, number]): string {
  return `${coordinates[1].toFixed(2)},${coordinates[0].toFixed(2)}`;
}
