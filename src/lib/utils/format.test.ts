import { describe, it, expect } from 'vitest';
import { formatNumber, formatHa, timeAgo, elapsedShort } from './format';

const NOW = Date.parse('2026-07-10T14:32:00+02:00');

// Separador de millares = espacio fino no rompible (U+202F).
const NB = ' ';

describe('formatNumber', () => {
  it('separa los miles con espacio fino no rompible', () => {
    expect(formatNumber(3241)).toBe(`3${NB}241`);
    expect(formatNumber(12512)).toBe(`12${NB}512`);
    expect(formatNumber(1000000)).toBe(`1${NB}000${NB}000`);
  });
  it('no toca números pequeños', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
  });
  it('formatHa añade la unidad', () => {
    expect(formatHa(3241)).toBe(`3${NB}241 ha`);
  });
});

describe('timeAgo', () => {
  it('localiza el tiempo relativo (ES)', () => {
    expect(timeAgo('2026-07-10T14:26:00+02:00', NOW, 'es')).toMatch(/6/);
  });
  it('trata < 1 min y marcas futuras como "ahora mismo"', () => {
    expect(timeAgo('2026-07-10T14:32:00+02:00', NOW, 'es')).toBe('ahora mismo');
    expect(timeAgo('2026-07-10T15:00:00+02:00', NOW, 'es')).toBe('ahora mismo');
    expect(timeAgo('2026-07-10T15:00:00+02:00', NOW, 'en')).toBe('just now');
  });
});

describe('elapsedShort', () => {
  it('formato compacto sin prefijo', () => {
    expect(elapsedShort('2026-07-10T14:26:00+02:00', NOW)).toBe('6 min');
    expect(elapsedShort('2026-07-10T13:20:00+02:00', NOW)).toBe('1 h 12');
    expect(elapsedShort('2026-07-10T13:32:00+02:00', NOW)).toBe('1 h');
  });
  it('nunca es negativo', () => {
    expect(elapsedShort('2026-07-10T16:00:00+02:00', NOW)).toBe('0 min');
  });
});
