import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FILTERS,
  applyFilters,
  activeFilterCount,
  hasActiveFilters,
  normalizeText,
  hasAerial,
  hasGround,
  hasForeignAid,
  hasEvacuation,
  personnelOf,
  type FireFilters,
} from './filters';
import type { Fire } from '@/types/fire';

const NOW = Date.parse('2026-07-10T14:00:00+02:00');

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

function filters(patch: Partial<FireFilters> = {}): FireFilters {
  return { ...DEFAULT_FILTERS, ...patch };
}

describe('normalizeText', () => {
  it('quita acentos y pasa a minúsculas', () => {
    expect(normalizeText('Cáceres')).toBe('caceres');
    expect(normalizeText('  Ávila  ')).toBe('avila');
    expect(normalizeText('Castilla y León')).toBe('castilla y leon');
  });
});

describe('predicados de medios', () => {
  it('detecta aéreos por número o unidades', () => {
    expect(hasAerial(fire({ resources: { aerial: 3 } }))).toBe(true);
    expect(hasAerial(fire({ resources: { aerialUnits: [{ kind: 'anfibio', count: 1 }] } }))).toBe(true);
    expect(hasAerial(fire({ resources: { ground: 5 } }))).toBe(false);
    expect(hasAerial(fire({ resources: undefined }))).toBe(false);
  });
  it('detecta terrestres, internacional y evacuación', () => {
    expect(hasGround(fire({ resources: { ground: 5 } }))).toBe(true);
    expect(hasForeignAid(fire({ resources: { foreign: [{ country: 'Francia' }] } }))).toBe(true);
    expect(hasForeignAid(fire({ resources: { foreign: [] } }))).toBe(false);
    expect(hasEvacuation(fire({ evacuation: '900 evacuados' }))).toBe(true);
    expect(hasEvacuation(fire({ evacuation: '   ' }))).toBe(false);
    expect(hasEvacuation(fire())).toBe(false);
  });
  it('personnelOf devuelve 0 sin dato', () => {
    expect(personnelOf(fire({ resources: { personnel: 68 } }))).toBe(68);
    expect(personnelOf(fire())).toBe(0);
  });
});

describe('applyFilters', () => {
  const fires: Fire[] = [
    fire({ slug: 'a', state: 'activo', level: 2, hectares: 3241, region: 'Extremadura', province: 'Cáceres', type: 'forestal', resources: { aerial: 14, personnel: 310, foreign: [{ country: 'Francia' }] }, evacuation: 'sí', satelliteConfirmed: true, sources: ['nacional', 'effis'] }),
    fire({ slug: 'b', state: 'controlado', level: 0, hectares: 50, region: 'Galicia', province: 'Ourense', type: 'agricola', resources: { ground: 4 }, sources: ['jcyl'] }),
    fire({ slug: 'c', state: 'activo', level: null, hectares: 640, region: 'Centro (PT)', province: 'Santarém', country: 'PT', type: 'forestal', sources: ['fogos'], satelliteConfirmed: false }),
  ];
  const run = (patch: Partial<FireFilters>) => applyFilters(fires, filters(patch), NOW).map((f) => f.slug);

  it('sin filtros devuelve todo', () => {
    expect(run({}).sort()).toEqual(['a', 'b', 'c']);
  });
  it('por estado', () => {
    expect(run({ states: ['activo'] }).sort()).toEqual(['a', 'c']);
  });
  it('por nivel (excluye sin nivel)', () => {
    expect(run({ levels: [2] })).toEqual(['a']);
  });
  it('por tipo', () => {
    expect(run({ types: ['agricola'] })).toEqual(['b']);
  });
  it('por país', () => {
    expect(run({ country: 'pt' })).toEqual(['c']);
    expect(run({ country: 'es' }).sort()).toEqual(['a', 'b']);
  });
  it('por CCAA/región y provincia', () => {
    expect(run({ regions: ['Galicia'] })).toEqual(['b']);
    expect(run({ provinces: ['Cáceres'] })).toEqual(['a']);
  });
  it('por superficie mínima y máxima', () => {
    expect(run({ minHa: 100 }).sort()).toEqual(['a', 'c']);
    expect(run({ maxHa: 100 })).toEqual(['b']);
  });
  it('por medios (AND entre ellos)', () => {
    expect(run({ medios: ['aereos'] })).toEqual(['a']);
    expect(run({ medios: ['terrestres'] })).toEqual(['b']);
    expect(run({ medios: ['internacional'] })).toEqual(['a']);
    expect(run({ medios: ['evacuacion'] })).toEqual(['a']);
    expect(run({ medios: ['aereos', 'evacuacion'] })).toEqual(['a']);
    expect(run({ medios: ['terrestres', 'evacuacion'] })).toEqual([]);
  });
  it('por umbral de personal (oculta sin dato)', () => {
    expect(run({ minPersonnel: 100 })).toEqual(['a']);
  });
  it('por confirmación satelital', () => {
    expect(run({ satellite: 'si' })).toEqual(['a']);
    expect(run({ satellite: 'no' }).sort()).toEqual(['b', 'c']);
  });
  it('por fuente (OR)', () => {
    expect(run({ sources: ['fogos'] })).toEqual(['c']);
    expect(run({ sources: ['effis', 'jcyl'] }).sort()).toEqual(['a', 'b']);
  });
  it('por búsqueda de texto sin acentos', () => {
    expect(run({ query: 'caceres' })).toEqual(['a']);
    expect(run({ query: 'santarem' })).toEqual(['c']);
    expect(run({ query: 'galicia' })).toEqual(['b']);
  });
  it('por periodo (según updatedAt)', () => {
    const recent = fire({ slug: 'r', updatedAt: '2026-07-10T13:30:00+02:00' });
    const old = fire({ slug: 'o', updatedAt: '2026-07-01T13:30:00+02:00' });
    const got = applyFilters([recent, old], filters({ period: '24h' }), NOW).map((f) => f.slug);
    expect(got).toEqual(['r']);
  });
  it('combina filtros con AND', () => {
    expect(run({ states: ['activo'], country: 'es' })).toEqual(['a']);
  });
});

describe('activeFilterCount / hasActiveFilters', () => {
  it('cuenta grupos activos', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    const f = filters({ states: ['activo'], levels: [2], regions: ['Galicia'], query: 'x', medios: ['aereos'] });
    expect(activeFilterCount(f)).toBe(5);
    expect(hasActiveFilters(f)).toBe(true);
  });
  it('el rango de superficie cuenta como un grupo', () => {
    expect(activeFilterCount(filters({ minHa: 100 }))).toBe(1);
    expect(activeFilterCount(filters({ maxHa: 500 }))).toBe(1);
    expect(activeFilterCount(filters({ minHa: 100, maxHa: 500 }))).toBe(1);
  });
});
