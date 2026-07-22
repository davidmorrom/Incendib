import { describe, it, expect } from 'vitest';
import { dedupeMutualAidFires } from './index';
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

describe('dedupeMutualAidFires', () => {
  it('fusiona el caso real La Mierla/Guadalajara (INFORCYL + INFOCA, ~120 m)', () => {
    const mierla = fire({
      slug: 'cyl-mierla-la-42-106-26',
      name: 'Mierla (la)',
      coordinates: [-3.2374264589583754, 40.940111142687826],
      hectares: 0,
      sources: ['jcyl'],
    });
    const guadalajara = fire({
      slug: 'and-guadalajara-1088',
      name: 'Guadalajara',
      coordinates: [-3.236446192240136, 40.94092872093864],
      hectares: 35268,
      perimeterSourceSlug: 'effis-561620',
      sources: ['infoca'],
    });
    const out = dedupeMutualAidFires([mierla, guadalajara]);
    expect(out).toHaveLength(1);
    // Se conserva el más informativo (mayor superficie ya adjudicada).
    expect(out[0]?.slug).toBe('and-guadalajara-1088');
    expect(out[0]?.hectares).toBe(35268);
    // Ambas fuentes quedan anotadas (transparencia, no se oculta que hay dos partes).
    expect(out[0]?.sources).toEqual(expect.arrayContaining(['infoca', 'jcyl']));
  });

  it('NO fusiona incendios distintos de la misma fuente, por cerca que estén', () => {
    const a = fire({ slug: 'a', coordinates: [0, 0], sources: ['jcyl'] });
    const b = fire({ slug: 'b', coordinates: [0.0001, 0.0001], sources: ['jcyl'] });
    const out = dedupeMutualAidFires([a, b]);
    expect(out).toHaveLength(2);
  });

  it('NO fusiona fuentes distintas si están lejos (>1 km)', () => {
    const a = fire({ slug: 'a', coordinates: [-3.2, 40.9], sources: ['jcyl'] });
    const b = fire({ slug: 'b', coordinates: [-3.1, 40.9], sources: ['infoca'] });
    const out = dedupeMutualAidFires([a, b]);
    expect(out).toHaveLength(2);
  });

  it('NO fusiona si uno de los dos ya está extinguido (no describen el mismo episodio en curso)', () => {
    const a = fire({
      slug: 'a',
      coordinates: [-3.2374264589583754, 40.940111142687826],
      sources: ['jcyl'],
      state: 'activo',
    });
    const b = fire({
      slug: 'b',
      coordinates: [-3.236446192240136, 40.94092872093864],
      sources: ['infoca'],
      state: 'extinguido',
    });
    const out = dedupeMutualAidFires([a, b]);
    expect(out).toHaveLength(2);
  });

  it('conserva el perímetro real aunque el otro gemelo reporte más hectáreas (no solo el número manda)', () => {
    // Gemelo A: más hectáreas oficiales, pero SIN perímetro (no adjudicado a
    // ningún área EFFIS). Gemelo B: menos hectáreas, pero SÍ tiene un
    // perímetro real ya adjudicado por attachPerimeters. Perder ese perímetro
    // solo por el número de B ser menor dejaría el incidente sin forma real,
    // y el siguiente paso (deriveApproxPerimeters) le dibujaría una extensión
    // aproximada como si nunca hubiera tenido una oficial.
    const ring: [number, number][] = [
      [-3.2, 40.9],
      [-3.19, 40.9],
      [-3.19, 40.91],
      [-3.2, 40.9],
    ];
    const a = fire({
      slug: 'a-mas-hectareas-sin-forma',
      coordinates: [-3.2, 40.9],
      hectares: 300,
      sources: ['jcyl'],
    });
    const b = fire({
      slug: 'b-menos-hectareas-con-forma',
      coordinates: [-3.1995, 40.9002],
      hectares: 50,
      perimeter: ring,
      perimeterSourceSlug: 'effis-999',
      sources: ['infoca'],
    });
    const out = dedupeMutualAidFires([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0]?.slug).toBe('b-menos-hectareas-con-forma');
    expect(out[0]?.perimeter).toEqual(ring);
    expect(out[0]?.perimeterSourceSlug).toBe('effis-999');
    expect(out[0]?.sources).toEqual(expect.arrayContaining(['infoca', 'jcyl']));
  });

  it('es inerte con una lista vacía o sin duplicados', () => {
    expect(dedupeMutualAidFires([])).toEqual([]);
    const only = [fire({ slug: 'a' })];
    expect(dedupeMutualAidFires(only)).toEqual(only);
  });
});
