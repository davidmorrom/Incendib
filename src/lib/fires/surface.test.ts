import { describe, it, expect } from 'vitest';
import { fireSurface } from './surface';
import { formatNumber } from '@/lib/utils/format';

describe('fireSurface', () => {
  it('usa la cifra oficial sin «~» cuando no hay focos', () => {
    const s = fireSurface({ hectares: 3241 });
    expect(s).toMatchObject({ ha: 3241, approx: false, fromHotspots: false, hasData: true });
    expect(s.label).toBe(`${formatNumber(3241)} ha`);
    expect(s.officialHa).toBeUndefined();
  });

  it('cae a la estimación por focos con «~» cuando no hay cifra oficial', () => {
    const s = fireSurface({ hectares: 0, hotspotHectares: 600 });
    expect(s).toMatchObject({ ha: 600, approx: true, fromHotspots: true, hasData: true });
    expect(s.label).toBe(`~${formatNumber(600)} ha`);
    expect(s.officialHa).toBeUndefined();
  });

  it('prioriza los focos y conserva la oficial cuando los focos superan a la oficial', () => {
    const s = fireSurface({ hectares: 5074, hotspotHectares: 12700 });
    expect(s).toMatchObject({ ha: 12700, approx: true, fromHotspots: true, hasData: true });
    expect(s.label).toBe(`~${formatNumber(12700)} ha`);
    expect(s.officialHa).toBe(5074);
    expect(s.officialLabel).toBe(`${formatNumber(5074)} ha`);
  });

  it('mantiene la oficial cuando es mayor que los focos (no muestra la estimación menor)', () => {
    const s = fireSurface({ hectares: 8000, hotspotHectares: 3000 });
    expect(s).toMatchObject({ ha: 8000, approx: false, fromHotspots: false });
    expect(s.officialHa).toBeUndefined();
  });

  it('marca «~» cuando la oficial es una estimación EFFIS (hectaresApprox) sin focos', () => {
    const s = fireSurface({ hectares: 12600, hectaresApprox: true });
    expect(s).toMatchObject({ ha: 12600, approx: true, fromHotspots: false });
    expect(s.label).toBe(`~${formatNumber(12600)} ha`);
  });

  it('devuelve «sin dato» cuando no hay ninguna cifra', () => {
    expect(fireSurface({ hectares: 0 })).toMatchObject({ ha: 0, hasData: false, label: 'sin dato' });
  });
});
