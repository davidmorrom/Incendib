import { describe, it, expect } from 'vitest';
import { generatePerimeter } from './perimeter';

describe('generatePerimeter', () => {
  const center: [number, number] = [-6.29, 40.36];

  it('es determinista para el mismo slug', () => {
    const a = generatePerimeter('las-hurdes', center, 3241);
    const b = generatePerimeter('las-hurdes', center, 3241);
    expect(a).toEqual(b);
  });

  it('varía con el slug', () => {
    const a = generatePerimeter('las-hurdes', center, 3241);
    const b = generatePerimeter('tejeda', center, 3241);
    expect(a).not.toEqual(b);
  });

  it('devuelve un anillo cerrado con vértices suficientes', () => {
    const ring = generatePerimeter('x', center, 1000, 32);
    expect(ring.length).toBe(33); // 32 + cierre
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it('un área mayor produce un radio mayor', () => {
    const small = generatePerimeter('s', center, 300);
    const big = generatePerimeter('s', center, 30000);
    const span = (r: [number, number][]) => {
      const lats = r.map((p) => p[1]);
      return Math.max(...lats) - Math.min(...lats);
    };
    expect(span(big)).toBeGreaterThan(span(small));
  });
});
