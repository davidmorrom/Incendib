/**
 * Estadística histórica EGIF (Estadística General de Incendios Forestales,
 * MITECO). Datos ESTÁTICOS versionados en `src/content/estadisticas/egif.json`
 * (fase F1 del research, doc `docs/research/05-propuesta-estadisticas.md`).
 *
 * Regla de oro (igual que el proyecto de referencia): NO se fusionan fuentes.
 * Esta serie es estadística administrativa oficial (EGIF) — distinta de EFFIS
 * (satélite, perímetros) y FIRMS (detecciones térmicas). Cada gráfico dice de
 * dónde sale su dato. Nunca se estima ni se rellena un hueco: si no hay cifra
 * fiable, `null` → «sin dato».
 *
 * Los cortes consolidado/provisional difieren por métrica y por eso se marcan
 * por separado: la superficie tiene serie definitiva más larga (indicador
 * IEPNB 06c, 2006-2019) que el nº de siniestros (informe decenal, 2006-2015);
 * el resto son avances provisionales que MITECO puede revisar.
 */
import raw from '@/content/estadisticas/egif.json';

/** Un año de la serie nacional EGIF. */
export interface EgifYear {
  year: number;
  /** Número de siniestros (conatos <1 ha + incendios ≥1 ha). `null` = sin dato. */
  fires: number | null;
  /** `true` si el recuento de siniestros de ese año es avance/provisional. */
  firesProvisional: boolean;
  /** Superficie forestal total quemada (ha). `null` = sin dato. */
  hectares: number | null;
  /** `true` si la superficie de ese año es avance/provisional. */
  hectaresProvisional: boolean;
}

/** Una entrada de un ranking territorial por superficie. */
export interface EgifRankItem {
  name: string;
  hectares: number;
}

/** Ranking territorial (CCAA o provincias) por superficie quemada. */
export interface EgifRanking {
  /** Periodo/base del ranking, p. ej. "2006-2015". */
  period: string;
  /** `true` si el dato del periodo es provisional. */
  provisional: boolean;
  items: EgifRankItem[];
}

/** Fuente citable. */
export interface EgifSource {
  name: string;
  url: string;
}

/** Conjunto completo de datos EGIF para la página de Estadísticas. */
export interface EgifDataset {
  /** Serie anual nacional (orden cronológico ascendente). */
  series: EgifYear[];
  /** Top CCAA por superficie (o `null` si no hay ranking fiable). */
  topCcaa: EgifRanking | null;
  /** Top provincias por superficie (o `null` si no hay ranking fiable). */
  topProvincias: EgifRanking | null;
  /** Fuentes oficiales citables. */
  sources: EgifSource[];
  /** Nota de corte/edición de los datos (para transparencia). */
  dataNote: string;
}

const dataset = raw as EgifDataset;

/** Devuelve el conjunto de datos EGIF (estático, versionado en el repo). */
export function getEgifDataset(): EgifDataset {
  return dataset;
}

/** Cifras derivadas para los KPIs de cabecera. */
export interface EgifAggregates {
  /** Media anual de siniestros sobre los años consolidados. */
  meanFires: number | null;
  /** Media anual de superficie (ha) sobre los años consolidados. */
  meanHectares: number | null;
  /** Rango de años consolidados de superficie (para el pie del KPI). */
  hectaresConsolidatedFrom: number | null;
  hectaresConsolidatedTo: number | null;
  /** Año con más superficie quemada de toda la serie. */
  worst: EgifYear | null;
  /** Último año con algún dato (aunque sea provisional). */
  latest: EgifYear | null;
}

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Calcula las cifras derivadas para los KPIs (media, peor año, último). */
export function aggregate(d: EgifDataset): EgifAggregates {
  const consFires = d.series.filter((y) => y.fires != null && !y.firesProvisional);
  const consHa = d.series.filter((y) => y.hectares != null && !y.hectaresProvisional);

  let worst: EgifYear | null = null;
  for (const y of d.series) {
    if (y.hectares != null && (worst == null || y.hectares > (worst.hectares as number))) worst = y;
  }
  let latest: EgifYear | null = null;
  for (let i = d.series.length - 1; i >= 0; i--) {
    const y = d.series[i];
    if (y && (y.fires != null || y.hectares != null)) {
      latest = y;
      break;
    }
  }

  const firstHa = consHa[0];
  const lastHa = consHa[consHa.length - 1];

  return {
    meanFires: mean(consFires.map((y) => y.fires as number)),
    meanHectares: mean(consHa.map((y) => y.hectares as number)),
    hectaresConsolidatedFrom: firstHa ? firstHa.year : null,
    hectaresConsolidatedTo: lastHa ? lastHa.year : null,
    worst,
    latest,
  };
}
