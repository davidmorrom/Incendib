/** Etiquetas legibles de incendios: estados PT (bilingües) y abreviaturas. */

import type { Fire, PtState } from '@/types/fire';

/** Estado PT en su idioma original (dato bilingüe, no se traduce). */
export const PT_TEXT: Record<PtState, string> = {
  'em-curso': 'Em curso',
  'em-resolucao': 'Em resolução',
  'em-conclusao': 'Em conclusão',
  vigilancia: 'Vigilância',
  encerrada: 'Encerrada',
};

/** Abreviaturas de CCAA (ES) para la columna densa del informe. */
const ES_ABBR: Record<string, string> = {
  Extremadura: 'EXT',
  Canarias: 'CAN',
  Galicia: 'GAL',
  'Castilla y León': 'CYL',
  Andalucía: 'AND',
  'Comunidad Valenciana': 'VAL',
  Cataluña: 'CAT',
  Aragón: 'ARA',
  'Castilla-La Mancha': 'CLM',
  Madrid: 'MAD',
  'Región de Murcia': 'MUR',
  Asturias: 'AST',
  Cantabria: 'CTB',
  'País Vasco': 'PVA',
  Navarra: 'NAV',
  'La Rioja': 'RIO',
  Baleares: 'BAL',
};

/** Región abreviada: CCAA (ES) o región sin sufijo (PT). */
export function regionLabel(fire: Fire): string {
  if (fire.country === 'PT') return fire.region.replace(/\s*\(PT\)/, '');
  return ES_ABBR[fire.region] ?? fire.region.slice(0, 3).toUpperCase();
}

/** Subtítulo denso del informe: "Provincia · REGIÓN". */
export function reportSubtitle(fire: Fire): string {
  return `${fire.province} · ${regionLabel(fire)}`;
}
