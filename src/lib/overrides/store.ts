/**
 * Lectura de los overrides que el PANEL privado escribe en el mismo Upstash Redis
 * (`Incendib-Panel`, ver su `docs/INTEGRACION-INCENDIB.md`). El visor solo LEE. Mismo
 * patrón null-safe que `src/lib/history/store.ts`: sin credenciales todo es no-op y no
 * rompe nada (banner ausente = no se muestra).
 *
 * De momento solo el **banner global**; los overrides por incendio (`applyOverrides`)
 * llegarán en un slice posterior de la Fase 3.
 */
import { Redis } from '@upstash/redis';
import { unstable_cache } from 'next/cache';
import type { Locale } from '@/lib/i18n';

export interface SiteBanner {
  active: boolean;
  level: 'info' | 'warn' | 'critical';
  /** Texto por idioma; cae a `es` si falta el del idioma activo. */
  text: { es: string; pt?: string; en?: string };
  href?: string;
  dismissible: boolean;
  updatedAt: number;
}

const BANNER_KEY = 'override:banner';
/** Etiqueta de caché; el panel la invalida vía `POST /api/admin/revalidate`. */
export const BANNER_TAG = 'override:banner';

let client: Redis | null | undefined;
function redis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

/** Banner global vigente, o `null` si no hay (o no hay Redis). Nunca lanza. */
export async function getBanner(): Promise<SiteBanner | null> {
  const r = redis();
  if (!r) return null;
  try {
    return (await r.get<SiteBanner>(BANNER_KEY)) ?? null;
  } catch {
    return null;
  }
}

/**
 * Lectura cacheada para el hot path público (layout de la app): evita pegarle a
 * Upstash en cada request. Se refresca cuando el panel invalida `BANNER_TAG` tras un
 * cambio y, como red de seguridad, cada 5 min.
 */
export const getBannerCached = unstable_cache(async () => getBanner(), ['override-banner'], {
  tags: [BANNER_TAG],
  revalidate: 300,
});

/** Texto del banner en el idioma activo, con respaldo a ES. Puro (testable). */
export function bannerText(banner: SiteBanner, locale: Locale): string {
  return banner.text[locale] ?? banner.text.es;
}

/** ¿Debe mostrarse el banner? Considera activo y descarte del usuario. Puro (testable). */
export function shouldShowBanner(
  banner: SiteBanner | null,
  dismissedValue: string | null,
): boolean {
  if (!banner || !banner.active) return false;
  if (banner.dismissible && dismissedValue === String(banner.updatedAt)) return false;
  return true;
}

// ── Overrides por incendio ────────────────────────────────────────────────────────
/**
 * Estado de overrides que el panel escribe en `override:state`. Por ahora el visor
 * SOLO aplica los ocultamientos (`hidden`/`hiddenHotspots`/`hiddenBurned`); las
 * ediciones por campo (`patches`) y las altas manuales (`manualFires`) se transportan
 * en el tipo pero se aplicarán en un slice posterior (necesitan sello «corregido a
 * mano» en la UI). Todo es **inerte por defecto**: sin overrides, los datos salen igual.
 */
export type FirePatch = Record<string, unknown>;

export interface OverrideState {
  hidden: string[]; // slugs de incidentes a ocultar
  hiddenHotspots: string[]; // ids de focos FIRMS a ocultar
  hiddenBurned: string[]; // slugs de áreas quemadas (EFFIS) a ocultar
  patches: Record<string, FirePatch>; // (aún no aplicado por el visor)
  manualFires: unknown[]; // (aún no aplicado por el visor)
  updatedAt: number;
}

const STATE_KEY = 'override:state';
/** Etiqueta de caché; el panel la invalida vía `POST /api/admin/revalidate`. */
export const STATE_TAG = 'override:state';

export const EMPTY_STATE: OverrideState = {
  hidden: [],
  hiddenHotspots: [],
  hiddenBurned: [],
  patches: {},
  manualFires: [],
  updatedAt: 0,
};

/** Estado de overrides vigente, o `EMPTY_STATE` si no hay (o no hay Redis). Nunca lanza. */
export async function getOverrides(): Promise<OverrideState> {
  const r = redis();
  if (!r) return EMPTY_STATE;
  try {
    return (await r.get<OverrideState>(STATE_KEY)) ?? EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

/** Lectura cacheada para el hot path (`getFires`); refrescada por tag o cada 5 min. */
export const getOverridesCached = unstable_cache(async () => getOverrides(), ['override-state'], {
  tags: [STATE_TAG],
  revalidate: 300,
});

/** Quita los elementos cuyo `slug` esté en la lista. Identidad si la lista está vacía. Puro. */
export function filterOutSlugs<T extends { slug: string }>(items: T[], slugs: string[]): T[] {
  if (!slugs.length) return items;
  const hide = new Set(slugs);
  return items.filter((i) => !hide.has(i.slug));
}

/** Quita los elementos cuyo `id` esté en la lista. Identidad si la lista está vacía. Puro. */
export function filterOutIds<T extends { id: string }>(items: T[], ids: string[]): T[] {
  if (!ids.length) return items;
  const hide = new Set(ids);
  return items.filter((i) => !hide.has(i.id));
}

/**
 * Aplica las correcciones manuales por slug: fusiona el parche sobre el incendio y lo
 * marca `edited` con la lista de campos tocados (para el sello de transparencia).
 * Identidad si no hay parches. Puro (testable). El parche es laxo por diseño (el
 * panel valida qué campos son editables antes de escribirlo).
 */
export function applyPatches<T extends { slug: string }>(
  items: T[],
  patches: Record<string, FirePatch>,
): (T & { edited?: boolean; overriddenFields?: string[] })[] {
  if (!patches || !Object.keys(patches).length) return items;
  return items.map((f) => {
    const p = patches[f.slug];
    if (!p || !Object.keys(p).length) return f;
    return { ...f, ...p, edited: true, overriddenFields: Object.keys(p) } as T & {
      edited?: boolean;
      overriddenFields?: string[];
    };
  });
}
