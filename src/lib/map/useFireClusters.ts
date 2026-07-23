'use client';

import { useMemo } from 'react';
import Supercluster from 'supercluster';
import type { Fire } from '@/types/fire';
import type { FireState } from '@/lib/design/tokens';
import { MAX_ZOOM } from './config';

/**
 * Agrupa (clustering) los marcadores de incendios para que no se solapen a zoom
 * bajo. A zoom alto o cuando hay sitio, cada incendio se muestra individual (su
 * marcador color+forma accesible); cuando dos o más caerían a <32 px se colapsan
 * en una burbuja de recuento que, al pulsarla, amplía. Motivo: los pins a
 * coordenadas geográficas reales se apilan (varios incendios en la misma
 * comarca), lo que incumple WCAG 2.5.8 (Target Size) y dificulta pulsar el
 * correcto. La lista de incendios sigue siendo el equivalente accesible completo.
 * `radius: 32` es el mínimo seguro por encima del marcador real (28 px,
 * `FireMarker`): separa antes que el `44` original sin permitir solape visual.
 *
 * `cluster = false` (p.ej. sin la capa de focos FIRMS visible: hay muchos menos
 * incidentes en pantalla) desactiva el agrupado por completo: cada incendio
 * aparece siempre individual, a cualquier zoom.
 *
 * Determinista: `getClusters(bbox, zoom)` es una función pura del viewport, sin
 * depender de eventos de tiles del mapa (más robusto que `querySourceFeatures`).
 */

/** [oeste, sur, este, norte] en grados. */
export type Bbox = [number, number, number, number];

type PointProps = { fire: Fire };
/** Propiedad agregada del cúmulo: la mayor gravedad presente (para el color). */
type ClusterProps = { maxSeverity: number };

/** Rango de gravedad para colorear el cúmulo por el incendio más grave que contiene. */
const SEVERITY: Record<FireState, number> = {
  activo: 3,
  controlado: 2,
  estabilizado: 1,
  extinguido: 0,
};
const SEVERITY_STATE: Record<number, FireState> = {
  3: 'activo',
  2: 'controlado',
  1: 'estabilizado',
  0: 'extinguido',
};

/** Estado de incendio que representa la gravedad agregada de un cúmulo. */
export function severityState(severity: number): FireState {
  return SEVERITY_STATE[severity] ?? 'extinguido';
}

export type FireClusterItem =
  | { kind: 'point'; fire: Fire; lng: number; lat: number }
  | { kind: 'cluster'; id: number; count: number; severity: number; lng: number; lat: number };

export function useFireClusters(fires: Fire[], bbox: Bbox | null, zoom: number, cluster = true) {
  const index = useMemo(() => {
    const sc = new Supercluster<PointProps, ClusterProps>({
      radius: 32, // px: separación mínima; > 28 px (tamaño del marcador) evita el solape
      maxZoom: MAX_ZOOM,
      map: (props) => ({ maxSeverity: SEVERITY[props.fire.state] }),
      reduce: (acc, props) => {
        if (props.maxSeverity > acc.maxSeverity) acc.maxSeverity = props.maxSeverity;
      },
    });
    sc.load(
      fires.map((f) => ({
        type: 'Feature' as const,
        properties: { fire: f },
        geometry: { type: 'Point' as const, coordinates: [f.coordinates[0], f.coordinates[1]] },
      })),
    );
    return sc;
  }, [fires]);

  const items = useMemo<FireClusterItem[]>(() => {
    if (!bbox) return [];
    if (!cluster) {
      const [w, s, e, n] = bbox;
      return fires
        .filter((f) => f.coordinates[0] >= w && f.coordinates[0] <= e && f.coordinates[1] >= s && f.coordinates[1] <= n)
        .map((f) => ({ kind: 'point' as const, fire: f, lng: f.coordinates[0], lat: f.coordinates[1] }));
    }
    return index.getClusters(bbox, Math.floor(zoom)).map((feat) => {
      const [lng, lat] = feat.geometry.coordinates as [number, number];
      if ('cluster' in feat.properties) {
        return {
          kind: 'cluster',
          id: feat.properties.cluster_id,
          count: feat.properties.point_count,
          severity: feat.properties.maxSeverity,
          lng,
          lat,
        };
      }
      return { kind: 'point', fire: feat.properties.fire, lng, lat };
    });
  }, [index, bbox, zoom, cluster, fires]);

  return { items, index };
}
