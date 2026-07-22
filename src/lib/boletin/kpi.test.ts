import { describe, it, expect } from 'vitest';
import { computeKpi } from './aggregate';
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

const ring: [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 0],
];

describe('computeKpi', () => {
  it('cuenta un perímetro real (EFFIS/nativo) en el KPI de "perimeters"', () => {
    const k = computeKpi([fire({ perimeter: ring })], 0);
    expect(k.perimeters).toBe(1);
  });

  it('NO cuenta una extensión aproximada por FIRMS (perimeterApprox) en el KPI', () => {
    const k = computeKpi([fire({ perimeter: ring, perimeterApprox: true })], 0);
    expect(k.perimeters).toBe(0);
  });

  it('mezcla: solo cuenta los perímetros reales', () => {
    const k = computeKpi(
      [
        fire({ slug: 'a', perimeter: ring }),
        fire({ slug: 'b', perimeter: ring, perimeterApprox: true }),
        fire({ slug: 'c' }),
      ],
      0,
    );
    expect(k.perimeters).toBe(1);
  });
});
