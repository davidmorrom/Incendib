import { getDataMode } from '@/lib/data';
import { timeAgo, elapsedShort } from '@/lib/utils/format';
import type { Locale } from '@/lib/i18n/config';

/**
 * "Ahora" de referencia. En modo mock es un instante FIJO (el de los mocks,
 * 2026-07-10 14:32 CEST) para que los tiempos relativos coincidan con el diseño
 * y sean deterministas (server y cliente calculan lo mismo → sin desajuste de
 * hidratación). En modo live usará el reloj real.
 */
export const MOCK_NOW = Date.parse('2026-07-10T14:32:00+02:00');

export function getNow(): number {
  return getDataMode() === 'live' ? Date.now() : MOCK_NOW;
}

/** timeAgo relativo al "ahora" de referencia, en el idioma activo. */
export function timeAgoNow(iso: string, locale: Locale = 'es'): string {
  return timeAgo(iso, getNow(), locale);
}

/** Antigüedad compacta ("6 min", "1 h 12") relativa al "ahora" de referencia. */
export function elapsedShortNow(iso: string): string {
  return elapsedShort(iso, getNow());
}
