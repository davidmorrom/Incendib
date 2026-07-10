'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useMemo } from 'react';
import { Map, Marker, Source, Layer } from 'react-map-gl/maplibre';
import { StateGlyph } from '@/components/ui/StateGlyph';
import { useEffectiveTheme } from '@/lib/hooks/useTheme';
import { MAP_STYLE, MIN_ZOOM, MAX_ZOOM } from '@/lib/map/config';
import { statePalette } from '@/lib/design/tokens';
import type { FeatureCollection, Polygon } from 'geojson';
import type { Fire } from '@/types/fire';

/** Mapa enfocado en un incendio (hero de la ficha): su perímetro + marcador. */
export function FireMiniMap({ fire }: { fire: Fire }) {
  const theme = useEffectiveTheme();
  const perimeter = useMemo<FeatureCollection<Polygon> | null>(() => {
    if (!fire.perimeter || fire.perimeter.length < 3) return null;
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { color: statePalette(theme)[fire.state].base },
          geometry: { type: 'Polygon', coordinates: [fire.perimeter] },
        },
      ],
    };
  }, [fire, theme]);

  return (
    <Map
      reuseMaps
      mapStyle={MAP_STYLE[theme]}
      initialViewState={{ longitude: fire.coordinates[0], latitude: fire.coordinates[1], zoom: 10.5 }}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      dragRotate={false}
      renderWorldCopies={false}
      attributionControl={false}
      style={{ width: '100%', height: '100%' }}
    >
      <div className="pointer-events-none absolute bottom-1 left-2 z-[1] font-mono text-[8px] leading-none text-fg-mute">
        © OpenStreetMap · OpenFreeMap
      </div>
      {perimeter && (
        <Source id="fp" type="geojson" data={perimeter}>
          <Layer id="fp-fill" type="fill" paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.16 }} />
          <Layer
            id="fp-line"
            type="line"
            paint={{ 'line-color': ['get', 'color'], 'line-width': 1.6, 'line-opacity': 0.85 }}
          />
        </Source>
      )}
      <Marker longitude={fire.coordinates[0]} latitude={fire.coordinates[1]} anchor="center">
        <StateGlyph state={fire.state} size={20} outline={theme === 'light'} />
      </Marker>
    </Map>
  );
}
