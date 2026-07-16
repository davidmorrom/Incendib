import { describe, it, expect } from 'vitest';
import { filtersToQuery, queryToFilters } from './report-url';
import { DEFAULT_FILTERS, type FireFilters } from './filters';

function f(patch: Partial<FireFilters> = {}): FireFilters {
  return { ...DEFAULT_FILTERS, ...patch };
}

describe('report-url round-trip', () => {
  it('el defecto produce querystring vacía', () => {
    expect(filtersToQuery(DEFAULT_FILTERS)).toBe('');
    expect(queryToFilters('')).toEqual(DEFAULT_FILTERS);
  });

  it('conserva un conjunto completo de filtros', () => {
    const filters = f({
      query: 'gata',
      states: ['activo', 'controlado'],
      levels: [1, 2],
      types: ['forestal'],
      country: 'es',
      regions: ['Castilla y León', 'Galicia'],
      provinces: ['A Coruña'],
      period: '48h',
      minHa: 100,
      maxHa: 5000,
      medios: ['aereos', 'evacuacion'],
      minPersonnel: 50,
      growing: true,
      satellite: 'si',
      // Las fuentes se normalizan al orden canónico al decodificar.
      sources: ['effis', 'jcyl'],
    });
    const round = queryToFilters(filtersToQuery(filters));
    expect(round).toEqual(filters);
  });

  it('mantiene los acentos y espacios de territorios', () => {
    const q = filtersToQuery(f({ regions: ['Castilla y León'], provinces: ['A Coruña'] }));
    const back = queryToFilters(q);
    expect(back.regions).toEqual(['Castilla y León']);
    expect(back.provinces).toEqual(['A Coruña']);
  });
});

describe('queryToFilters tolerante', () => {
  it('ignora valores de enum desconocidos', () => {
    expect(queryToFilters('estado=activo|zzz&nivel=2|9&pais=fr').states).toEqual(['activo']);
    expect(queryToFilters('nivel=2|9').levels).toEqual([2]);
    expect(queryToFilters('pais=fr').country).toBe('todos');
  });
  it('acota los rangos de superficie', () => {
    expect(queryToFilters('hamin=-5').minHa).toBe(0);
    expect(queryToFilters('hamin=abc').minHa).toBe(0);
    // maxHa < minHa se descarta
    expect(queryToFilters('hamin=1000&hamax=10').maxHa).toBeGreaterThanOrEqual(1000);
  });
  it('recorta la búsqueda muy larga', () => {
    const long = 'x'.repeat(500);
    expect(queryToFilters(`q=${long}`).query.length).toBe(120);
  });
  it('conserva el orden canónico de los estados', () => {
    expect(queryToFilters('estado=extinguido|activo').states).toEqual(['activo', 'extinguido']);
  });
});
