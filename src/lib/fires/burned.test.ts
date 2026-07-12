import { describe, it, expect } from 'vitest';
import { dedupeBurnedAreas } from './burned';
import type { Fire } from '@/types/fire';

function area(p: Partial<Fire>): Fire {
  return {
    slug: p.slug ?? 'a',
    name: p.name ?? 'A',
    municipality: 'Villablino',
    province: 'León',
    region: 'Castilla y León',
    country: 'ES',
    state: 'extinguido',
    level: null,
    hectares: 100,
    coordinates: [-6.3, 42.9],
    startedAt: '2026-07-08T00:00:00Z',
    updatedAt: '2026-07-08T00:00:00Z',
    sources: ['effis'],
    ...p,
  };
}

describe('dedupeBurnedAreas', () => {
  it('fusiona polígonos del mismo municipio y fecha sumando hectáreas', () => {
    const out = dedupeBurnedAreas([
      area({ slug: 'a', hectares: 120 }),
      area({ slug: 'b', hectares: 80 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.hectares).toBe(200);
  });

  it('no fusiona si difiere la fecha de inicio', () => {
    const out = dedupeBurnedAreas([
      area({ slug: 'a', startedAt: '2026-07-08T00:00:00Z' }),
      area({ slug: 'b', startedAt: '2026-07-09T00:00:00Z' }),
    ]);
    expect(out).toHaveLength(2);
  });

  it('no fusiona municipios distintos', () => {
    const out = dedupeBurnedAreas([
      area({ slug: 'a', municipality: 'Villablino' }),
      area({ slug: 'b', municipality: 'Quirós' }),
    ]);
    expect(out).toHaveLength(2);
  });

  it('no fusiona municipio desconocido ("—") aunque coincida la fecha', () => {
    const out = dedupeBurnedAreas([
      area({ slug: 'a', municipality: '—' }),
      area({ slug: 'b', municipality: '—' }),
    ]);
    expect(out).toHaveLength(2);
  });

  it('no muta la entrada original', () => {
    const first = area({ slug: 'a', hectares: 120 });
    dedupeBurnedAreas([first, area({ slug: 'b', hectares: 80 })]);
    expect(first.hectares).toBe(120);
  });

  it('preserva el orden de aparición', () => {
    const out = dedupeBurnedAreas([
      area({ slug: 'a', municipality: 'Barbate' }),
      area({ slug: 'b', municipality: 'Cabril' }),
      area({ slug: 'c', municipality: 'Barbate' }),
    ]);
    expect(out.map((a) => a.municipality)).toEqual(['Barbate', 'Cabril']);
  });
});
