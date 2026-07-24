import { describe, it, expect } from 'vitest';
import { mercator, frameRings, frameCenter, projectToPixels, ringToSvgPoints } from './story-frame';

const ASPECT = 1080 / 1920; // 9:16

/** Anillo cuadrado de `half` grados alrededor de `[lon,lat]`. */
function square([lon, lat]: [number, number], half: number): [number, number][] {
  return [
    [lon - half, lat - half],
    [lon + half, lat - half],
    [lon + half, lat + half],
    [lon - half, lat + half],
    [lon - half, lat - half],
  ];
}

/** ¿Cumple el bbox la relación de aspecto pedida (ancho/alto)? */
function bboxAspect([minX, minY, maxX, maxY]: [number, number, number, number]): number {
  return (maxX - minX) / (maxY - minY);
}

describe('mercator', () => {
  it('proyecta el origen a [0,0]', () => {
    const [x, y] = mercator(0, 0);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(0, 6);
  });

  it('es monótona: más longitud → más X, más latitud → más Y', () => {
    expect(mercator(1, 0)[0]).toBeGreaterThan(mercator(0, 0)[0]);
    expect(mercator(0, 40)[1]).toBeGreaterThan(mercator(0, 30)[1]);
  });

  it('acota latitudes fuera del rango de Web Mercator (no ±Infinity)', () => {
    expect(Number.isFinite(mercator(0, 90)[1])).toBe(true);
    expect(Number.isFinite(mercator(0, -90)[1])).toBe(true);
  });
});

describe('frameRings', () => {
  const center: [number, number] = [-4.58, 40.42];

  it('devuelve null sin puntos', () => {
    expect(frameRings([], { aspect: ASPECT })).toBeNull();
    expect(frameRings([[]], { aspect: ASPECT })).toBeNull();
  });

  it('respeta la relación de aspecto pedida', () => {
    const bbox = frameRings([square(center, 0.05)], { aspect: ASPECT, padding: 1.5 })!;
    expect(bboxAspect(bbox)).toBeCloseTo(ASPECT, 5);
  });

  it('queda centrado en el bbox (Mercator) del anillo', () => {
    const ring = square(center, 0.05);
    const bbox = frameRings([ring], { aspect: ASPECT, padding: 1.5 })!;
    // Mercator es no lineal en latitud: el centro es el punto medio del bbox
    // proyectado del anillo, no `mercator(latDelCentro)`.
    const xs = ring.map(([lo, la]) => mercator(lo, la)[0]);
    const ys = ring.map(([lo, la]) => mercator(lo, la)[1]);
    const cxm = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cym = (Math.min(...ys) + Math.max(...ys)) / 2;
    expect((bbox[0] + bbox[2]) / 2).toBeCloseTo(cxm, 3);
    expect((bbox[1] + bbox[3]) / 2).toBeCloseTo(cym, 3);
  });

  it('el margen (padding) agranda el recuadro pero no lo descentra', () => {
    const tight = frameRings([square(center, 0.05)], { aspect: ASPECT, padding: 1 })!;
    const loose = frameRings([square(center, 0.05)], { aspect: ASPECT, padding: 1.6 })!;
    expect(loose[3] - loose[1]).toBeGreaterThan(tight[3] - tight[1]);
    expect((tight[0] + tight[2]) / 2).toBeCloseTo((loose[0] + loose[2]) / 2, 3);
  });

  it('enmarca TODOS los anillos (perímetro + extensión)', () => {
    const a = square([-4.7, 40.4], 0.02);
    const b = square([-4.4, 40.45], 0.02); // muy separado del primero
    const bbox = frameRings([a, b], { aspect: ASPECT, padding: 1 })!;
    // Todos los vértices deben caer dentro del recuadro.
    for (const ring of [a, b]) {
      for (const [lon, lat] of ring) {
        const [x, y] = mercator(lon, lat);
        expect(x).toBeGreaterThanOrEqual(bbox[0]);
        expect(x).toBeLessThanOrEqual(bbox[2]);
        expect(y).toBeGreaterThanOrEqual(bbox[1]);
        expect(y).toBeLessThanOrEqual(bbox[3]);
      }
    }
  });

  it('aplica la semialtura mínima a una cicatriz minúscula (evita sobre-zoom)', () => {
    const tiny = frameRings([square(center, 0.0005)], { aspect: ASPECT, minHalfHeight: 4500 })!;
    expect((tiny[3] - tiny[1]) / 2).toBeCloseTo(4500, 0);
    expect(bboxAspect(tiny)).toBeCloseTo(ASPECT, 5);
  });

  it('aplica la semialtura máxima a una cicatriz enorme (la mantiene reconocible)', () => {
    const huge = frameRings([square(center, 1)], { aspect: ASPECT, maxHalfHeight: 32000 })!;
    expect((huge[3] - huge[1]) / 2).toBeCloseTo(32000, 0);
    expect(bboxAspect(huge)).toBeCloseTo(ASPECT, 5);
  });

  it('un anillo degenerado (vértices idénticos) no produce un recuadro nulo (evita NaN)', () => {
    // Sin minHalfHeight: el suelo ε debe evitar un bbox de área 0 → NaN al proyectar.
    const degenerate: [number, number][] = [center, center, center];
    const bbox = frameRings([degenerate], { aspect: ASPECT })!;
    expect(bbox.every(Number.isFinite)).toBe(true);
    expect(bbox[2] - bbox[0]).toBeGreaterThan(0);
    expect(bbox[3] - bbox[1]).toBeGreaterThan(0);
    const [px, py] = projectToPixels(bbox, 1080, 1920, center[0], center[1]);
    expect(Number.isFinite(px)).toBe(true);
    expect(Number.isFinite(py)).toBe(true);
  });
});

