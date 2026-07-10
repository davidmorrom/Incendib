import es from './dictionaries/es';
import type { Locale } from './config';

/** El diccionario ES define la forma; PT/EN deben cumplirla. */
export type Dictionary = typeof es;

const loaders: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  es: async () => ({ default: es }),
  pt: () => import('./dictionaries/pt'),
  en: () => import('./dictionaries/en'),
};

/** Carga el diccionario de un idioma (dynamic import salvo ES, ya en bundle). */
export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const mod = await loaders[locale]();
  return mod.default;
}

/**
 * Interpola marcadores {clave} en una cadena traducida.
 * t('Actualizado {when}', { when: 'hace 6 min' })
 */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

export { es };
export * from './config';
