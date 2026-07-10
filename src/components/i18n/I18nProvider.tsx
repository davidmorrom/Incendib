'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { es, getDictionary, isLocale, type Dictionary } from '@/lib/i18n';
import { useUIStore } from '@/lib/store';

const DictContext = createContext<Dictionary>(es);

const THEME_KEY = 'iberfuego-theme';
const LOCALE_KEY = 'iberfuego-locale';

/**
 * Provee el diccionario del idioma activo a los componentes cliente y
 * sincroniza las preferencias (tema, idioma) con localStorage y el atributo
 * data-theme. El diccionario ES está en el bundle (default síncrono); PT/EN se
 * cargan al vuelo al cambiar de idioma. El script inline de layout.tsx ya fija
 * data-theme antes del primer paint, así que aquí no tocamos el DOM hasta
 * haber hidratado la preferencia (evita parpadeo).
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);
  const setTheme = useUIStore((s) => s.setTheme);
  const theme = useUIStore((s) => s.theme);

  const [dict, setDict] = useState<Dictionary>(es);
  const hydrated = useRef(false);

  // Hidratar preferencias guardadas una sola vez.
  useEffect(() => {
    try {
      const l = localStorage.getItem(LOCALE_KEY);
      if (l && isLocale(l)) setLocale(l);
      const t = localStorage.getItem(THEME_KEY);
      if (t === 'dark' || t === 'light') setTheme(t);
    } catch {
      /* almacenamiento no disponible: seguimos con los valores por defecto */
    }
    hydrated.current = true;
  }, [setLocale, setTheme]);

  // Cargar el diccionario del idioma activo.
  useEffect(() => {
    let alive = true;
    getDictionary(locale).then((d) => {
      if (alive) setDict(d);
    });
    return () => {
      alive = false;
    };
  }, [locale]);

  // Aplicar + persistir tema.
  useEffect(() => {
    if (!hydrated.current) return;
    const root = document.documentElement;
    try {
      if (theme === null) {
        root.removeAttribute('data-theme');
        localStorage.removeItem(THEME_KEY);
      } else {
        root.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
      }
    } catch {
      /* noop */
    }
  }, [theme]);

  // Persistir idioma.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(LOCALE_KEY, locale);
    } catch {
      /* noop */
    }
  }, [locale]);

  return <DictContext.Provider value={dict}>{children}</DictContext.Provider>;
}

/** Diccionario del idioma activo. */
export function useDict(): Dictionary {
  return useContext(DictContext);
}
