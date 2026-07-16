/**
 * Identidad de LUGAR de un incendio, independiente del ID de incidente de la
 * fuente. Cada fuente reinicia el ID cuando un incendio se reactiva (nuevo
 * incidente → nuevo slug → nueva ficha); la clave de lugar (`placeKey`) es
 * estable entre episodios del mismo paraje, y es lo que permite:
 *   · reconocer una reactivación (mismo lugar, slug distinto), y
 *   · agrupar los episodios de un paraje en la página de provincia.
 *
 * Módulo PURO (sin acceso a red/disco): apto para servidor y cliente, y testeable.
 */

import { slugify } from '@/lib/utils/slug';
import type { Country, Fire } from '@/types/fire';

/** Nombres genéricos que NO identifican un paraje (evitan fusiones falsas). */
const PLACEHOLDER_NAMES = new Set([
  'incendio',
  'incendi',
  'incendios',
  'fogo',
  'area-quemada',
  'area-ardida',
  'x',
]);

/** Slug de una provincia/distrito para la URL `/p/[provincia]` y para comparar. */
export function provinceSlug(province: string): string {
  return slugify(province);
}

/** Parte de municipio/paraje usable para la identidad, o '' si es genérica/vacía. */
function localePart(f: Fire): string {
  const muni = f.municipality && f.municipality !== '—' ? f.municipality : '';
  const s = slugify(muni || f.name || '');
  return !s || PLACEHOLDER_NAMES.has(s) ? '' : s;
}

/**
 * Clave estable del paraje: `país:provincia:municipio`. `null` si la identidad es
 * demasiado débil para enlazar con confianza (sin provincia útil o nombre
 * genérico); en ese caso el incendio no se enlaza como reactivación (mejor perder
 * un enlace que fusionar dos incendios distintos).
 */
export function placeKey(f: Fire): string | null {
  const prov = provinceSlug(f.province);
  const loc = localePart(f);
  if (!prov || !loc) return null;
  return `${f.country.toLowerCase()}:${prov}:${loc}`;
}

/** ¿Dos incendios son del mismo paraje? (ambos con clave de lugar y coincidente). */
export function samePlace(a: Fire, b: Fire): boolean {
  const ka = placeKey(a);
  return ka !== null && ka === placeKey(b);
}

/** Nombre legible del paraje (municipio si lo hay; si no, el nombre del incendio). */
export function placeName(f: Fire): string {
  return f.municipality && f.municipality !== '—' ? f.municipality : f.name;
}

/** Momento de inicio del incendio en ms (fallback a updatedAt, luego 0). */
export function startedMs(f: Fire): number {
  const s = Date.parse(f.startedAt);
  if (Number.isFinite(s)) return s;
  const u = Date.parse(f.updatedAt);
  return Number.isFinite(u) ? u : 0;
}

export interface PlaceGroup {
  /** placeKey del grupo, o `solo:<slug>` para incendios sin identidad de lugar. */
  key: string;
  name: string;
  province: string;
  provinceSlug: string;
  region: string;
  country: Country;
  /** Episodios del paraje, del más reciente al más antiguo. */
  episodes: Fire[];
}

/**
 * Agrupa incendios por paraje (placeKey). Los que no tienen identidad de lugar
 * (clave `null`) quedan como grupos de un solo episodio, para que aun así
 * aparezcan en el listado. Grupos y episodios ordenados de más reciente a más
 * antiguo. Puro.
 */
export function groupByPlace(fires: Fire[]): PlaceGroup[] {
  const map = new Map<string, PlaceGroup>();
  for (const f of fires) {
    const key = placeKey(f) ?? `solo:${f.slug}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        name: placeName(f),
        province: f.province,
        provinceSlug: provinceSlug(f.province),
        region: f.region,
        country: f.country,
        episodes: [],
      };
      map.set(key, g);
    }
    g.episodes.push(f);
  }
  const groups = [...map.values()];
  for (const g of groups) {
    g.episodes.sort((a, b) => startedMs(b) - startedMs(a));
  }
  // Orden de grupos: primero el que tiene algún episodio activo, luego por
  // actividad más reciente y por nombre.
  const hasActive = (g: PlaceGroup) => g.episodes.some((e) => e.state === 'activo');
  const lastActivity = (g: PlaceGroup) => Math.max(...g.episodes.map((e) => startedMs(e)));
  return groups.sort(
    (a, b) =>
      Number(hasActive(b)) - Number(hasActive(a)) ||
      lastActivity(b) - lastActivity(a) ||
      a.name.localeCompare(b.name, 'es'),
  );
}
