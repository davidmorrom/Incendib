import { describe, it, expect } from 'vitest';
import { interpolate } from './index';

describe('interpolate', () => {
  it('sustituye marcadores', () => {
    expect(interpolate('Hola {name}', { name: 'Ana' })).toBe('Hola Ana');
    expect(interpolate('{a} y {b}', { a: 1, b: 2 })).toBe('1 y 2');
  });
  it('deja intactos los marcadores sin valor', () => {
    expect(interpolate('Falta {x}', {})).toBe('Falta {x}');
  });
});
