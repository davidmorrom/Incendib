import { describe, it, expect } from 'vitest';
import { norm, keyToken, titleMentions, significantTokens, jaccard, sharedCount } from './text';

describe('norm', () => {
  it('pasa a minúsculas, quita acentos y signos', () => {
    expect(norm('Aragón: ¡Incendio!  en Orés')).toBe('aragon incendio en ores');
  });
});

describe('keyToken', () => {
  it('toma el token distintivo (≥5) del topónimo', () => {
    expect(keyToken('Barraco (el)')).toBe('barraco');
    expect(keyToken('Ourense')).toBe('ourense');
  });
  it('descarta artículos y palabras ambiguas → null si no queda token seguro', () => {
    expect(keyToken('La Guardia')).toBeNull();
    expect(keyToken('El Real')).toBeNull();
    expect(keyToken('Urda')).toBeNull(); // 4 chars < 5
  });
});

describe('titleMentions', () => {
  it('casa palabra completa sin importar acentos', () => {
    expect(titleMentions('Gran incendio en Orés arrasa el monte', 'ores')).toBe(true);
    expect(titleMentions('Incendio en Ourense', 'ourense')).toBe(true);
  });
  it('no casa dentro de otra palabra', () => {
    expect(titleMentions('Algo sobre Barracox', 'barraco')).toBe(false);
  });
  it('token vacío → false', () => {
    expect(titleMentions('lo que sea', '')).toBe(false);
  });
});

describe('significantTokens', () => {
  it('descarta el vocabulario ubicuo de incendios y las palabras cortas/vacías', () => {
    const toks = significantTokens('El incendio forestal de Zamora arrasa 400 hectáreas');
    expect(toks.has('zamora')).toBe(true);
    expect(toks.has('arrasa')).toBe(true);
    // "incendio", "forestal", "hectareas" son ubicuos → fuera
    expect(toks.has('incendio')).toBe(false);
    expect(toks.has('forestal')).toBe(false);
    expect(toks.has('hectareas')).toBe(false);
    // "400" y "de"/"el" quedan fuera por longitud
    expect(toks.has('400')).toBe(false);
    expect(toks.has('de')).toBe(false);
  });
});

describe('jaccard / sharedCount', () => {
  it('mide el solape entre dos conjuntos', () => {
    const a = new Set(['zamora', 'arrasa', 'aldea']);
    const b = new Set(['zamora', 'arrasa', 'monte']);
    expect(sharedCount(a, b)).toBe(2);
    expect(jaccard(a, b)).toBeCloseTo(2 / 4, 5);
  });
  it('conjunto vacío → 0', () => {
    expect(jaccard(new Set(), new Set(['x']))).toBe(0);
  });
});
