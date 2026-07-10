import type { Theme } from '@/lib/design/tokens';

/**
 * Configuración del mapa MapLibre.
 * Estilos sin API key (OpenFreeMap). El oscuro (`dark`, fondo ~#0C0C0C) es el
 * modo por defecto "sala de control"; el claro (`positron`) para exteriores.
 */
export const MAP_STYLE: Record<Theme, string> = {
  dark: process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/dark',
  light: process.env.NEXT_PUBLIC_MAP_STYLE_URL_LIGHT ?? 'https://tiles.openfreemap.org/styles/positron',
};

/** URLs de las geometrías estáticas (generadas por scripts/gen-mask.mjs). */
export const GEO = {
  outline: '/geo/es-pt.geojson',
  mask: '/geo/es-pt-mask.geojson',
} as const;

/** Encuadre inicial: península + Baleares (las islas atlánticas se ven en el inset). */
export const IBERIA_BOUNDS: [[number, number], [number, number]] = [
  [-9.8, 35.9],
  [4.6, 44.0],
];

export const INITIAL_VIEW = {
  longitude: -4.5,
  latitude: 40,
  zoom: 5,
  bounds: IBERIA_BOUNDS,
  fitBoundsOptions: { padding: 40 },
};

export const MIN_ZOOM = 4;
export const MAX_ZOOM = 12;

/** Paint de la máscara (mundo atenuado) y del halo de ES+PT, según tema. */
export function maskPaint(theme: Theme) {
  return theme === 'light'
    ? {
        dim: { color: '#C9C3B4', opacity: 0.5 },
        halo: '#2A5FA8',
        outline: '#2A5FA8',
      }
    : {
        dim: { color: '#0A0F14', opacity: 0.72 },
        halo: '#3D7DD8',
        outline: '#7FA9E8',
      };
}
