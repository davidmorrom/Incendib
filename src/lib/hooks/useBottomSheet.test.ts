import { describe, it, expect } from 'vitest';
import { sanitizeSnaps } from './useBottomSheet';

describe('sanitizeSnaps', () => {
  it('devuelve anclajes ascendentes recortados a [min, containerH - minMap]', () => {
    const snaps = sanitizeSnaps([200, 400, 900], 1000, { min: 128, minMap: 92 });
    expect(snaps).toEqual([200, 400, 900]);
    // ascendente
    for (let i = 1; i < snaps.length; i++) expect(snaps[i]!).toBeGreaterThan(snaps[i - 1]!);
    // ninguno supera el tope (deja hueco de mapa)
    for (const s of snaps) expect(s).toBeLessThanOrEqual(1000 - 92);
  });

  it('recorta el anclaje mayor para dejar siempre un asomo de mapa', () => {
    // 980 pediría casi toda la altura; con minMap 92 el tope es 908.
    const snaps = sanitizeSnaps([150, 500, 980], 1000, { min: 120, minMap: 92 });
    expect(Math.max(...snaps)).toBe(908);
  });

  it('respeta el suelo mínimo', () => {
    const snaps = sanitizeSnaps([10, 300], 1000, { min: 140 });
    expect(Math.min(...snaps)).toBe(140);
  });

  it('descarta anclajes demasiado juntos (gap)', () => {
    // 300 y 320 están a 20px: con gap 40 se colapsan en uno.
    const snaps = sanitizeSnaps([300, 320, 600], 1000, { min: 100, gap: 40 });
    expect(snaps).toEqual([300, 600]);
  });

  it('nunca devuelve vacío: contenedor diminuto colapsa a un solo anclaje válido', () => {
    // hi = max(min, 100 - 72) = max(112, 28) = 112; todos los valores se clampan a 112.
    const snaps = sanitizeSnaps([50, 80, 95], 100);
    expect(snaps.length).toBeGreaterThanOrEqual(1);
    for (const s of snaps) expect(s).toBe(112);
    // como todos caen en el mismo valor, el dedup por gap deja uno solo
    expect(snaps).toEqual([112]);
  });

  it('con lista vacía inventa un anclaje a media altura dentro del tope', () => {
    const snaps = sanitizeSnaps([], 1000, { min: 100, minMap: 100 });
    expect(snaps).toEqual([500]);
  });
});
