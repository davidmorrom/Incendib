import { describe, it, expect } from 'vitest';
import { findEpisodeLinks, type PooledFire } from './reactivation';
import type { Fire } from '@/types/fire';

function fire(p: Partial<Fire>): Fire {
  return {
    slug: p.slug ?? 'x',
    name: p.name ?? 'El Barraco',
    municipality: p.municipality ?? 'El Barraco',
    province: p.province ?? 'Ávila',
    region: p.region ?? 'Castilla y León',
    country: p.country ?? 'ES',
    state: p.state ?? 'activo',
    level: p.level ?? null,
    hectares: p.hectares ?? 0,
    coordinates: p.coordinates ?? [-4.72, 40.44],
    startedAt: p.startedAt ?? '2026-07-10T00:00:00Z',
    updatedAt: p.updatedAt ?? '2026-07-10T00:00:00Z',
    sources: p.sources ?? ['jcyl'],
  };
}

const OLD = fire({ slug: 'cyl-el-barraco-1', state: 'extinguido', startedAt: '2026-06-18T00:00:00Z' });
const NEW = fire({ slug: 'cyl-el-barraco-2', state: 'activo', startedAt: '2026-07-09T00:00:00Z' });

const pool: PooledFire[] = [
  { fire: OLD, origin: 'archive', asOf: OLD.updatedAt },
  { fire: NEW, origin: 'live' },
];

describe('findEpisodeLinks', () => {
  it('desde la ficha antigua apunta al incidente actual (vivo)', () => {
    const links = findEpisodeLinks({ fire: OLD, origin: 'archive' }, pool);
    expect(links).not.toBeNull();
    expect(links!.current?.slug).toBe('cyl-el-barraco-2');
    expect(links!.later.map((e) => e.slug)).toEqual(['cyl-el-barraco-2']);
    expect(links!.prior).toHaveLength(0);
  });

  it('desde la ficha nueva (viva) apunta al episodio anterior, sin "actual"', () => {
    const links = findEpisodeLinks({ fire: NEW, origin: 'live' }, pool);
    expect(links).not.toBeNull();
    expect(links!.current).toBeUndefined(); // ella misma es el incidente vivo
    expect(links!.prior.map((e) => e.slug)).toEqual(['cyl-el-barraco-1']);
    expect(links!.prior[0]!.historical).toBe(true); // el anterior viene del archivo
  });

  it('excluye el propio incendio del pool por slug', () => {
    const links = findEpisodeLinks({ fire: NEW, origin: 'live' }, pool);
    expect(links!.related.some((e) => e.slug === NEW.slug)).toBe(false);
  });

  it('es null si el objetivo no tiene identidad de lugar', () => {
    const noPlace = fire({ slug: 'z', province: '—', municipality: 'X' });
    expect(findEpisodeLinks({ fire: noPlace, origin: 'live' }, pool)).toBeNull();
  });

  it('es null si no hay otros episodios del paraje', () => {
    const solo = fire({ slug: 'solo', municipality: 'Otro Sitio', province: 'León' });
    expect(findEpisodeLinks({ fire: solo, origin: 'live' }, [{ fire: solo, origin: 'live' }])).toBeNull();
  });

  it('no señala "actual" si ningún episodio del paraje sigue vivo', () => {
    const extA = fire({ slug: 'a', state: 'extinguido', startedAt: '2026-05-01T00:00:00Z' });
    const extB = fire({ slug: 'b', state: 'extinguido', startedAt: '2026-06-01T00:00:00Z' });
    const p: PooledFire[] = [
      { fire: extA, origin: 'archive' },
      { fire: extB, origin: 'archive' },
    ];
    const links = findEpisodeLinks({ fire: extA, origin: 'archive' }, p);
    expect(links!.current).toBeUndefined();
    expect(links!.later.map((e) => e.slug)).toEqual(['b']); // más reciente, pero extinguido
  });
});
