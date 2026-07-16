'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { es, getDictionary, isLocale, type Dictionary } from '@/lib/i18n';
import { useUIStore } from '@/lib/store';
import { isBasemap } from '@/lib/map/config';

const DictContext = createContext<Dictionary>(es);

const THEME_KEY = 'incendib-theme';
const LOCALE_KEY = 'incendib-locale';
const BASEMAP_KEY = 'incendib-basemap';

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
  const setBasemap = useUIStore((s) => s.setBasemap);
  const basemap = useUIStore((s) => s.basemap);

  const [dict, setDict] = useState<Dictionary>(es);
  // Estado (no ref): al cambiar provoca re-render, de modo que los efectos de
  // aplicar-tema/persistir-idioma NO se ejecuten en el primer render (cuando
  // theme aún es null). Con `:root` en claro, ejecutarlos entonces quitaría
  // data-theme y provocaría un parpadeo oscuro→claro→oscuro a los usuarios en
  // modo oscuro.
  const [hydrated, setHydrated] = useState(false);

  // Hidratar preferencias guardadas una sola vez.
  useEffect(() => {
    try {
      const l = localStorage.getItem(LOCALE_KEY);
      if (l && isLocale(l)) setLocale(l);
      const t = localStorage.getItem(THEME_KEY);
      if (t === 'dark' || t === 'light') setTheme(t);
      const b = localStorage.getItem(BASEMAP_KEY);
      if (isBasemap(b)) setBasemap(b);
    } catch {
      /* almacenamiento no disponible: seguimos con los valores por defecto */
    }
    setHydrated(true);
  }, [setLocale, setTheme, setBasemap]);

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

  // Aplicar + persistir tema (solo tras hidratar, con el tema ya resuelto).
  useEffect(() => {
    if (!hydrated) return;
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
    // La barra del navegador (theme-color) sigue al tema activo; null = claro.
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', theme === 'dark' ? '#0C1117' : '#F4F2EC');
  }, [theme, hydrated]);

  // Persistir idioma.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LOCALE_KEY, locale);
    } catch {
      /* noop */
    }
  }, [locale, hydrated]);

  // Persistir mapa base.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(BASEMAP_KEY, basemap);
    } catch {
      /* noop */
    }
  }, [basemap, hydrated]);

  return <DictContext.Provider value={dict}>{children}</DictContext.Provider>;
}

/** Diccionario del idioma activo. */
export function useDict(): Dictionary {
  return useContext(DictContext);
}
