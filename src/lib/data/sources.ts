/**
 * Catálogo de fuentes: endpoints, atribución y licencia. Fuente de verdad para
 * la pantalla "Fuentes y licencias" y para los adaptadores en ./adapters.
 * Detalle y matices legales en docs/DATA-SOURCES.md (§1 y §5).
 */

import type { SourceId } from '@/types/fire';

export interface SourceMeta {
  id: SourceId;
  label: string;
  /** Endpoint principal (documentación en docs/DATA-SOURCES.md). */
  endpoint: string;
  format: string;
  /** Texto de atribución exigido/recomendado. */
  attribution: string;
  license: string;
  /** true = requiere clave/registro. */
  requiresKey: boolean;
}

export const SOURCES: Record<SourceId, SourceMeta> = {
  firms: {
    id: 'firms',
    label: 'NASA FIRMS · VIIRS / MODIS',
    endpoint: 'https://firms.modaps.eosdis.nasa.gov/api/area/csv/[KEY]/[SOURCE]/[BBOX]/[DAYS]',
    format: 'CSV/KML',
    attribution: 'NASA FIRMS (LANCE) — focos térmicos, dominio público',
    license: 'Dominio público (cita recomendada)',
    requiresKey: true,
  },
  effis: {
    id: 'effis',
    label: 'EFFIS / Copernicus EMS',
    endpoint: 'https://maps.effis.emergency.copernicus.eu/effis',
    format: 'WMS / WFS (GeoJSON)',
    attribution: 'European Forest Fire Information System – EFFIS (© European Union)',
    license: 'CC BY 4.0',
    requiresKey: false,
  },
  fogos: {
    id: 'fogos',
    label: 'fogos.pt / ANEPC',
    endpoint: 'https://api.fogos.pt/v2/incidents/active',
    format: 'JSON',
    attribution: 'fogos.pt (VOST Portugal) — datos de la ANEPC',
    license: 'Código Apache 2.0; datos ICNF/IPMA (verificar términos, registro en curso)',
    requiresKey: true,
  },
  icnf: {
    id: 'icnf',
    label: 'ICNF — áreas ardidas',
    endpoint:
      'https://sigservices.icnf.pt/server/rest/services/BDG/areas_ardidas/MapServer/0/query?f=geojson',
    format: 'GeoJSON',
    attribution: 'ICNF (Portugal)',
    license: 'Reutilización libre con atribución',
    requiresKey: false,
  },
  jcyl: {
    id: 'jcyl',
    label: 'Castilla y León (JCyL)',
    endpoint:
      'https://analisis.datosabiertos.jcyl.es/api/explore/v2.1/catalog/datasets/incendios-forestales/records',
    format: 'JSON / GeoJSON / CSV',
    attribution: 'Junta de Castilla y León — datos abiertos',
    license: 'Reutilización libre (Ley 37/2007)',
    requiresKey: false,
  },
  catalunya: {
    id: 'catalunya',
    label: 'Bombers de la Generalitat (Catalunya)',
    endpoint: 'https://analisi.transparenciacatalunya.cat/resource/g2ay-3vnj.json',
    format: 'JSON / GeoJSON / CSV',
    attribution: 'Generalitat de Catalunya — Transparència',
    license: 'Reutilización libre',
    requiresKey: false,
  },
  infoca: {
    id: 'infoca',
    label: 'INFOCA (Andalucía)',
    endpoint: 'https://laagencia.maps.arcgis.com/apps/dashboards/87a5fe2d397e4140add84f50d8bdafd3',
    format: 'Dashboard (REST no documentado)',
    attribution: 'Plan INFOCA — Junta de Andalucía',
    license: 'Reutilización libre con mención',
    requiresKey: false,
  },
  aemet: {
    id: 'aemet',
    label: 'AEMET / IPMA',
    endpoint: 'https://www.aemet.es/es/datos_abiertos/estadisticas/riesgo_incendios',
    format: 'GeoTIFF / CSV',
    attribution: 'AEMET (España) e IPMA (Portugal) — meteorología y riesgo (FWI/IPIF)',
    license: 'Reutilización libre con atribución',
    requiresKey: false,
  },
  nacional: {
    id: 'nacional',
    label: 'Fuentes nacionales / 112',
    endpoint: '(varía por CCAA)',
    format: 'Varía',
    attribution: 'Servicios de emergencia autonómicos (112, planes INFO*)',
    license: 'Reutilización libre con atribución',
    requiresKey: false,
  },
};

/** Cartografía base (no es fuente de incendios pero requiere atribución). */
export const BASEMAP_ATTRIBUTION = '© OpenStreetMap (ODbL) · OpenFreeMap';

/** Disclaimer legal permanente. Nunca se oculta. */
export const DISCLAIMER_112 =
  'No sustituye a los canales oficiales de emergencia. Emergencias: 112';
