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
