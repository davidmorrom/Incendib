'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { MapCanvasProps } from './MapCanvas';
import type { Fire, Hotspot } from '@/types/fire';

/**
 * Carga el mapa solo en cliente (ssr:false). react-map-gl/MapLibre necesita
 * DOM/WebGL; `ssr:false` no puede usarse desde un Server Component, de ahí este
 * envoltorio 'use client'. Mientras carga, un panel del color del mapa.
 */
const MapCanvas = dynamic(() => import('./MapCanvas').then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-bg-sunken" aria-hidden />,
});

/**
 * Este envoltorio también carga las capas satelitales (focos FIRMS + perímetros
 * EFFIS) DESDE CLIENTE, en vez de recibirlas por props desde el servidor. Antes
 * la home serializaba ~1000+ focos y los polígonos EFFIS en el HTML (payload RSC
 * de ~750 KB, el 87% del documento) aunque el mapa que los consume es
 * client-only y esos datos no hacen falta para el primer paint: solo inflaban la
 * transferencia y la deserialización de hidratación en el hilo principal. Ahora
 * se piden a /api/map-layers (ISR 5 min) al montar y las capas aparecen en
 * cuanto resuelve el fetch. El mapa base y los marcadores de incidentes (que sí
 * llegan por props, son pocos) se pintan al instante. (v0.34.0)
 */
type Props = Omit<MapCanvasProps, 'hotspots' | 'burnedAreas'>;

export function MapCanvasClient(props: Props) {
  const [layers, setLayers] = useState<{ hotspots: Hotspot[]; burnedAreas: Fire[] }>({
    hotspots: [],
    burnedAreas: [],
  });

  useEffect(() => {
    const ac = new AbortController();
    fetch('/api/map-layers', { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setLayers({
          hotspots: Array.isArray(data.hotspots) ? data.hotspots : [],
          burnedAreas: Array.isArray(data.burnedAreas) ? data.burnedAreas : [],
        });
      })
      .catch(() => {
        // Sin capas satelitales el mapa sigue siendo plenamente funcional con los
        // incidentes oficiales; no es un error que deba interrumpir la UI.
      });
    return () => ac.abort();
  }, []);

  return <MapCanvas {...props} hotspots={layers.hotspots} burnedAreas={layers.burnedAreas} />;
}
