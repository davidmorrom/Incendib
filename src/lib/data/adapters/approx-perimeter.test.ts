import { describe, it, expect } from 'vitest';
import { deriveApproxPerimeters, estimatePerimeterHectares } from './index';
import type { Fire, Hotspot } from '@/types/fire';

function fire(p: Partial<Fire>): Fire {
  return {
    slug: 'x',
    name: 'X',
    municipality: '—',
    province: '—',
    region: 'R',
    country: 'ES',
    state: 'activo',
    level: null,
    hectares: 0,
    coordinates: [-4.5, 40.4],
    startedAt: '2026-07-12T00:00:00Z',
    updatedAt: '2026-07-12T00:00:00Z',
    sources: ['jcyl'],
    ...p,
  };
}

function hotspot(coords: [number, number]): Hotspot {
  return {
    id: `h-${coords.join()}`,
    coordinates: coords,
    frp: 12,
    confidence: 'nominal',
    sensor: 'VIIRS',
    acquiredAt: '2026-07-12T00:00:00Z',
  };
}

// Triángulo de focos a unos cientos de metros del incendio (dentro de 3 km).
const cluster: Hotspot[] = [
  hotspot([-4.505, 40.404]),
  hotspot([-4.495, 40.404]),
  hotspot([-4.5, 40.41]),
];
const far = hotspot([2.0, 41.5]);

describe('deriveApproxPerimeters', () => {
  it('dibuja una extensión aproximada con ≥3 focos cercanos, sin tocar hectáreas', () => {
    const [out] = deriveApproxPerimeters([fire({})], cluster);
    expect(out?.perimeter).toBeDefined();
    expect(out?.perimeter?.length).toBeGreaterThanOrEqual(4);
    expect(out?.perimeterApprox).toBe(true);
    expect(out?.hectares).toBe(0);
    expect(out?.hectaresApprox).toBeUndefined();
  });

  it('NO dibuja nada con menos de 3 focos cercanos (sin dato mejor que forma inventada)', () => {
    const [out] = deriveApproxPerimeters([fire({})], cluster.slice(0, 2));
    expect(out?.perimeter).toBeUndefined();
    expect(out?.perimeterApprox).toBeUndefined();
  });

  it('NO dibuja nada si los focos están lejos (>3 km)', () => {
    const [out] = deriveApproxPerimeters([fire({})], [far, far, far]);
    expect(out?.perimeter).toBeUndefined();
  });

  it('NO pisa un perímetro ya existente (nativo o EFFIS)', () => {
    const own: [number, number][] = [
      [1, 1],
      [2, 1],
      [2, 2],
      [1, 1],
    ];
    const withOwn = fire({ perimeter: own, coordinates: [-4.5, 40.4] });
    const [out] = deriveApproxPerimeters([withOwn], cluster);
    expect(out?.perimeter).toEqual(own);
    expect(out?.perimeterApprox).toBeUndefined();
  });

  it('solo aplica a incidentes activos (no controlado/estabilizado/extinguido)', () => {
    const [out] = deriveApproxPerimeters([fire({ state: 'controlado' })], cluster);
    expect(out?.perimeter).toBeUndefined();
  });

  it('focos colineales o coincidentes: sin envolvente válida, se deja sin forma', () => {
    const collinear = [
      hotspot([-4.51, 40.4]),
      hotspot([-4.5, 40.4]),
      hotspot([-4.49, 40.4]),
    ];
    const [out] = deriveApproxPerimeters([fire({})], collinear);
    expect(out?.perimeter).toBeUndefined();
  });

  it('sin focos devuelve los incendios sin tocar', () => {
    const input = [fire({})];
    expect(deriveApproxPerimeters(input, [])).toEqual(input);
  });
});

describe('estimatePerimeterHectares', () => {
  it('calcula el área aproximada (ha) de un anillo ~1 km²', () => {
    // Cuadrado de ~1 km de lado a lat ~40°N (1°lon≈85.3km, 1°lat≈111.2km).
    const ring: [number, number][] = [
      [-4.5, 40.4],
      [-4.5 + 0.01172, 40.4],
      [-4.5 + 0.01172, 40.4 + 0.00899],
      [-4.5, 40.4 + 0.00899],
      [-4.5, 40.4],
    ];
    const ha = estimatePerimeterHectares(ring);
    // ~1 km² = 100 ha; margen amplio por la aproximación de grados→km.
    expect(ha).toBeGreaterThan(80);
    expect(ha).toBeLessThan(120);
  });
});
