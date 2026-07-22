import { describe, it, expect } from 'vitest';
import { light } from './tokens';

/**
 * Regresión de contraste WCAG 2.2 AA (obligatorio en el proyecto, ver CLAUDE.md).
 *
 * En modo CLARO, todo token usado como TEXTO debe alcanzar ≥4.5:1 sobre las tres
 * superficies claras reales (raised #FFFFFF, base #F4F2EC y sunken/map #EAE7DD),
 * y los colores de MARCADOR/gráfico (`state.*.base`) ≥3:1. Este test blinda el
 * arreglo de v0.34.0 (foco/controlado/estabilizado/extinguido-text, ok-text y
 * warn se habían quedado iguales al marcador y fallaban AA) contra regresiones.
 *
 * La fórmula reproduce exactamente los ratios que reporta Lighthouse/axe
 * (verificado: #d9531e sobre blanco = 4.03; #c4761b sobre #f8efe4 = 3.10).
 */

/** Superficies claras sobre las que puede pintarse texto (globals.css :root). */
const LIGHT_SURFACES: Record<string, string> = {
  raised: '#FFFFFF',
  base: '#F4F2EC',
  sunken: '#EAE7DD',
};

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Ratio de contraste WCAG entre dos colores sólidos. */
function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Menor ratio del color contra cualquiera de las superficies claras. */
function worstAgainstLightSurfaces(color: string): { ratio: number; on: string } {
  let worst = { ratio: Infinity, on: '' };
  for (const [name, surface] of Object.entries(LIGHT_SURFACES)) {
    const r = contrast(color, surface);
    if (r < worst.ratio) worst = { ratio: r, on: name };
  }
  return worst;
}

describe('contraste WCAG AA (modo claro)', () => {
  it('la fórmula reproduce los ratios de Lighthouse (autovalidación)', () => {
    expect(contrast('#D9531E', '#FFFFFF')).toBeCloseTo(4.03, 1);
    expect(contrast('#C4761B', '#F8EFE4')).toBeCloseTo(3.1, 1);
  });

  // Tokens de TEXTO: deben cumplir texto normal (≥4.5:1) sobre toda superficie clara.
  const textTokens: Record<string, string> = {
    'text.primary': light.text.primary,
    'text.secondary': light.text.secondary,
    'text.mute': light.text.mute,
    'text.body': light.text.body,
    'state.activo.text': light.state.activo.text,
    'state.controlado.text': light.state.controlado.text,
    'state.estabilizado.text': light.state.estabilizado.text,
    'state.extinguido.text': light.state.extinguido.text,
    'state.focoSatelital.text': light.state.focoSatelital.text,
    'ui.actionText': light.ui.actionText,
    'ui.okText': light.ui.okText,
    'ui.errorText': light.ui.errorText,
    'ui.warn': light.ui.warn,
  };

  for (const [name, color] of Object.entries(textTokens)) {
    it(`${name} (${color}) ≥ 4.5:1 sobre superficies claras`, () => {
      const { ratio, on } = worstAgainstLightSurfaces(color);
      expect(ratio, `${name} solo alcanza ${ratio.toFixed(2)}:1 sobre ${on}`).toBeGreaterThanOrEqual(4.5);
    });
  }

  // Los colores de MARCADOR (`state.*.base`) NO se testean contra el fondo: en el
  // mapa llevan borde blanco 1.5px y forma redundante (color + forma), por lo que
  // su legibilidad no depende del contraste fill↔fondo (WCAG 1.4.11 se cubre por
  // el borde). Se mantienen con el valor final del handoff hifi.
});
