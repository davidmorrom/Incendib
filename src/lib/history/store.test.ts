import { describe, it, expect } from 'vitest';
import { fireChangeEvents, snapOf, type FireSnap } from './store';
import type { Fire } from '@/types/fire';

const AT = '2026-07-12T18:00:00Z';
const base: FireSnap = { state: 'activo', level: 1, aerial: 0, ground: 0, personnel: 0, hectares: 0 };

describe('fireChangeEvents', () => {
  it('registra la bajada de nivel', () => {
    const evs = fireChangeEvents({ ...base, level: 2 }, { ...base, level: 1 }, AT);
    expect(evs).toHaveLength(1);
    expect(evs[0]?.label).toBe('Baja a nivel 1');
    expect(evs[0]?.at).toBe(AT);
  });

  it('registra la subida de nivel', () => {
    const evs = fireChangeEvents({ ...base, level: 0 }, { ...base, level: 2 }, AT);
    expect(evs[0]?.label).toBe('Sube a nivel 2');
  });

  it('registra refuerzo solo con los incrementos que superan el umbral', () => {
    const evs = fireChangeEvents(
      { ...base, aerial: 3, ground: 2, personnel: 10 },
      { ...base, aerial: 6, ground: 4, personnel: 45 }, // +3 aéreos (≥3), +2 terrestres (<5, se ignora), +35 efectivos (≥25)
      AT,
    );
    expect(evs).toHaveLength(1);
    expect(evs[0]?.label).toBe('Refuerzo de medios (+3 aéreos, +35 efectivos)');
  });

  it('ignora las fluctuaciones pequeñas de medios (vaivén del cron)', () => {
    const evs = fireChangeEvents(
      { ...base, aerial: 2, ground: 10, personnel: 100 },
      { ...base, aerial: 3, ground: 13, personnel: 120 }, // +1 aéreo, +3 terrestres, +20 efectivos: todo por debajo del umbral
      AT,
    );
    expect(evs).toHaveLength(0);
  });

  it('no registra las retiradas de medios (ruido; lo cubre el estado oficial)', () => {
    const evs = fireChangeEvents(
      { ...base, ground: 8, personnel: 40 },
      { ...base, ground: 2, personnel: 5 },
      AT,
    );
    expect(evs).toHaveLength(0);
  });

  it('no registra nada si no cambia', () => {
    expect(fireChangeEvents(base, { ...base }, AT)).toHaveLength(0);
  });

  it('ignora el nivel cuando es null (p. ej. Portugal)', () => {
    const evs = fireChangeEvents({ ...base, level: null }, { ...base, level: null }, AT);
    expect(evs).toHaveLength(0);
  });
});

describe('snapOf', () => {
  it('extrae estado, nivel y medios del incendio', () => {
    const f = {
      state: 'controlado',
      level: 1,
      hectares: 42,
      resources: { aerial: 4, ground: 3, personnel: 20 },
    } as Fire;
    expect(snapOf(f)).toEqual({ state: 'controlado', level: 1, aerial: 4, ground: 3, personnel: 20, hectares: 42 });
  });
});
