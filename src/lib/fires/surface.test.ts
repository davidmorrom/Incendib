import { describe, it, expect } from 'vitest';
import { fireSurface } from './surface';
import { formatNumber } from '@/lib/utils/format';

describe('fireSurface', () => {
  it('usa la cifra oficial sin «~» cuando la hay', () => {
    const s = fireSurface({ hectares: 3241 });
    expect(s).toEqual({ ha: 3241, approx: false, hasData: true, label: `${formatNumber(3241)} ha` });
  });

  it('cae a la estimación por focos con «~» cuando no hay cifra oficial', () => {
    const s = fireSurface({ hectares: 0, hotspotHectares: 600 });
    expect(s.ha).toBe(600);
    expect(s.approx).toBe(true);
    expect(s.hasData).toBe(true);
    expect(s.label).toBe(`~${formatNumber(600)} ha`);
  });

  it('marca «~» cuando la cifra oficial es una estimación EFFIS (hectaresApprox)', () => {
    const s = fireSurface({ hectares: 12600, hectaresApprox: true });
    expect(s.approx).toBe(true);
    expect(s.label).toBe(`~${formatNumber(12600)} ha`);
  });

  it('devuelve «sin dato» cuando no hay ninguna cifra', () => {
    expect(fireSurface({ hectares: 0 })).toEqual({ ha: 0, approx: false, hasData: false, label: 'sin dato' });
    expect(fireSurface({ hectares: 0, hotspotHectares: undefined }).label).toBe('sin dato');
  });
});
