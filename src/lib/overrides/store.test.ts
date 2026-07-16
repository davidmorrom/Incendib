import { describe, it, expect } from 'vitest';
import {
  bannerText,
  shouldShowBanner,
  getBanner,
  getOverrides,
  filterOutSlugs,
  filterOutIds,
  EMPTY_STATE,
  type SiteBanner,
} from './store';

const base: SiteBanner = {
  active: true,
  level: 'warn',
  text: { es: 'Aviso', pt: 'Aviso PT' },
  dismissible: true,
  updatedAt: 1000,
};

describe('overrides · banner', () => {
  it('bannerText elige el idioma activo y cae a ES si falta', () => {
    expect(bannerText(base, 'es')).toBe('Aviso');
    expect(bannerText(base, 'pt')).toBe('Aviso PT');
    expect(bannerText(base, 'en')).toBe('Aviso'); // sin EN → ES
  });

  it('shouldShowBanner: activo y no descartado → true', () => {
    expect(shouldShowBanner(base, null)).toBe(true);
  });

  it('shouldShowBanner: null o inactivo → false', () => {
    expect(shouldShowBanner(null, null)).toBe(false);
    expect(shouldShowBanner({ ...base, active: false }, null)).toBe(false);
  });

  it('shouldShowBanner: descartado por el mismo updatedAt → false; distinto → reaparece', () => {
    expect(shouldShowBanner(base, '1000')).toBe(false); // descartó esta versión
    expect(shouldShowBanner(base, '999')).toBe(true); // descartó una anterior → reaparece
  });

  it('shouldShowBanner: no descartable ignora el descarte guardado', () => {
    expect(shouldShowBanner({ ...base, dismissible: false }, '1000')).toBe(true);
  });

  it('getBanner es null-safe sin credenciales de Redis', async () => {
    expect(await getBanner()).toBeNull();
  });
});

describe('overrides · ocultar (hide)', () => {
  const fires = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }];
  const hotspots = [{ id: '1' }, { id: '2' }];

  it('filterOutSlugs con lista vacía es IDENTIDAD (misma referencia)', () => {
    expect(filterOutSlugs(fires, [])).toBe(fires); // no copia: inerte por defecto
  });

  it('filterOutSlugs quita los slugs indicados y conserva el resto y el orden', () => {
    expect(filterOutSlugs(fires, ['b']).map((f) => f.slug)).toEqual(['a', 'c']);
    expect(filterOutSlugs(fires, ['x', 'y'])).toHaveLength(3); // slugs inexistentes: no-op
  });

  it('filterOutIds con lista vacía es IDENTIDAD; quita por id si se indica', () => {
    expect(filterOutIds(hotspots, [])).toBe(hotspots);
    expect(filterOutIds(hotspots, ['1']).map((h) => h.id)).toEqual(['2']);
  });

  it('EMPTY_STATE no oculta nada (todas las listas vacías)', () => {
    expect(filterOutSlugs(fires, EMPTY_STATE.hidden)).toBe(fires);
    expect(filterOutIds(hotspots, EMPTY_STATE.hiddenHotspots)).toBe(hotspots);
  });

  it('getOverrides es null-safe sin Redis (devuelve EMPTY_STATE)', async () => {
    expect(await getOverrides()).toEqual(EMPTY_STATE);
  });
});
