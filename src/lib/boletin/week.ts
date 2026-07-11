/**
 * Utilidades de semana ISO 8601 para el boletín semanal.
 *
 * La semana ISO empieza en **lunes** y la semana 1 de un año es la que contiene
 * el primer jueves (equivalente: la que contiene el 4 de enero). En la frontera
 * de año, los últimos días de diciembre pueden pertenecer a la semana 1 del año
 * siguiente, y los primeros de enero a la semana 52/53 del anterior. Todo el
 * cálculo se hace en UTC para no depender de la zona horaria del entorno.
 */

/** Semana ISO (1–53) y año ISO al que pertenece una fecha. */
export function isoWeek(input: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  // Llevar al jueves de esa semana (lunes=1 … domingo=7).
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/** Id estable de edición: (2026, 7) → "2026-w07". */
export function boletinId(year: number, week: number): string {
  return `${year}-w${String(week).padStart(2, '0')}`;
}

/** Parsea "2026-w07" → { year: 2026, week: 7 }, o null si no es válido. */
export function parseBoletinId(id: string): { year: number; week: number } | null {
  const m = /^(\d{4})-w(\d{2})$/.exec(id);
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  if (week < 1 || week > 53) return null;
  return { year, week };
}

/** Lunes (00:00 UTC) de una semana ISO dada. */
export function isoWeekStart(year: number, week: number): Date {
  // 4 de enero siempre cae en la semana 1; su lunes es el inicio de la semana 1.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return start;
}

/** Periodo lunes-domingo (ISO dates, sin hora) de una semana ISO. */
export function isoWeekPeriod(year: number, week: number): { start: string; end: string } {
  const start = isoWeekStart(year, week);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/**
 * Última semana ISO **cerrada** respecto a `now`: la semana anterior a la que
 * contiene `now`. Es la que consolida el boletín (la semana en curso aún no ha
 * terminado). Robusto en fronteras de año.
 */
export function lastClosedWeek(now: Date): { year: number; week: number } {
  const prev = new Date(now.getTime() - 7 * 86400000);
  return isoWeek(prev);
}
