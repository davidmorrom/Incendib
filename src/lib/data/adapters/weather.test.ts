import { describe, it, expect } from 'vitest';
import { compass } from './weather';

describe('compass (dirección del viento)', () => {
  it('mapea los 8 rumbos principales', () => {
    expect(compass(0)).toBe('N');
    expect(compass(45)).toBe('NE');
    expect(compass(90)).toBe('E');
    expect(compass(135)).toBe('SE');
    expect(compass(180)).toBe('S');
    expect(compass(225)).toBe('SO');
    expect(compass(270)).toBe('O');
    expect(compass(315)).toBe('NO');
    expect(compass(360)).toBe('N');
  });

  it('redondea al rumbo más cercano', () => {
    expect(compass(20)).toBe('N'); // 20 → 22.5 frontera, redondea a N
    expect(compass(30)).toBe('NE');
    expect(compass(275)).toBe('O');
  });

  it('normaliza grados negativos o >360', () => {
    expect(compass(-90)).toBe('O');
    expect(compass(450)).toBe('E');
  });
});
