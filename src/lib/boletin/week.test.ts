import { describe, it, expect } from 'vitest';
import {
  isoWeek,
  boletinId,
  parseBoletinId,
  isoWeekStart,
  isoWeekPeriod,
  lastClosedWeek,
} from './week';

describe('isoWeek', () => {
  it('1 ene 2026 (jueves) es la semana 1 de 2026', () => {
    expect(isoWeek(new Date('2026-01-01T12:00:00Z'))).toEqual({ year: 2026, week: 1 });
  });

  it('los días de diciembre pueden pertenecer a la semana 1 del año siguiente', () => {
    // 29 dic 2025 (lunes) pertenece a la semana ISO 1 de 2026 (jueves = 1 ene 2026).
    expect(isoWeek(new Date('2025-12-29T00:00:00Z'))).toEqual({ year: 2026, week: 1 });
  });

  it('los primeros días de enero pueden pertenecer a la última semana del año previo', () => {
    // 1 ene 2027 (viernes) → semana 53 de 2026.
    expect(isoWeek(new Date('2027-01-01T00:00:00Z'))).toEqual({ year: 2026, week: 53 });
  });

  it('un lunes de julio de 2026', () => {
    // 6 jul 2026 es lunes; comprobamos coherencia ida y vuelta con el periodo.
    const { year, week } = isoWeek(new Date('2026-07-06T10:00:00Z'));
    expect(year).toBe(2026);
    expect(isoWeekPeriod(year, week).start).toBe('2026-07-06');
  });
});

describe('boletinId / parseBoletinId', () => {
  it('formatea con cero a la izquierda', () => {
    expect(boletinId(2026, 7)).toBe('2026-w07');
    expect(boletinId(2026, 28)).toBe('2026-w28');
  });

  it('ida y vuelta', () => {
    expect(parseBoletinId('2026-w07')).toEqual({ year: 2026, week: 7 });
    expect(parseBoletinId('2026-w28')).toEqual({ year: 2026, week: 28 });
  });

  it('rechaza ids no válidos', () => {
    expect(parseBoletinId('2026-28')).toBeNull();
    expect(parseBoletinId('2026-w00')).toBeNull();
    expect(parseBoletinId('2026-w54')).toBeNull();
    expect(parseBoletinId('basura')).toBeNull();
  });
});

describe('isoWeekStart / isoWeekPeriod', () => {
  it('la semana 1 de 2026 empieza el lunes 29 dic 2025', () => {
    expect(isoWeekStart(2026, 1).toISOString().slice(0, 10)).toBe('2025-12-29');
  });

  it('el periodo es de lunes a domingo (7 días)', () => {
    expect(isoWeekPeriod(2026, 1)).toEqual({ start: '2025-12-29', end: '2026-01-04' });
  });
});

describe('lastClosedWeek', () => {
  it('devuelve la semana anterior a la de la fecha dada', () => {
    // 8 jul 2026 (miércoles, semana 28) → última cerrada = semana 27.
    expect(lastClosedWeek(new Date('2026-07-08T09:00:00Z'))).toEqual({ year: 2026, week: 27 });
  });

  it('es robusto en la frontera de año', () => {
    // 2 ene 2026 → una semana antes cae en 2025 → semana 52 de 2025.
    expect(lastClosedWeek(new Date('2026-01-02T09:00:00Z'))).toEqual({ year: 2025, week: 52 });
  });
});
