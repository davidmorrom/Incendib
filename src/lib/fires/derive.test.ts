import { describe, it, expect } from 'vitest';
import { sortByGravity, computeKpis, isIslandFire, STATE_RANK } from './derive';
import type { Fire, FireState, SeverityLevel } from '@/types/fire';

function fire(
  slug: string,
  state: FireState,
  level: SeverityLevel,
  hectares: number,
  region = 'Extremadura',
): Fire {
  return {
    slug,
    name: slug,
    municipality: 'X',
    province: 'Y',
    region,
    country: 'ES',
    state,
    level,
    hectares,
    coordinates: [-6, 40],
    startedAt: '2026-07-07T00:00:00+02:00',
    updatedAt: '2026-07-10T14:00:00+02:00',
    sources: ['nacional'],
  };
}

describe('sortByGravity', () => {
  it('ordena por estado, luego nivel desc, luego hectáreas desc', () => {
    const fires = [
      fire('extinguido', 'extinguido', 0, 5000),
      fire('activo-n1', 'activo', 1, 100),
      fire('activo-n2-grande', 'activo', 2, 3000),
      fire('activo-n2-peque', 'activo', 2, 500),
      fire('controlado', 'controlado', 0, 9000),
    ];
    const order = sortByGravity(fires).map((f) => f.slug);
    expect(order).toEqual([
      'activo-n2-grande',
      'activo-n2-peque',
      'activo-n1',
      'controlado',
      'extinguido',
    ]);
  });
  it('no muta la entrada', () => {
    const fires = [fire('a', 'controlado', 0, 1), fire('b', 'activo', 2, 1)];
    const copy = [...fires];
    sortByGravity(fires);
    expect(fires).toEqual(copy);
  });
  it('rango de estados', () => {
    expect(STATE_RANK.activo).toBeLessThan(STATE_RANK.extinguido);
  });
});

describe('computeKpis', () => {
  it('suma la estimación por focos (hotspotHectares) cuando no hay cifra oficial', () => {
    const oficial = fire('a', 'activo', 2, 1000);
    const estimado: Fire = { ...fire('b', 'activo', null, 0), hotspotHectares: 300 };
    // El oficial cuenta su cifra; el estimado (sin hectares) aporta su estimación.
    expect(computeKpis([oficial, estimado])).toEqual({ activos: 2, hectares: 1300 });
    // Si el incendio SÍ tiene cifra, no se duplica con la estimación.
    const conAmbos: Fire = { ...fire('c', 'activo', 2, 500), hotspotHectares: 999 };
    expect(computeKpis([conAmbos]).hectares).toBe(500);
  });

  it('cuenta activos y suma hectáreas', () => {
    const fires = [
      fire('a', 'activo', 2, 3241),
      fire('b', 'activo', 1, 500),
      fire('c', 'controlado', 0, 412),
    ];
    expect(computeKpis(fires)).toEqual({ activos: 2, hectares: 4153 });
  });
});

describe('isIslandFire', () => {
  it('detecta territorios insulares', () => {
    expect(isIslandFire(fire('t', 'activo', 2, 1, 'Canarias'))).toBe(true);
    expect(isIslandFire(fire('m', 'activo', 1, 1, 'Madeira'))).toBe(true);
    expect(isIslandFire(fire('e', 'activo', 1, 1, 'Extremadura'))).toBe(false);
  });
});
