/** Formato del boletín (cliente-safe): periodo legible y variaciones ▲/▼. */

import type { Locale } from '@/lib/i18n/config';

function day(iso: string, locale: Locale, withYear: boolean): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: withYear ? 'numeric' : undefined,
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** "30 jun – 6 jul 2026" a partir de dos fechas ISO (YYYY-MM-DD). */
export function formatPeriod(startIso: string, endIso: string, locale: Locale): string {
  return `${day(startIso, locale, false)} – ${day(endIso, locale, true)}`;
}

export interface Delta {
  dir: 'up' | 'down' | 'flat';
  abs: number;
}

/**
 * Variación de una métrica respecto a la edición anterior. Para todas las
 * métricas del boletín (detecciones, incendios, ha) **más = peor**, así que
 * quien pinte esto usa rojo para `up` y verde para `down` (color = dato).
 */
export function delta(cur: number, prev?: number): Delta | null {
  if (prev == null) return null;
  const d = cur - prev;
  if (d === 0) return { dir: 'flat', abs: 0 };
  return { dir: d > 0 ? 'up' : 'down', abs: Math.abs(d) };
}
