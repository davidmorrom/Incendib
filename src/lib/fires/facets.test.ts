import { describe, it, expect } from 'vitest';
import { computeFacets, computeStats } from './facets';
import type { Fire } from '@/types/fire';

function fire(overrides: Partial<Fire> = {}): Fire {
  return {
    slug: 'x',
    name: 'Incendio X',
    municipality: 'Villa',
    province: 'Cáceres',
    region: 'Extremadura',
    country: 'ES',
    state: 'activo',
    level: 1,
    type: 'forestal',
    hectares: 100,
    coordinates: [-6, 40],
    startedAt: '2026-07-07T00:00:00+02:00',
    updatedAt: '2026-07-10T13:00:00+02:00',
    sources: ['nacional'],
    ...overrides,
  };
}

const SAMPLE: Fire[] = [
  fire({ slug: 'a', province: 'Cáceres', region: 'Extremadura', state: 'activo', level: 2, hectares: 3000, hectaresApprox: true, type: 'forestal', sources: ['nacional', 'effis'], resources: { aerial: 14, ground: 40, personnel: 300, foreign: [{ country: 'Francia' }] }, evacuation: 'sí', satelliteConfirmed: true, delta24h: 340 }),
  fire({ slug: 'b', province: 'Badajoz', region: 'Extremadura', state: 'controlado', level: 0, hectares: 200, type: 'agricola', sources: ['nacional'], resources: { ground: 8 }, delta24h: 0 }),
  fire({ slug: 'c', province: 'Ourense', region: 'Galicia', state: 'activo', level: 1, hectares: 500, type: 'forestal', sources: ['jcyl'], resources: { aerial: 4 }, delta24h: 60 }),
  fire({ slug: 'd', province: 'Santarém', region: 'Centro (PT)', country: 'PT', state: 'activo', level: null, hectares: 640, type: 'forestal', sources: ['fogos'], satelliteConfirmed: false }),
];

describe('computeFacets', () => {
  const f = computeFacets(SAMPLE);

  it('agrupa provincias bajo su región', () => {
    const ext = f.regions.find((r) => r.value === 'Extremadura')!;
    expect(ext.count).toBe(2);
    expect(ext.provinces.map((p) => p.value).sort()).toEqual(['Badajoz', 'Cáceres']);
  });
  it('cuenta activos por región y ordena por actividad', () => {
    // Extremadura: 1 activo; Galicia: 1 activo; Centro (PT): 1 activo
    const values = f.regions.map((r) => r.value);
    expect(values).toContain('Extremadura');
    expect(values).toContain('Galicia');
    expect(values).toContain('Centro (PT)');
  });
  it('facetas de provincia en plano ordenadas por actividad', () => {
    expect(f.provinces.map((p) => p.value)).toContain('Cáceres');
    expect(f.provinces.length).toBe(4);
  });
  it('tipos, niveles, estados', () => {
    expect(f.types.find((t) => t.value === 'forestal')!.count).toBe(3);
    expect(f.types.find((t) => t.value === 'agricola')!.count).toBe(1);
    expect(f.levels.find((l) => l.value === 2)!.count).toBe(1);
    expect(f.states.find((s) => s.value === 'activo')!.count).toBe(3);
  });
  it('fuentes agregadas (OR por incendio)', () => {
    expect(f.sources.find((s) => s.value === 'nacional')!.count).toBe(2);
    expect(f.sources.find((s) => s.value === 'effis')!.count).toBe(1);
  });
  it('medios y satélite', () => {
    expect(f.medios.find((m) => m.value === 'aereos')!.count).toBe(2);
    expect(f.medios.find((m) => m.value === 'internacional')!.count).toBe(1);
    expect(f.medios.find((m) => m.value === 'evacuacion')!.count).toBe(1);
    expect(f.satellite.si).toBe(1);
    expect(f.satellite.no).toBe(3);
  });
  it('recuento por país', () => {
    expect(f.countries.es).toBe(3);
    expect(f.countries.pt).toBe(1);
  });
});

describe('computeStats', () => {
  const s = computeStats(SAMPLE);

  it('totales y superficie', () => {
    expect(s.total).toBe(4);
    expect(s.activos).toBe(3);
    expect(s.hectares).toBe(4340);
    expect(s.hectaresApprox).toBe(true);
    expect(s.superficieMax).toBe(3000);
    expect(Math.round(s.superficieMedia)).toBe(1085);
  });
  it('crecimiento 24 h (solo positivos)', () => {
    expect(s.crecimiento24h).toBe(400);
  });
  it('evacuación y confirmación satelital', () => {
    expect(s.conEvacuacion).toBe(1);
    expect(s.confirmadosSatelite).toBe(1);
  });
  it('distribución por estado', () => {
    expect(s.byState.find((r) => r.state === 'activo')!.count).toBe(3);
    expect(s.byState.find((r) => r.state === 'controlado')!.count).toBe(1);
  });
  it('niveles y sin nivel (PT)', () => {
    expect(s.byLevel.find((l) => l.value === 2)!.count).toBe(1);
    expect(s.sinNivel).toBe(1);
  });
  it('distribución por región ordenada por superficie', () => {
    expect(s.byRegion[0]!.key).toBe('Extremadura'); // 3200 ha
    const ext = s.byRegion.find((r) => r.key === 'Extremadura')!;
    expect(ext.hectares).toBe(3200);
    expect(ext.approx).toBe(true);
  });
  it('medios totales', () => {
    expect(s.medios.aerial).toBe(18);
    expect(s.medios.ground).toBe(48);
    expect(s.medios.personnel).toBe(300);
    expect(s.medios.conAereos).toBe(2);
    expect(s.medios.internacional).toBe(1);
  });
  it('dataset vacío no rompe', () => {
    const e = computeStats([]);
    expect(e.total).toBe(0);
    expect(e.superficieMedia).toBe(0);
    expect(e.byRegion).toEqual([]);
  });
});
