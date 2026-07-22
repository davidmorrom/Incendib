/**
 * Test punto-en-región para el ámbito España + Portugal, contra el contorno
 * real de países (src/lib/geo/es-pt-land.json, copia del que dibuja el mapa).
 *
 * Se usa SOLO en el servidor para recortar los focos de FIRMS a ES+PT: un bbox
 * no basta porque la frontera con Francia (Pirineos, Landas) y Andorra son
 * diagonales y comparten latitud/longitud con territorio español. El ray-casting
 * contra el polígono real excluye Francia/Andorra sin recortar la costa ibérica.
 */

import land from './es-pt-land.json';

type Ring = [number, number][];
interface Poly {
  ring: Ring;
  bbox: [number, number, number, number];
}

const FEATURES = (land as { features: { geometry: { coordinates: number[][][] } }[] }).features;

const POLYS: Poly[] = FEATURES.map((f) => {
  const ring = f.geometry.coordinates[0] as Ring;
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const [x, y] of ring) {
    if (x < minLon) minLon = x;
    if (x > maxLon) maxLon = x;
    if (y < minLat) minLat = y;
    if (y > maxLat) maxLat = y;
  }
  return { ring, bbox: [minLon, minLat, maxLon, maxLat] };
});

/** Ray-casting estándar (par/impar) sobre un anillo [lon,lat]. Exportado para
 * reutilizarlo con otros anillos (p. ej. perímetros EFFIS en los adaptadores). */
export function inRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const pi = ring[i]!;
    const pj = ring[j]!;
    const xi = pi[0];
    const yi = pi[1];
    const xj = pj[0];
    const yj = pj[1];
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** ¿El punto [lon,lat] cae en tierra de España o Portugal? */
export function inEsPt(lon: number, lat: number): boolean {
  for (const p of POLYS) {
    const [mnx, mny, mxx, mxy] = p.bbox;
    if (lon < mnx || lon > mxx || lat < mny || lat > mxy) continue;
    if (inRing(lon, lat, p.ring)) return true;
  }
  return false;
}
