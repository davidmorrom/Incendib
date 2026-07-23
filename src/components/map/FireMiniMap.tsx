'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useMemo } from 'react';
import { Map, Marker, Source, Layer } from 'react-map-gl/maplibre';
import { StateGlyph } from '@/components/ui/StateGlyph';
import { useEffectiveTheme } from '@/lib/hooks/useTheme';
import { MAP_STYLE, MIN_ZOOM, MAX_ZOOM } from '@/lib/map/config';
import {
  PERIMETER_LINE_LAYOUT,
  perimeterCasingPaint,
  perimeterFillPaint,
  perimeterLinePaint,
  perimeterApproxFillPaint,
  perimeterApproxLinePaint,
} from '@/lib/map/perimeter';
import { statePalette } from '@/lib/design/tokens';
import type { FeatureCollection, Polygon } from 'geojson';
import type { Fire } from '@/types/fire';

/** Mapa enfocado en un incendio (hero de la ficha): su perímetro + marcador. */
export function FireMiniMap({ fire }: { fire: Fire }) {
  const theme = useEffectiveTheme();
  const perimeterOpts = useMemo(() => ({ imagery: false, darkBase: theme === 'dark' }), [theme]);
  const perimeter = useMemo<FeatureCollection<Polygon> | null>(() => {
    if (!fire.perimeter || fire.perimeter.length < 3) return null;
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { kind: 'fire', color: statePalette(theme)[fire.state].base },
          geometry: { type: 'Polygon', coordinates: [fire.perimeter] },
        },
      ],
    };
  }, [fire, theme]);
  const approxPerimeter = fire.perimeterApprox || fire.perimeterProvisional;
  // Extensión provisional (`perimeterExtra`): polígono aparte, siempre discontinuo,
  // que se SUMA al perímetro satelital sin sustituirlo.
  const extra = useMemo<FeatureCollection<Polygon> | null>(() => {
    if (!fire.perimeterExtra || fire.perimeterExtra.length < 3) return null;
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { kind: 'fire', color: statePalette(theme)[fire.state].base },
          geometry: { type: 'Polygon', coordinates: [fire.perimeterExtra] },
        },
      ],
    };
  }, [fire, theme]);

  // Encuadre: si hay perímetro o extensión, ajusta la vista a su extensión total
  // (incluye el marcador del foco) para que un frente alargado no quede
  // recortado; si no, centra en el foco con zoom fijo.
  const bounds = useMemo<[[number, number], [number, number]] | null>(() => {
    const rings: [number, number][] = [];
    if (fire.perimeter && fire.perimeter.length >= 3) rings.push(...fire.perimeter);
    if (fire.perimeterExtra && fire.perimeterExtra.length >= 3) rings.push(...fire.perimeterExtra);
    if (!rings.length) return null;
    const pts = [...rings, fire.coordinates];
    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
    for (const [lon, lat] of pts) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    return [[minLon, minLat], [maxLon, maxLat]];
  }, [fire]);

  return (
    <Map
      reuseMaps
      mapStyle={MAP_STYLE[theme]}
      initialViewState={{ longitude: fire.coordinates[0], latitude: fire.coordinates[1], zoom: 10.5 }}
      onLoad={(e) => {
        if (bounds) e.target.fitBounds(bounds, { padding: 36, maxZoom: 13, duration: 0 });
      }}
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
      {perimeter &&
        (approxPerimeter ? (
          <Source id="fp" type="geojson" data={perimeter}>
            <Layer id="fp-approx-fill" type="fill" paint={perimeterApproxFillPaint()} />
            <Layer
              id="fp-approx-line"
              type="line"
              layout={PERIMETER_LINE_LAYOUT}
              paint={perimeterApproxLinePaint()}
            />
          </Source>
        ) : (
          <Source id="fp" type="geojson" data={perimeter}>
            <Layer id="fp-fill" type="fill" paint={perimeterFillPaint(perimeterOpts)} />
            <Layer id="fp-casing" type="line" layout={PERIMETER_LINE_LAYOUT} paint={perimeterCasingPaint(perimeterOpts)} />
            <Layer id="fp-line" type="line" layout={PERIMETER_LINE_LAYOUT} paint={perimeterLinePaint(perimeterOpts)} />
          </Source>
        ))}
      {extra && (
        <Source id="fpx" type="geojson" data={extra}>
          <Layer id="fpx-fill" type="fill" paint={perimeterApproxFillPaint()} />
          <Layer id="fpx-line" type="line" layout={PERIMETER_LINE_LAYOUT} paint={perimeterApproxLinePaint()} />
        </Source>
      )}
      <Marker longitude={fire.coordinates[0]} latitude={fire.coordinates[1]} anchor="center">
        <StateGlyph state={fire.state} size={20} outline={theme === 'light'} />
      </Marker>
    </Map>
  );
}
