'use client';

import { create } from 'zustand';
import type { Theme } from '@/lib/design/tokens';
import type { Locale } from '@/lib/i18n/config';
import type { Basemap } from '@/lib/map/config';

/** Pestaña activa de la barra inferior. */
export type Tab = 'mapa' | 'informe' | 'noticias' | 'fuentes' | 'historico';

/** Filtro por país del informe. */
export type CountryFilter = 'todos' | 'es' | 'pt';

/**
 * Estado de red. Señaliza degradación POR FUENTE (banner ámbar), nunca como
 * fallo global; `offline` sirve caché con antigüedad visible.
 */
export type NetworkState = 'loading' | 'ok' | 'error' | 'offline' | 'reconnecting';

interface UIState {
  tab: Tab;
  /** slug del incendio seleccionado, o null. Espeja la URL /f/{slug}. */
  selectedFire: string | null;
  filter: CountryFilter;
  legendOpen: boolean;
  shareOpen: boolean;
  copied: boolean;
  /** Capa de perímetros de área quemada (EFFIS) visible en el mapa. */
  perimetersVisible: boolean;
  /** Capa de focos satelitales (FIRMS) visible en el mapa. */
  hotspotsVisible: boolean;
  /**
   * Mapa base elegido (claro/satélite/relieve/oscuro); `auto` sigue el tema.
   * Satélite/relieve son vistas propias (no tienen claro/oscuro) y no cambian
   * al conmutar el tema; claro/oscuro sí lo siguen (ver `setTheme`).
   */
  basemap: Basemap;
  network: NetworkState;
  /** null = seguir preferencia del sistema. */
  theme: Theme | null;
  locale: Locale;

  setTab: (tab: Tab) => void;
  selectFire: (slug: string | null) => void;
  setFilter: (filter: CountryFilter) => void;
  toggleLegend: () => void;
  togglePerimeters: () => void;
  toggleHotspots: () => void;
  setBasemap: (b: Basemap) => void;
  openShare: () => void;
  closeShare: () => void;
  setCopied: (v: boolean) => void;
  setNetwork: (n: NetworkState) => void;
  setTheme: (t: Theme | null) => void;
  setLocale: (l: Locale) => void;
}

export const useUIStore = create<UIState>((set) => ({
  tab: 'mapa',
  selectedFire: null,
  filter: 'todos',
  legendOpen: false,
  shareOpen: false,
  copied: false,
  perimetersVisible: true,
  hotspotsVisible: false,
  basemap: 'auto',
  network: 'loading',
  theme: null,
  locale: 'es',

  setTab: (tab) => set({ tab }),
  selectFire: (selectedFire) => set({ selectedFire, legendOpen: false }),
  setFilter: (filter) => set({ filter }),
  toggleLegend: () => set((s) => ({ legendOpen: !s.legendOpen })),
  togglePerimeters: () => set((s) => ({ perimetersVisible: !s.perimetersVisible })),
  toggleHotspots: () => set((s) => ({ hotspotsVisible: !s.hotspotsVisible })),
  setBasemap: (basemap) => set({ basemap }),
  openShare: () => set({ shareOpen: true, copied: false }),
  closeShare: () => set({ shareOpen: false }),
  setCopied: (copied) => set({ copied }),
  setNetwork: (network) => set({ network }),
  // El mapa base "claro"/"oscuro" es la vista por defecto (sin satélite ni
  // relieve): al conmutar el tema de la UI, sigue con él. Si el usuario tiene
  // elegido satélite/relieve (vistas propias, sin par claro/oscuro) o `auto`
  // (ya sigue el tema por sí solo vía `resolveBasemap`), se deja igual.
  setTheme: (theme) =>
    set((s) => {
      if (s.basemap !== 'claro' && s.basemap !== 'oscuro') return { theme };
      const effective = theme ?? 'light';
      return { theme, basemap: effective === 'dark' ? 'oscuro' : 'claro' };
    }),
  setLocale: (locale) => set({ locale }),
}));
