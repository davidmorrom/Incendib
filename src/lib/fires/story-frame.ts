/**
 * Geometría del encuadre de la imagen de historia (`/f/[slug]/story`).
 *
 * Dado el/los anillos del perímetro de área quemada de un incendio (WGS84
 * `[lon,lat]`), calcula un recuadro con relación de aspecto fija (9:16) en Web
 * Mercator (EPSG:3857) centrado en la cicatriz y con margen, y proyecta
 * cualquier punto a píxeles del lienzo. Todo es **puro** (sin I/O): así se
 * prueba en aislamiento y lo comparte el fondo de satélite (bbox de la petición
 * WMS/Sentinel Hub) y la capa de perímetro (SVG superpuesto), garantizando que
 * ambos queden alineados píxel a píxel.
 */

const MERC_R = 6378137; // radio de la esfera de Web Mercator (m)
const MAX_LAT = 85.05112878; // límite de Web Mercator

/** lon/lat (WGS84) → EPSG:3857 (Web Mercator), en metros proyectados. */
export function mercator(lon: number, lat: number): [number, number] {
  const clamped = Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));
  const x = (MERC_R * lon * Math.PI) / 180;
  const y = MERC_R * Math.log(Math.tan(Math.PI / 4 + (clamped * Math.PI) / 180 / 2));
  return [x, y];
}

/** Recuadro en EPSG:3857 `[minX, minY, maxX, maxY]`. */
export type Bbox3857 = [number, number, number, number];

export interface FrameOptions {
  /** Relación de aspecto ancho/alto del lienzo (p. ej. `1080/1920`). */
  aspect: number;
  /** Margen alrededor de la cicatriz (`1` = sin margen; `1.5` = +50 %). */
  padding?: number;
  /** Semialtura mínima (m proyectados): evita sobre-zoom de cicatrices minúsculas. */
  minHalfHeight?: number;
  /** Semialtura máxima (m proyectados): mantiene la cicatriz reconocible. */
  maxHalfHeight?: number;
}

/**
 * Recuadro con la relación de aspecto pedida que enmarca **todos** los `rings`
 * (en `[lon,lat]`) con margen, respetando los topes de semialtura. Nunca
 * recorta: crece la dimensión que falte para cuadrar el aspecto. Devuelve `null`
 * si no hay ningún punto.
 */
export function frameRings(rings: [number, number][][], opts: FrameOptions): Bbox3857 | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let count = 0;
  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      const [x, y] = mercator(lon, lat);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      count++;
    }
  }
  if (count === 0) return null;

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const pad = opts.padding ?? 1.5;
  let halfW = ((maxX - minX) / 2) * pad;
  let halfH = ((maxY - minY) / 2) * pad;

  // Cuadrar al aspecto (ancho/alto = aspect): crece la dimensión más pequeña.
  const { aspect } = opts;
  if (halfW <= 0 && halfH <= 0) {
    halfW = 0;
    halfH = 0;
  } else if (halfW / halfH > aspect) {
    halfH = halfW / aspect;
  } else {
    halfW = halfH * aspect;
  }

  // Topes de semialtura (el ancho la sigue para conservar el aspecto). El suelo
  // es `max(minHalfHeight, ε)`: incluso sin `minHalfHeight`, un anillo degenerado
  // (todos los vértices iguales → extensión 0) NUNCA debe producir un recuadro de
  // área nula, que haría dividir por cero en `projectToPixels` (coordenadas NaN).
  const minH = Math.max(opts.minHalfHeight ?? 0, 1e-6);
  const maxH = opts.maxHalfHeight ?? Infinity;
  if (halfH < minH) {
    halfH = minH;
    halfW = minH * aspect;
  } else if (halfH > maxH) {
    halfH = maxH;
    halfW = maxH * aspect;
  }

  return [cx - halfW, cy - halfH, cx + halfW, cy + halfH];
}

/** Recuadro con el aspecto pedido centrado en `[lon,lat]`, con `halfHeight` (m proyectados). */
export function frameCenter([lon, lat]: [number, number], aspect: number, halfHeight: number): Bbox3857 {
  const [cx, cy] = mercator(lon, lat);
  const halfW = halfHeight * aspect;
  return [cx - halfW, cy - halfHeight, cx + halfW, cy + halfHeight];
}

/** Proyecta `[lon,lat]` a píxel `[px,py]` dentro de un lienzo `width`×`height` para `bbox`. */
export function projectToPixels(
  bbox: Bbox3857,
  width: number,
  height: number,
  lon: number,
  lat: number,
): [number, number] {
  const [x, y] = mercator(lon, lat);
  const [minX, minY, maxX, maxY] = bbox;
  const px = ((x - minX) / (maxX - minX)) * width;
  const py = ((maxY - y) / (maxY - minY)) * height; // Y del lienzo va hacia abajo
  return [px, py];
}

/** Convierte un anillo `[lon,lat][]` en la cadena `points` de un `<polygon>` SVG. */
export function ringToSvgPoints(
  ring: [number, number][],
  bbox: Bbox3857,
  width: number,
  height: number,
): string {
  return ring
    .map((p) => {
      const [px, py] = projectToPixels(bbox, width, height, p[0], p[1]);
      return `${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(' ');
}
