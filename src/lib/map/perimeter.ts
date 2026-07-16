import type { FillLayerSpecification, LineLayerSpecification } from 'maplibre-gl';

/**
 * Estilo compartido de los perímetros (área quemada EFFIS + frente activo),
 * usado por el mapa principal y por el minimapa de la ficha.
 *
 * Técnica (inspirada en geamap/EFFIS y firemap): tres capas apiladas sobre la
 * misma fuente — relleno translúcido, un **casing** (trazo neutro ancho y
 * semitransparente) y encima la línea del color del estado. El casing es lo que
 * hace legible el perímetro sobre cualquier base (imagen de satélite oscura o
 * mapa claro). Línea **sólida** (sin discontinuo, como las referencias); el
 * frente activo (`kind: 'fire'`) va más grueso y opaco que el área ya quemada
 * (`kind: 'area'`), que además usa el color «extinguido»: distinción por
 * color + grosor, nunca solo color.
 *
 * El color de cada feature llega en la propiedad `color`; el tipo en `kind`.
 */
export interface PerimeterOpts {
  /** Base de imagen de satélite: sube el contraste (relleno y línea). */
  imagery: boolean;
  /** Base oscura (mapa «sala de control»): casing claro en vez de negro. */
  darkBase: boolean;
}

/** Layout común de las capas de línea (unir/rematar en redondo). */
export const PERIMETER_LINE_LAYOUT = {
  'line-join': 'round',
  'line-cap': 'round',
} satisfies LineLayerSpecification['layout'];

/** Relleno translúcido; más opaco en satélite y para el frente activo. */
export function perimeterFillPaint({ imagery }: PerimeterOpts): FillLayerSpecification['paint'] {
  return {
    'fill-color': ['get', 'color'],
    'fill-opacity': [
      'case',
      ['==', ['get', 'kind'], 'fire'],
      imagery ? 0.24 : 0.18,
      imagery ? 0.16 : 0.12,
    ],
  };
}

// MapLibre exige que `['zoom']` sea la entrada de nivel superior de un
// `interpolate`/`step`; no puede envolverse en un `*`. Por eso el grosor por
// tipo (frente activo más grueso que área quemada) va en la SALIDA de cada
// tramo como un `case`, nunca multiplicando por fuera del interpolate.

/** Casing neutro semitransparente bajo la línea (legibilidad sobre cualquier base). */
export function perimeterCasingPaint({ darkBase }: PerimeterOpts): LineLayerSpecification['paint'] {
  return {
    'line-color': darkBase ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)',
    'line-width': [
      'interpolate',
      ['linear'],
      ['zoom'],
      5, ['case', ['==', ['get', 'kind'], 'fire'], 4, 3.4],
      9, ['case', ['==', ['get', 'kind'], 'fire'], 4.8, 4.1],
      12, ['case', ['==', ['get', 'kind'], 'fire'], 6, 5.1],
      14, ['case', ['==', ['get', 'kind'], 'fire'], 7.2, 6.1],
    ],
    'line-blur': 0.5,
  };
}

/** Línea del color del estado; el frente activo más grueso y opaco. */
export function perimeterLinePaint({ imagery }: PerimeterOpts): LineLayerSpecification['paint'] {
  return {
    'line-color': ['get', 'color'],
    'line-width': [
      'interpolate',
      ['linear'],
      ['zoom'],
      5, ['case', ['==', ['get', 'kind'], 'fire'], 1.6, 1.1],
      9, ['case', ['==', ['get', 'kind'], 'fire'], 2.2, 1.5],
      12, ['case', ['==', ['get', 'kind'], 'fire'], 3, 2.1],
      14, ['case', ['==', ['get', 'kind'], 'fire'], 4, 2.8],
    ],
    'line-opacity': [
      'case',
      ['==', ['get', 'kind'], 'fire'],
      imagery ? 0.98 : 0.95,
      imagery ? 0.9 : 0.82,
    ],
  };
}
