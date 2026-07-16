/**
 * Serialización tabular para exportar/compartir el informe: CSV (descarga) y TSV
 * (portapapeles). Recibe filas ya formateadas (string[][]) — el mapeo
 * incendio→fila y las etiquetas i18n viven en el componente. Puro y testeable.
 */

/** Escapa un campo CSV: entrecomilla si contiene coma, comilla o salto de línea. */
function csvCell(v: string): string {
  const s = v ?? '';
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * CSV RFC 4180 con BOM UTF-8 (para que Excel respete los acentos) y CRLF.
 * `rows[0]` se trata como cabecera (sin semántica especial, solo por convención).
 */
export function toCsv(rows: string[][]): string {
  const body = rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  return `﻿${body}\r\n`;
}

/** TSV para pegar en hojas de cálculo desde el portapapeles (tabuladores). */
export function toTsv(rows: string[][]): string {
  return rows
    .map((r) => r.map((c) => (c ?? '').replace(/[\t\n\r]/g, ' ')).join('\t'))
    .join('\n');
}

/** Nombre de archivo con fecha (YYYY-MM-DD) determinista desde un ms dado. */
export function exportFilename(prefix: string, ms: number): string {
  const d = new Date(ms);
  const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return `${prefix}-${iso}.csv`;
}
