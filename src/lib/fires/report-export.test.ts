import { describe, it, expect } from 'vitest';
import { toCsv, toTsv, exportFilename } from './report-export';

describe('toCsv', () => {
  it('escapa comas, comillas y saltos de línea', () => {
    const csv = toCsv([
      ['Incendio', 'Provincia'],
      ['Las Hurdes, alto', 'Cáceres'],
      ['Comillas "dobles"', 'Ávila'],
    ]);
    expect(csv.startsWith('﻿')).toBe(true); // BOM UTF-8
    expect(csv).toContain('"Las Hurdes, alto",Cáceres');
    expect(csv).toContain('"Comillas ""dobles""",Ávila');
    expect(csv).toContain('\r\n'); // CRLF
  });
});

describe('toTsv', () => {
  it('usa tabuladores y neutraliza tabs/saltos internos', () => {
    const tsv = toTsv([
      ['A', 'B'],
      ['con\ttab', 'con\nsalto'],
    ]);
    const lines = tsv.split('\n');
    expect(lines[0]).toBe('A\tB');
    expect(lines[1]).toBe('con tab\tcon salto');
  });
});

describe('exportFilename', () => {
  it('añade la fecha ISO', () => {
    const ms = Date.parse('2026-07-16T10:00:00Z');
    expect(exportFilename('incendib-informe', ms)).toBe('incendib-informe-2026-07-16.csv');
  });
});
