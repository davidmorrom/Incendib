import { describe, it, expect } from 'vitest';
import { fireFromHighlight } from './resolve';
import type { Boletin, BoletinHighlight } from '@/types/boletin';

const highlight: BoletinHighlight = {
  slug: 'cat-sabadell-262531214',
  name: 'Sabadell',
  region: 'Cataluña',
  country: 'ES',
  hectares: 139,
  level: null,
  state: 'activo',
};

const boletin = {
  id: '2026-w28',
  isoWeek: 28,
  year: 2026,
  periodStart: '2026-07-06',
  periodEnd: '2026-07-12',
  publishedAt: '2026-07-13T08:00:00.000Z',
  status: 'cerrado',
  sources: ['jcyl', 'firms'],
  highlights: [highlight],
} as unknown as Boletin;

describe('fireFromHighlight', () => {
  const fire = fireFromHighlight(highlight, boletin);

  it('rellena todos los campos obligatorios de Fire', () => {
    for (const k of ['slug', 'name', 'municipality', 'province', 'region', 'country', 'state', 'hectares', 'coordinates', 'startedAt', 'updatedAt', 'sources'] as const) {
      expect(fire[k]).toBeDefined();
    }
    expect(fire.level).toBeNull(); // presente aunque sea null
  });

  it('conserva los datos del destacado', () => {
    expect(fire.slug).toBe('cat-sabadell-262531214');
    expect(fire.name).toBe('Sabadell');
    expect(fire.region).toBe('Cataluña');
    expect(fire.hectares).toBe(139);
    expect(fire.state).toBe('activo');
    expect(fire.sources).toEqual(['jcyl', 'firms']);
  });

  it('usa centinela [0,0] cuando el destacado no guardó coordenadas', () => {
    expect(fire.coordinates).toEqual([0, 0]);
  });

  it('usa las coordenadas reales del destacado cuando existen', () => {
    const conCoords = fireFromHighlight({ ...highlight, coordinates: [2.1, 41.5] }, boletin);
    expect(conCoords.coordinates).toEqual([2.1, 41.5]);
  });

  it('marca municipio/provincia como desconocidos', () => {
    expect(fire.municipality).toBe('—');
    expect(fire.province).toBe('—');
  });

  it('fija fechas válidas al periodo de la edición (sin NaN)', () => {
    expect(fire.startedAt).toBe('2026-07-06');
    expect(fire.updatedAt).toBe('2026-07-12');
    expect(Number.isNaN(Date.parse(fire.startedAt))).toBe(false);
    expect(Number.isNaN(Date.parse(fire.updatedAt))).toBe(false);
  });
});
