'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Map, Marker, Popup, Source, Layer, type MapRef } from 'react-map-gl/maplibre';
import { FireMarker } from './FireMarker';
import { MapControls } from './MapControls';
import { MapLegend } from './MapLegend';
import { IslandInset } from './IslandInset';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { useEffectiveTheme } from '@/lib/hooks/useTheme';
import { isIslandFire } from '@/lib/fires/derive';
import { STATE_LABEL_KEY, STATE_TEXT_CLASS } from '@/lib/fires/style';
import { statePalette } from '@/lib/design/tokens';
import type { FeatureCollection, Polygon } from 'geojson';
import { formatNumber } from '@/lib/utils/format';
import { timeAgoNow } from '@/lib/time';
import {
  GEO,
  INITIAL_VIEW,
  MAP_STYLE,
  MAX_ZOOM,
  MIN_ZOOM,
  maskPaint,
} from '@/lib/map/config';
import { SOURCES } from '@/lib/data/sources';
import type { Fire } from '@/types/fire';

/**
 * Mapa MapLibre (2a). Estilo oscuro/claro sin API key, máscara del mundo con
 * España+Portugal recortados y halo sutil, marcadores por estado (color+forma),
 * tooltip al hover, controles y leyenda plegable. Es un componente cliente; se
 * monta vía next/dynamic ssr:false (ver MapCanvasClient).
 */
export interface MapCanvasProps {
  fires: Fire[];
  onSelect: (fire: Fire) => void;
  hoveredSlug?: string | null;
  onHover?: (slug: string | null) => void;
}

export function MapCanvas({ fires, onSelect, hoveredSlug, onHover }: MapCanvasProps) {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);
  const perimetersVisible = useUIStore((s) => s.perimetersVisible);
  const togglePerimeters = useUIStore((s) => s.togglePerimeters);
  const theme = useEffectiveTheme();
  const mapRef = useRef<MapRef>(null);
  const [tip, setTip] = useState<string | null>(null);

  const paint = useMemo(() => maskPaint(theme), [theme]);
  const peninsular = useMemo(() => fires.filter((f) => !isIslandFire(f)), [fires]);
  const islands = useMemo(() => fires.filter(isIslandFire), [fires]);
  const tipFire = tip ? fires.find((f) => f.slug === tip) : null;

  // Perímetros de área quemada (EFFIS): color por estado, según tema.
  const perimeters = useMemo<FeatureCollection<Polygon>>(() => {
    const palette = statePalette(theme);
    return {
      type: 'FeatureCollection',
      features: fires
        .filter((f) => f.perimeter && f.perimeter.length > 2)
        .map((f) => ({
          type: 'Feature',
          properties: { slug: f.slug, color: palette[f.state].base },
          geometry: { type: 'Polygon', coordinates: [f.perimeter!] },
        })),
    };
  }, [fires, theme]);
  const hasPerimeters = perimeters.features.length > 0;

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    navigator.geolocation.getCurrentPosition((pos) => {
      mapRef.current?.flyTo({
        center: [pos.coords.longitude, pos.coords.latitude],
        zoom: 8,
        duration: reduce ? 0 : 800,
      });
    });
  }, []);

  const hover = useCallback(
    (slug: string | null) => {
      setTip(slug);
      onHover?.(slug);
    },
    [onHover],
  );

  // Hook de pruebas E2E (solo con ?e2e en la URL): expone el mapa para tests
  // visuales automatizados. Sin efecto en uso normal.
  const handleLoad = useCallback((e: { target: unknown }) => {
    if (typeof window !== 'undefined' && window.location.search.includes('e2e')) {
      (window as unknown as { __ibermap?: unknown }).__ibermap = e.target;
    }
  }, []);

  return (
    <Map
      ref={mapRef}
      reuseMaps
      onLoad={handleLoad}
      mapStyle={MAP_STYLE[theme]}
      initialViewState={INITIAL_VIEW}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      dragRotate={false}
      renderWorldCopies={false}
      attributionControl={false}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Atribución obligatoria (OpenFreeMap/OSM), propia y discreta: arriba-izq
          en móvil, abajo-centro en desktop (sin chocar con KPIs/leyenda/inset). */}
      <div className="pointer-events-none absolute left-2 top-2 z-[1] font-mono text-[8px] leading-none text-fg-mute lg:left-1/2 lg:top-auto lg:bottom-1.5 lg:-translate-x-1/2">
        © OpenStreetMap · OpenFreeMap
      </div>
      {/* Máscara: mundo atenuado, España+Portugal recortados */}
      <Source id="dim" type="geojson" data={GEO.mask}>
        <Layer
          id="dim-fill"
          type="fill"
          paint={{ 'fill-color': paint.dim.color, 'fill-opacity': paint.dim.opacity }}
        />
      </Source>
      {/* Halo + contorno sutil de ES+PT */}
      <Source id="espt" type="geojson" data={GEO.outline}>
        <Layer
          id="espt-halo"
          type="line"
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{ 'line-color': paint.halo, 'line-width': 5, 'line-blur': 5, 'line-opacity': 0.35 }}
        />
        <Layer
          id="espt-outline"
          type="line"
          layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          paint={{ 'line-color': paint.outline, 'line-width': 1, 'line-opacity': 0.55 }}
        />
      </Source>

      {/* Perímetros de área quemada (EFFIS): relleno traslúcido + borde definido */}
      {perimetersVisible && hasPerimeters && (
        <Source id="perimeters" type="geojson" data={perimeters}>
          <Layer
            id="perimeter-fill"
            type="fill"
            paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.16 }}
          />
          <Layer
            id="perimeter-line"
            type="line"
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{ 'line-color': ['get', 'color'], 'line-width': 1.6, 'line-opacity': 0.85 }}
          />
        </Source>
      )}

      {peninsular.map((f) => (
        <Marker key={f.slug} longitude={f.coordinates[0]} latitude={f.coordinates[1]} anchor="center">
          <FireMarker
            fire={f}
            outline={theme === 'light'}
            highlighted={hoveredSlug === f.slug}
            onSelect={onSelect}
            onHover={hover}
          />
        </Marker>
      ))}

      {tipFire && (
        <Popup
          longitude={tipFire.coordinates[0]}
          latitude={tipFire.coordinates[1]}
          anchor="bottom"
          offset={18}
          closeButton={false}
          closeOnClick={false}
          className="if-tooltip"
        >
          <div className="if-overlay max-w-[180px] rounded-card px-[10px] py-[7px]">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold text-fg">{tipFire.name}</span>
            </div>
            <div className="mt-0.5 text-[10.5px] text-fg-secondary">
              <span className={STATE_TEXT_CLASS[tipFire.state]}>
                {d.states[STATE_LABEL_KEY[tipFire.state]]}
              </span>
              {tipFire.level != null && ` · Nivel ${tipFire.level}`} —{' '}
              <span className="font-mono">{formatNumber(tipFire.hectares)} ha</span>
            </div>
            <div className="mt-[3px] font-mono text-[9px] text-fg-mute">
              {d.status.updatedAgo.replace('{when}', timeAgoNow(tipFire.updatedAt, locale))} ·{' '}
              {SOURCES[tipFire.sources[0] ?? 'nacional'].label.split(' · ')[0]}
            </div>
          </div>
        </Popup>
      )}

      <MapControls
        onLocate={handleLocate}
        layersActive={perimetersVisible && hasPerimeters}
        onToggleLayers={togglePerimeters}
      />
      <MapLegend />
      <IslandInset fires={islands} onSelect={onSelect} />
    </Map>
  );
}
