/**
 * Boletín semanal de Incendib — snapshot consolidado e **inmutable** de una
 * semana natural (lunes-domingo, semana ISO). A diferencia del `/informe` en
 * vivo (2b), una edición cerrada NO se recalcula: lo que citó la prensa sigue
 * igual. Ver docs/research/03-propuesta-informe-semanal.md.
 *
 * Los destacados se **incrustan** (no se referencian por slug) para que la
 * edición sea autónoma aunque el incendio desaparezca del dato en vivo.
 */

import type { Country, FireState, SeverityLevel, SourceId } from '@/types/fire';

/** Cifras agregadas de la semana. */
export interface BoletinKpi {
  /** Detecciones térmicas FIRMS (VIIRS/MODIS) en la ventana (ES+PT). */
  firmsWeek: number;
  /** Incendios en seguimiento al cierre (no extinguidos). */
  activeFires: number;
  /** Superficie afectada acumulada (ha) de los incendios en seguimiento. */
  hectares: number;
  /** Perímetros de área quemada (EFFIS) adjuntos. */
  perimeters: number;
  /** Nivel de gravedad máximo alcanzado (ES). */
  maxLevel: SeverityLevel;
  /** Dónde se alcanzó ese nivel (nombre + territorio). */
  maxLevelWhere?: string;
}

/** Fila del ranking territorial de la semana. */
export interface BoletinRankRow {
  region: string;
  country: Country;
  /** Incendios en seguimiento en el territorio. */
  fires: number;
  /** Superficie acumulada (ha). */
  hectares: number;
}

/** Incendio destacado, incrustado en la edición (autónomo e inmutable). */
export interface BoletinHighlight {
  slug: string;
  name: string;
  region: string;
  country: Country;
  hectares: number;
  level: SeverityLevel;
  state: FireState;
  /** Coordenadas [lon, lat] para que la ficha histórica pueda dibujar el mapa aunque
   * el incendio ya no esté en las fuentes en vivo. Opcional: las ediciones anteriores
   * a este campo no las tienen (su ficha se muestra sin mapa). */
  coordinates?: [number, number];
}

/** Una edición del boletín semanal. */
export interface Boletin {
  /** Identificador estable y URL propia: `/boletin/{id}` → "2026-w28". */
  id: string;
  /** Semana ISO 8601 (1–53) y su año ISO. */
  isoWeek: number;
  year: number;
  /** Periodo cubierto (ISO date, lunes y domingo de la semana ISO). */
  periodStart: string;
  periodEnd: string;
  /** Cuándo se generó la edición (ISO 8601). */
  publishedAt: string;
  /** "cerrado" = semana completa e inmutable; "provisional" = en curso. */
  status: 'cerrado' | 'provisional';
  kpi: BoletinKpi;
  /** KPIs de la edición anterior, para calcular variaciones (▲/▼). */
  prevKpi?: BoletinKpi;
  ranking: BoletinRankRow[];
  highlights: BoletinHighlight[];
  /** Fuentes usadas en la edición (para la atribución). */
  sources: SourceId[];
  /** Nota de método/contexto (opcional). */
  note?: string;
}
