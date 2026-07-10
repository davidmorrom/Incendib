'use client';

import dynamic from 'next/dynamic';
import type { MapCanvasProps } from './MapCanvas';

/**
 * Carga el mapa solo en cliente (ssr:false). react-map-gl/MapLibre necesita
 * DOM/WebGL; `ssr:false` no puede usarse desde un Server Component, de ahí este
 * envoltorio 'use client'. Mientras carga, un panel del color del mapa.
 */
const MapCanvas = dynamic(() => import('./MapCanvas').then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-bg-sunken" aria-hidden />,
});

export function MapCanvasClient(props: MapCanvasProps) {
  return <MapCanvas {...props} />;
}
