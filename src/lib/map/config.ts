import type { StyleSpecification } from 'maplibre-gl';
import type { Theme } from '@/lib/design/tokens';

/**
 * Configuración del mapa MapLibre.
 *
 * El usuario elige el **mapa base** (`Basemap`) con independencia del tema de
 * la UI: el tema sigue siendo claro por defecto, pero el mapa puede mostrarse
 * con imagen de satélite o relieve. Todos los estilos son **sin API key**:
 * - claro/oscuro: vectoriales OpenFreeMap (OSM).
 * - satélite: mosaico anual sin nubes Sentinel-2 (EOX) + etiquetas OSM (EOX).
 * - relieve: EOX Terrain Light.
 *
 * Licencias/atribución de las capas de terceros: ver `docs/DATA-SOURCES.md`.
 * Los endpoints gratuitos de EOX son «best-effort» (sin SLA): adecuados para el
 * tráfico modesto de un visor sin ánimo de lucro; documentado como limitación.
 */

/** Mapa base seleccionable. `auto` sigue el tema (claro→positron, oscuro→dark). */
export type Basemap = 'auto' | 'claro' | 'oscuro' | 'satelite' | 'relieve';
/** Mapa base ya resuelto a un estilo concreto (sin `auto`). */
export type ResolvedBasemap = Exclude<Basemap, 'auto'>;

// `||` (no `??`): una env var vacía ("") debe caer al valor por defecto, no
// dejar una URL de estilo vacía que rompería el mapa.
/**
 * Estilos vectoriales OpenFreeMap (sin API key). El oscuro (`dark`, ~#0C0C0C)
 * es la "sala de control"; el claro (`positron`) por defecto. Lo usa también el
 * minimapa de la ficha (FireMiniMap), que sigue el tema.
 */
export const MAP_STYLE: Record<Theme, string> = {
  dark: process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/dark',
  light: process.env.NEXT_PUBLIC_MAP_STYLE_URL_LIGHT || 'https://tiles.openfreemap.org/styles/positron',
};

// Glyphs para los estilos raster inline: nuestra capa de cúmulos de focos usa
// `text-font: ['Noto Sans Regular']`, que necesita un servidor de fuentes en el
// estilo raíz. OpenFreeMap los sirve sin clave (mismo proveedor que los estilos
// vectoriales).
const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

// EOX Maps (WMTS RESTful, sin clave). El orden de ruta es /{z}/{y}/{x}, que
// coincide con la plantilla raster por defecto de MapLibre.
const EOX = 'https://tiles.maps.eox.at/wmts/1.0.0';
// Año del mosaico Sentinel-2 cloudless. 2018+ es CC-BY-NC-SA 4.0 (uso no
// comercial, que es nuestro caso). Reciente para reflejar el paisaje actual.
const S2_YEAR = '2024';

/** Satélite: Sentinel-2 cloudless (EOX) + etiquetas/límites OSM (EOX). */
const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS,
  sources: {
    s2: {
      type: 'raster',
      tiles: [`${EOX}/s2cloudless-${S2_YEAR}_3857/default/g/{z}/{y}/{x}.jpg`],
      tileSize: 256,
      maxzoom: 15,
      attribution: `Sentinel-2 cloudless ${S2_YEAR} © EOX · Copernicus`,
    },
    labels: {
      type: 'raster',
      tiles: [`${EOX}/overlay_bright_3857/default/g/{z}/{y}/{x}.png`],
      tileSize: 256,
      maxzoom: 17,
      attribution: '© OpenStreetMap',
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#0a1020' } },
    { id: 's2', type: 'raster', source: 's2' },
    { id: 'labels', type: 'raster', source: 'labels' },
  ],
};

/** Relieve: EOX Terrain Light (sombreado suave OSM + SRTM). */
const RELIEVE_STYLE: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS,
  sources: {
    terrain: {
      type: 'raster',
      tiles: [`${EOX}/terrain-light_3857/default/g/{z}/{y}/{x}.jpg`],
      tileSize: 256,
      maxzoom: 16,
      attribution: 'EOX Terrain Light · © OpenStreetMap · SRTM',
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#e9e5d8' } },
    { id: 'terrain', type: 'raster', source: 'terrain' },
  ],
};

/** Resuelve `auto` al estilo que corresponde según el tema activo. */
export function resolveBasemap(basemap: Basemap, theme: Theme): ResolvedBasemap {
  if (basemap === 'auto') return theme === 'dark' ? 'oscuro' : 'claro';
  return basemap;
}

/** Estilo MapLibre (URL o especificación inline) para el mapa base elegido. */
export function basemapStyle(basemap: Basemap, theme: Theme): string | StyleSpecification {
  switch (resolveBasemap(basemap, theme)) {
    case 'satelite':
      return SATELLITE_STYLE;
    case 'relieve':
      return RELIEVE_STYLE;
    case 'oscuro':
      return MAP_STYLE.dark;
    case 'claro':
    default:
      return MAP_STYLE.light;
  }
}

const ATTRIBUTIONS: Record<ResolvedBasemap, string> = {
  claro: '© OpenStreetMap · OpenFreeMap',
  oscuro: '© OpenStreetMap · OpenFreeMap',
  satelite: 'Sentinel-2 cloudless © EOX · Copernicus · OSM',
  relieve: 'EOX Terrain Light · © OpenStreetMap · SRTM',
};

/** Atribución obligatoria de la capa base, según el estilo resuelto. */
export function basemapAttribution(resolved: ResolvedBasemap): string {
  return ATTRIBUTIONS[resolved];
}

/** Opciones ofrecidas en el selector de la UI (orden de presentación). */
export const BASEMAP_OPTIONS: ResolvedBasemap[] = ['claro', 'satelite', 'relieve', 'oscuro'];

const ALL_BASEMAPS: Basemap[] = ['auto', 'claro', 'oscuro', 'satelite', 'relieve'];
/** Type guard para hidratar la preferencia guardada en localStorage. */
export function isBasemap(v: unknown): v is Basemap {
  return typeof v === 'string' && (ALL_BASEMAPS as string[]).includes(v);
}

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
// Sube a 14 (antes 12) para poder inspeccionar perímetros e imagen de satélite
// de cerca (la referencia geamap se ve a z14). Sentinel-2 cloudless y Terrain
// Light están cerca de su resolución nativa a este zoom.
export const MAX_ZOOM = 14;

/**
 * Paint de la máscara (mundo atenuado) y del halo/contorno de ES+PT, según el
 * mapa base resuelto: sobre satélite oscurecemos con un velo oscuro y realzamos
 * el contorno; sobre relieve un velo claro; en claro/oscuro como siempre.
 */
export function maskPaint(resolved: ResolvedBasemap) {
  switch (resolved) {
    case 'satelite':
      return { dim: { color: '#020610', opacity: 0.5 }, halo: '#BFE0FF', outline: '#EAF4FF' };
    case 'relieve':
      return { dim: { color: '#C9C3B4', opacity: 0.42 }, halo: '#2A5FA8', outline: '#2A5FA8' };
    case 'oscuro':
      return { dim: { color: '#0A0F14', opacity: 0.72 }, halo: '#3D7DD8', outline: '#7FA9E8' };
    case 'claro':
    default:
      return { dim: { color: '#C9C3B4', opacity: 0.5 }, halo: '#2A5FA8', outline: '#2A5FA8' };
  }
}
