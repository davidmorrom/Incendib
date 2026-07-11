/**
 * Modelo de dominio de Incendib.
 *
 * Un `Fire` es la unidad canónica que ve el usuario (mapa, informe, ficha).
 * Se construye agregando/normalizando varias fuentes (ver src/lib/data). Los
 * hotspots satelitales crudos (FIRMS) son `Hotspot`, un concepto distinto:
 * son detecciones térmicas, NO incendios confirmados, y así deben comunicarse.
 */

import type { FireState } from '@/lib/design/tokens';

export type { FireState };

/** País de la incidencia (define taxonomía de estado/nivel y idioma del dato). */
export type Country = 'ES' | 'PT';

/**
 * Estado operativo tal cual lo publica la fuente. En España se normaliza a
 * FireState; en Portugal se conservan los estados del SADO/ANEPC.
 * PT: em curso ≈ activo · em resolução ≈ controlándose · em conclusão ·
 * vigilância ≈ estabilizado · encerrada ≈ extinguido.
 */
export type PtState = 'em-curso' | 'em-resolucao' | 'em-conclusao' | 'vigilancia' | 'encerrada';

/** Nivel de gravedad potencial en España (RD 893/2013). null si N/A o PT. */
export type SeverityLevel = 0 | 1 | 2 | 3 | null;

export type FireType = 'forestal' | 'agricola' | 'urbano-forestal';

/** Origen del dato — se muestra siempre en la ficha (transparencia). */
export type SourceId =
  | 'firms'
  | 'effis'
  | 'fogos'
  | 'icnf'
  | 'jcyl'
  | 'catalunya'
  | 'infoca'
  | 'aemet'
  | 'nacional';

/**
 * Tipos de medio aéreo (para el desglose de medios). El color no aplica aquí;
 * cada tipo lleva icono + etiqueta en la ficha.
 */
export type AerialKind =
  | 'anfibio' // avión anfibio (Canadair CL-215/415)
  | 'avion-carga' // avión de carga en tierra (ACT)
  | 'helicoptero' // helicóptero bombardero
  | 'helicoptero-coord' // helicóptero de coordinación
  | 'coordinacion' // avión de coordinación y observación (ACO)
  | 'dron' // UAS / dron
  | 'aereo'; // medios aéreos sin desglosar (la fuente no distingue tipo)

/** Tipos de medio terrestre. */
export type GroundKind =
  | 'bomberos' // bomberos forestales
  | 'brigada' // brigada / cuadrilla forestal (BRIF)
  | 'autobomba' // vehículo autobomba
  | 'maquinaria' // bulldozer / maquinaria pesada
  | 'ume' // Unidad Militar de Emergencias
  | 'gc'; // Guardia Civil / seguridad

/** Unidad de medio con su recuento (aéreo o terrestre). */
export interface ResourceUnit<K extends string> {
  kind: K;
  count: number;
}

/** Ayuda internacional (medios extranjeros vía rescEU / Mec. de Protección Civil UE). */
export interface ForeignAid {
  /** País de procedencia (p. ej. "Francia"). */
  country: string;
  /** Mecanismo (p. ej. "rescEU", "MPCU"). */
  mechanism?: string;
  /** Detalle libre (p. ej. "2 Canadair CL-415"). */
  note?: string;
  aerial?: number;
  ground?: number;
  personnel?: number;
}

/** Medios desplegados. */
export interface Resources {
  aerial?: number;
  ground?: number;
  personnel?: number;
  /** Nota (p. ej. "UME"). */
  note?: string;
  /** Texto libre cuando la fuente no desglosa (p. ej. "vigilancia"). */
  raw?: string;
  /** Desglose de medios aéreos por tipo. */
  aerialUnits?: ResourceUnit<AerialKind>[];
  /** Desglose de medios terrestres por tipo. */
  groundUnits?: ResourceUnit<GroundKind>[];
  /** Medios extranjeros / ayuda internacional desplegada. */
  foreign?: ForeignAid[];
}

/** Meteorología local en el foco (ficha). */
export interface Weather {
  tempC: number;
  humidity: number;
  /** Viento ya formateado, p. ej. "NO 32 km/h". */
  wind: string;
}

/** Punto de la evolución temporal del incendio (timeline de la ficha). */
export interface TimelineEntry {
  /** ISO 8601. */
  at: string;
  label: string;
  state?: FireState;
  hectares?: number;
}

export interface Fire {
  /** Slug estable y URL propia: /f/{slug}. */
  slug: string;
  name: string;
  municipality: string;
  province: string;
  region: string;
  country: Country;
  state: FireState;
  /** Estado literal de la fuente PT, si aplica (para mostrar bilingüe). */
  ptState?: PtState;
  level: SeverityLevel;
  type?: FireType;
  hectares: number;
  /** Variación en las últimas 24 h (ha). Positivo = crece. */
  delta24h?: number;
  /** Coordenadas [lon, lat] para el mapa. */
  coordinates: [number, number];
  /** ISO 8601. */
  startedAt: string;
  /** ISO 8601. Última actualización de la fuente. */
  updatedAt: string;
  resources?: Resources;
  /** Aviso de evacuación / cortes, si lo hay. */
  evacuation?: string;
  /** Fuentes que alimentan esta ficha, en orden de prioridad. */
  sources: SourceId[];
  timeline?: TimelineEntry[];
  /** Riesgo meteorológico (FWI/IPIF) ya etiquetado, p. ej. "Extremo". */
  fwi?: string;
  /** Meteorología local en el foco. */
  weather?: Weather;
  /**
   * Perímetro de área quemada (anillo exterior [lon,lat], cerrado), si está
   * disponible. En live proviene de EFFIS (Sentinel-2, ~20 m). Puede faltar:
   * los focos pequeños o muy recientes no siempre tienen perímetro mapeado.
   */
  perimeter?: [number, number][];
}

/**
 * Detección térmica satelital cruda (NASA FIRMS / EFFIS hotspots).
 * NO es un incendio confirmado. Se dibuja con simbología propia y etiqueta
 * explícita ("Detección satelital VIIRS — no confirmada").
 */
export interface Hotspot {
  id: string;
  coordinates: [number, number];
  /** Fire Radiative Power (MW) — pondera tamaño del punto. */
  frp: number;
  confidence: 'low' | 'nominal' | 'high';
  sensor: 'VIIRS' | 'MODIS';
  /** ISO 8601 de la pasada del satélite. */
  acquiredAt: string;
}

/** Estado de salud de una fuente (pantalla Fuentes y banners por capa). */
export interface SourceStatus {
  id: SourceId;
  label: string;
  description: string;
  status: 'ok' | 'degraded' | 'down';
  /** Línea de licencia/latencia bajo el nombre (p. ej. "CC BY 4.0"). */
  note?: string;
  /** ISO 8601 del último dato disponible. */
  lastUpdate: string;
}