describe('frameCenter', () => {
  it('centra el recuadro y respeta la relación de aspecto', () => {
    const bbox = frameCenter([-4.58, 40.42], ASPECT, 9000);
    const [mx, my] = mercator(-4.58, 40.42);
    expect((bbox[0] + bbox[2]) / 2).toBeCloseTo(mx, 3);
    expect((bbox[1] + bbox[3]) / 2).toBeCloseTo(my, 3);
    expect((bbox[3] - bbox[1]) / 2).toBeCloseTo(9000, 3);
    expect(bboxAspect(bbox)).toBeCloseTo(ASPECT, 5);
  });
});

describe('projectToPixels', () => {
  const bbox = frameCenter([0, 0], ASPECT, 10000);

  it('el centro del bbox cae en el centro del lienzo', () => {
    const [px, py] = projectToPixels(bbox, 1080, 1920, 0, 0);
    expect(px).toBeCloseTo(540, 3);
    expect(py).toBeCloseTo(960, 3);
  });

  it('la esquina superior-izquierda del bbox cae en [0,0] del lienzo', () => {
    // minX corresponde a x=bbox[0]; maxY (bbox[3]) es la parte de arriba (py=0).
    const [, py] = projectToPixels(bbox, 1080, 1920, 0, 85.05112878);
    // Un punto por encima del bbox proyecta por encima del lienzo (py < 0).
    expect(py).toBeLessThan(0);
  });

  it('el eje Y del lienzo apunta hacia abajo (más latitud → menos py)', () => {
    const [, pyNorth] = projectToPixels(bbox, 1080, 1920, 0, 0.05);
    const [, pySouth] = projectToPixels(bbox, 1080, 1920, 0, -0.05);
    expect(pyNorth).toBeLessThan(pySouth);
  });
});

describe('ringToSvgPoints', () => {
  it('produce una lista "x,y x,y …" con un punto por vértice', () => {
    const bbox = frameCenter([-4.58, 40.42], ASPECT, 10000);
    const ring = square([-4.58, 40.42], 0.02);
    const pts = ringToSvgPoints(ring, bbox, 1080, 1920).split(' ');
    expect(pts).toHaveLength(ring.length);
    expect(pts[0]).toMatch(/^-?\d+(\.\d)?,-?\d+(\.\d)?$/);
  });
});
