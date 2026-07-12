import { describe, it, expect } from 'vitest';
import { fireChangeEvents, snapOf, type FireSnap } from './store';
import type { Fire } from '@/types/fire';

const AT = '2026-07-12T18:00:00Z';
const base: FireSnap = { state: 'activo', level: 1, aerial: 0, ground: 0, personnel: 0 };

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

  it('registra refuerzo de medios con el desglose del incremento', () => {
    const evs = fireChangeEvents(
      { ...base, aerial: 3, ground: 2, personnel: 10 },
      { ...base, aerial: 6, ground: 2, personnel: 25 },
      AT,
    );
    expect(evs).toHaveLength(1);
    expect(evs[0]?.label).toBe('Refuerzo de medios (+3 aéreos, +15 efectivos)');
  });

  it('registra retirada de medios', () => {
    const evs = fireChangeEvents({ ...base, ground: 8 }, { ...base, ground: 2 }, AT);
    expect(evs[0]?.label).toBe('Retirada de medios');
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
      resources: { aerial: 4, ground: 3, personnel: 20 },
    } as Fire;
    expect(snapOf(f)).toEqual({ state: 'controlado', level: 1, aerial: 4, ground: 3, personnel: 20 });
  });
});
