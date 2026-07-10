/**
 * Geometría de perímetro de área quemada.
 *
 * En modo LIVE, el perímetro real proviene de EFFIS/Copernicus (capa
 * `ms:modis.ba.poly`, WFS→GeoJSON, refinada con Sentinel-2 a ~20 m) — el
 * "metro a metro". En modo MOCK sintetizamos un polígono plausible alrededor
 * del foco, con área derivada de las hectáreas y forma irregular con lóbulos
 * suaves. Es DETERMINISTA (semilla = slug) para no romper la hidratación.
 */

/** Anillo exterior del polígono: pares [lon, lat], cerrado. */
export type Ring = [number, number][];

// PRNG determinista (mulberry32) sembrado con un hash del slug.
function seedFromString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const M_PER_DEG_LAT = 111_320;

/**
 * Genera un perímetro irregular alrededor de `center` cuya superficie aproxima
 * `hectares`. `points` vértices; el radio se modula con 3 armónicos para dar
 * lóbulos naturales de frente de fuego.
 */
export function generatePerimeter(
  slug: string,
  center: [number, number],
  hectares: number,
  points = 32,
): Ring {
  const rand = mulberry32(seedFromString(slug));
  const [lon, lat] = center;
  const baseR = Math.sqrt((hectares * 10_000) / Math.PI); // radio equivalente en m
  const mPerDegLon = M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);

  // Armónicos: k = nº de lóbulos, a = amplitud, p = fase.
  const harmonics = [
    { k: 2, a: 0.18 * rand() + 0.06, p: rand() * Math.PI * 2 },
    { k: 3, a: 0.12 * rand() + 0.04, p: rand() * Math.PI * 2 },
    { k: 5, a: 0.08 * rand() + 0.03, p: rand() * Math.PI * 2 },
  ];

  const ring: Ring = [];
  for (let i = 0; i < points; i++) {
    const ang = (i / points) * Math.PI * 2;
    let factor = 1;
    for (const h of harmonics) factor += h.a * Math.sin(h.k * ang + h.p);
    const r = baseR * Math.max(0.45, factor);
    const dLat = (r * Math.cos(ang)) / M_PER_DEG_LAT;
    const dLon = (r * Math.sin(ang)) / mPerDegLon;
    ring.push([lon + dLon, lat + dLat]);
  }
  ring.push(ring[0]!); // cerrar
  return ring;
}
