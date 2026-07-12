import { describe, it, expect } from 'vitest';
import { parseEffisDate } from './index';

describe('parseEffisDate (fechas de EFFIS)', () => {
  it('parsea "YYYY-MM-DD HH:MM:SS" como UTC', () => {
    expect(parseEffisDate('2026-07-08 11:51:00')).toBe('2026-07-08T11:51:00Z');
  });

  it('trunca los microsegundos de LASTUPDATE', () => {
    expect(parseEffisDate('2026-07-11 18:14:23.967018')).toBe('2026-07-11T18:14:23Z');
  });

  it('acepta separador con T', () => {
    expect(parseEffisDate('2026-07-08T11:51:00')).toBe('2026-07-08T11:51:00Z');
  });

  it('acepta solo fecha (medianoche UTC)', () => {
    expect(parseEffisDate('2026-07-08')).toBe('2026-07-08T00:00:00Z');
  });

  it('devuelve null ante valores no válidos', () => {
    expect(parseEffisDate('')).toBeNull();
    expect(parseEffisDate('basura')).toBeNull();
    expect(parseEffisDate(undefined)).toBeNull();
    expect(parseEffisDate(12345)).toBeNull();
  });

  it('la fecha parseada es comparable para el filtro de campaña (≤45 días)', () => {
    // Coherencia: el ISO producido es parseable por Date.parse (lo usa el filtro).
    const iso = parseEffisDate('2026-07-08 11:51:00');
    expect(iso).not.toBeNull();
    expect(Number.isNaN(Date.parse(iso as string))).toBe(false);
  });
});
