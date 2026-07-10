/**
 * i18n de Iberfuego. Tres idiomas: ES (por defecto), PT, EN.
 *
 * Nota de arquitectura: se usa un diccionario tipado propio (ligero, sin
 * routing por locale) porque el idioma es una preferencia del usuario, no una
 * ruta. El dato bilingüe (estados PT "em curso", etc.) se mantiene SIEMPRE en
 * su idioma original independientemente de la UI. Migrable a next-intl si se
 * necesitara routing/SEO por idioma.
 */

export const locales = ['es', 'pt', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'es';

export const localeNames: Record<Locale, string> = {
  es: 'Español',
  pt: 'Português',
  en: 'English',
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
