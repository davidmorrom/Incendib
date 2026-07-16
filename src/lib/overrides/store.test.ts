import { describe, it, expect } from 'vitest';
import {
  bannerText,
  shouldShowBanner,
  getBanner,
  getOverrides,
  filterOutSlugs,
  filterOutIds,
  applyPatches,
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

describe('overrides · corregir (patches)', () => {
  const fires = [
    { slug: 'a', name: 'A', hectares: 10 },
    { slug: 'b', name: 'B', hectares: 20 },
  ];

  it('sin parches es IDENTIDAD (misma referencia)', () => {
    expect(applyPatches(fires, {})).toBe(fires);
  });

  it('fusiona el parche y marca edited + overriddenFields', () => {
    const out = applyPatches(fires, { a: { hectares: 99, hectaresApprox: false } });
    expect(out[0]).toMatchObject({ slug: 'a', name: 'A', hectares: 99, edited: true });
    expect(out[0]!.overriddenFields).toEqual(['hectares', 'hectaresApprox']);
    // los no parcheados quedan intactos y sin edited
    expect(out[1]).toEqual({ slug: 'b', name: 'B', hectares: 20 });
    expect((out[1] as { edited?: boolean }).edited).toBeUndefined();
  });

  it('un parche vacío no marca el incendio como editado', () => {
    const out = applyPatches(fires, { a: {} });
    expect(out[0]).toEqual({ slug: 'a', name: 'A', hectares: 10 });
  });

  it('un slug de parche que no existe no crea incendios', () => {
    expect(applyPatches(fires, { zzz: { hectares: 1 } })).toHaveLength(2);
  });
});
