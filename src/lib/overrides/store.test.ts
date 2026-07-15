import { describe, it, expect } from 'vitest';
import { bannerText, shouldShowBanner, getBanner, type SiteBanner } from './store';

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
