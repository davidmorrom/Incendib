import { describe, it, expect } from 'vitest';
import { attachPerimeters } from './index';
import type { Fire } from '@/types/fire';

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
    coordinates: [0, 0],
    startedAt: '2026-07-10T00:00:00Z',
    updatedAt: '2026-07-10T00:00:00Z',
    sources: ['jcyl'],
    ...p,
  };
}

/** Área quemada EFFIS (con perímetro) centrada en `coords`. */
function area(coords: [number, number], hectares: number): Fire {
  const [lon, lat] = coords;
  const ring: [number, number][] = [
    [lon - 0.01, lat - 0.01],
    [lon + 0.01, lat - 0.01],
    [lon + 0.01, lat + 0.01],
    [lon - 0.01, lat + 0.01],
    [lon - 0.01, lat - 0.01],
  ];
  return fire({ slug: 'effis', state: 'extinguido', hectares, coordinates: [lon, lat], sources: ['effis'], perimeter: ring });
}

describe('attachPerimeters', () => {
  const perims = [area([-4.505, 40.405], 15), area([-6.003, 42.001], 50)];

  it('NO sobrescribe la superficie oficial (caso El Barraco: 140 vs EFFIS 15)', () => {
    const official = fire({ slug: 'off', coordinates: [-4.5, 40.4], hectares: 140 });
    const [out] = attachPerimeters([official], perims);
    expect(out?.hectares).toBe(140);
    expect(out?.hectaresApprox).toBeFalsy();
    expect(out?.perimeter).toBeDefined(); // sí recibe forma
  });

  it('rellena superficie estimada (approx) cuando no hay cifra oficial', () => {
    const noData = fire({ slug: 'nd', coordinates: [-6.0, 42.0], hectares: 0 });
    const [out] = attachPerimeters([noData], perims);
    expect(out?.hectares).toBe(50);
    expect(out?.hectaresApprox).toBe(true);
    expect(out?.perimeter).toBeDefined();
  });

  it('no adjunta nada si el área quemada está lejos (>12 km)', () => {
    const far = fire({ slug: 'far', coordinates: [0, 41], hectares: 0 });
    const [out] = attachPerimeters([far], perims);
    expect(out?.perimeter).toBeUndefined();
    expect(out?.hectares).toBe(0);
    expect(out?.hectaresApprox).toBeFalsy();
  });

  it('respeta un perímetro ya presente (no lo pisa)', () => {
    const own: [number, number][] = [
      [1, 1],
      [2, 1],
      [2, 2],
      [1, 1],
    ];
    const withPerim = fire({ slug: 'wp', coordinates: [-4.5, 40.4], perimeter: own });
    const [out] = attachPerimeters([withPerim], perims);
    expect(out?.perimeter).toEqual(own);
  });

  it('sin perímetros de entrada, devuelve los incendios tal cual', () => {
    const f = fire({ slug: 'a', hectares: 0 });
    expect(attachPerimeters([f], [])).toEqual([f]);
  });
});
