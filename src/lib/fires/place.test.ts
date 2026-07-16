import { describe, it, expect } from 'vitest';
import { placeKey, provinceSlug, samePlace, groupByPlace } from './place';
import type { Fire } from '@/types/fire';

function fire(p: Partial<Fire>): Fire {
  return {
    slug: p.slug ?? 'x',
    name: p.name ?? 'Incendio',
    municipality: p.municipality ?? '—',
    province: p.province ?? 'Ávila',
    region: p.region ?? 'Castilla y León',
    country: p.country ?? 'ES',
    state: p.state ?? 'activo',
    level: p.level ?? null,
    hectares: p.hectares ?? 0,
    hectaresApprox: p.hectaresApprox,
    coordinates: p.coordinates ?? [-4.72, 40.44],
    startedAt: p.startedAt ?? '2026-07-10T00:00:00Z',
    updatedAt: p.updatedAt ?? '2026-07-10T00:00:00Z',
    sources: p.sources ?? ['jcyl'],
  };
}

describe('provinceSlug', () => {
  it('normaliza acentos y espacios', () => {
    expect(provinceSlug('Ávila')).toBe('avila');
    expect(provinceSlug('A Coruña')).toBe('a-coruna');
    expect(provinceSlug('León')).toBe('leon');
  });
  it('devuelve cadena vacía para provincia desconocida', () => {
    expect(provinceSlug('—')).toBe('');
    expect(provinceSlug('')).toBe('');
  });
});

describe('placeKey', () => {
  it('es estable entre episodios del mismo paraje (slug distinto)', () => {
    const a = fire({ slug: 'cyl-el-barraco-1', municipality: 'El Barraco', province: 'Ávila' });
    const b = fire({ slug: 'cyl-el-barraco-2', municipality: 'El Barraco', province: 'Ávila' });
    expect(placeKey(a)).toBe('es:avila:el-barraco');
    expect(placeKey(a)).toBe(placeKey(b));
    expect(samePlace(a, b)).toBe(true);
  });

  it('usa el nombre si no hay municipio', () => {
    const f = fire({ municipality: '—', name: 'Sierra de Gata', province: 'Cáceres', region: 'Extremadura' });
    expect(placeKey(f)).toBe('es:caceres:sierra-de-gata');
  });

  it('es null sin provincia útil (p. ej. Cataluña sin provincia)', () => {
    expect(placeKey(fire({ province: '—', municipality: 'Alforja' }))).toBeNull();
  });

  it('es null con nombre genérico y sin municipio (identidad débil)', () => {
    expect(placeKey(fire({ municipality: '—', name: 'Incendio', province: 'Ávila' }))).toBeNull();
    expect(placeKey(fire({ municipality: '—', name: 'Área quemada', province: 'Ávila' }))).toBeNull();
  });

  it('distingue país (mismo topónimo, distinto país)', () => {
    const es = fire({ municipality: 'Guarda', province: 'Salamanca', country: 'ES' });
    const pt = fire({ municipality: 'Guarda', province: 'Guarda', country: 'PT', region: 'Centro (PT)' });
    expect(placeKey(es)).not.toBe(placeKey(pt));
    expect(samePlace(es, pt)).toBe(false);
  });
});

describe('groupByPlace', () => {
  it('agrupa episodios del mismo paraje y ordena de reciente a antiguo', () => {
    const old = fire({ slug: 'a', municipality: 'El Barraco', startedAt: '2026-06-18T00:00:00Z', state: 'extinguido' });
    const neu = fire({ slug: 'b', municipality: 'El Barraco', startedAt: '2026-07-09T00:00:00Z', state: 'activo' });
    const groups = groupByPlace([old, neu]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.episodes.map((e) => e.slug)).toEqual(['b', 'a']); // reciente primero
    expect(groups[0]!.name).toBe('El Barraco');
  });

  it('los incendios sin identidad de lugar quedan como grupos sueltos', () => {
    const g1 = fire({ slug: 'c1', province: '—', municipality: 'X' });
    const g2 = fire({ slug: 'c2', province: '—', municipality: 'Y' });
    const groups = groupByPlace([g1, g2]);
    expect(groups).toHaveLength(2);
  });

  it('prioriza los parajes con algún episodio activo', () => {
    const activePlace = fire({ slug: 'p1', municipality: 'Activo', state: 'activo', startedAt: '2026-01-01T00:00:00Z' });
    const oldPlace = fire({ slug: 'p2', municipality: 'Viejo', state: 'extinguido', startedAt: '2026-07-01T00:00:00Z' });
    const groups = groupByPlace([oldPlace, activePlace]);
    expect(groups[0]!.name).toBe('Activo'); // activo antes que el más reciente extinguido
  });
});
