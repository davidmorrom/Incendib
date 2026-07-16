/**
 * Utilidades de formato. Regla del handoff: los miles se separan con ESPACIO
 * (3 241, 12 512), nunca con punto. Cifras siempre en familia mono.
 */

/** 3241 → "3 241". Separador de millares = espacio fino no rompible (U+202F). */
export function formatNumber(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Hectáreas con unidad: 3241 → "3 241 ha". */
export function formatHa(n: number): string {
  return `${formatNumber(n)} ha`;
}

import type { Locale } from '@/lib/i18n/config';

const JUST_NOW: Record<Locale, string> = {
  es: 'ahora mismo',
  pt: 'agora mesmo',
  en: 'just now',
};

/**
 * Tiempo relativo localizado ("hace 6 min" / "há 6 min" / "6 min ago").
 * Usa Intl.RelativeTimeFormat (estilo corto) para ES/PT/EN.
 * @param iso timestamp ISO 8601
 * @param now referencia (inyectable para tests / SSR determinista)
 * @param locale idioma activo
 */
export function timeAgo(iso: string, now: number = Date.now(), locale: Locale = 'es'): string {
  const min = Math.round((now - new Date(iso).getTime()) / 60000);
  // < 1 min o marca futura (desfases de reloj/zona) → "ahora mismo".
  if (min < 1) return JUST_NOW[locale];
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'always', style: 'short' });
  if (Math.abs(min) < 60) return rtf.format(-min, 'minute');
  const h = Math.round(min / 60);
  if (Math.abs(h) < 24) return rtf.format(-h, 'hour');
  return rtf.format(-Math.round(h / 24), 'day');
}

/**
 * Antigüedad compacta sin prefijo, para columnas densas: "6 min", "1 h 12".
 * Unidades neutras (min/h) válidas en ES/PT/EN.
 */
export function elapsedShort(iso: string, now: number = Date.now()): string {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r.toString().padStart(2, '0')}` : `${h} h`;
}

/**
 * Hora HH:MM en zona horaria peninsular fija (Europe/Madrid), determinista en
 * server y cliente (no depende de la TZ del entorno). Para "Actualizado 14:32".
 */
export function formatClock(ms: number): string {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Madrid',
  }).format(ms);
}

/**
 * Fecha y hora absolutas y legibles (Europe/Madrid), p. ej. "10 jul, 14:14".
 * Para el `title`/tooltip de un `<time>` (el relativo oculta la obsolescencia).
 * Determinista (TZ fija) en server y cliente.
 */
export function formatDateTime(iso: string, locale: Locale = 'es'): string {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Madrid',
  }).format(ms);
}
