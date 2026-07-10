import { describe, it, expect } from 'vitest';
import { inEsPt } from './point-in-region';

describe('inEsPt (recorte a tierra España + Portugal)', () => {
  it('acepta puntos claramente en España o Portugal', () => {
    expect(inEsPt(-3.70, 40.42)).toBe(true); // Madrid
    expect(inEsPt(-9.14, 38.72)).toBe(true); // Lisboa
    expect(inEsPt(2.17, 41.39)).toBe(true); // Barcelona
    expect(inEsPt(-6.29, 40.36)).toBe(true); // Las Hurdes (Cáceres)
    expect(inEsPt(-5.66, 43.54)).toBe(true); // Gijón (costa cantábrica)
  });

  it('rechaza Francia y Andorra (fuera del ámbito)', () => {
    expect(inEsPt(2.90, 42.70)).toBe(false); // Perpiñán (Francia)
    expect(inEsPt(1.44, 43.60)).toBe(false); // Toulouse (Francia)
    expect(inEsPt(-0.57, 44.84)).toBe(false); // Burdeos / Landas (Francia)
    expect(inEsPt(1.52, 42.51)).toBe(false); // Andorra la Vella
  });

  it('rechaza puntos en el mar', () => {
    expect(inEsPt(1.0, 40.0)).toBe(false); // Mediterráneo entre península y Baleares
    expect(inEsPt(2.0, 36.5)).toBe(false); // mar hacia la costa argelina
    expect(inEsPt(-11.0, 40.0)).toBe(false); // Atlántico al oeste de Portugal
  });
});
