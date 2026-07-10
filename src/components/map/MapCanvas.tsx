'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Map,
  Marker,
  Popup,
  Source,
  Layer,
  AttributionControl,
  type MapRef,
} from 'react-map-gl/maplibre';
import { FireMarker } from './FireMarker';
import { MapControls } from './MapControls';
import { MapLegend } from './MapLegend';
import { IslandInset } from './IslandInset';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { useEffectiveTheme } from '@/lib/hooks/useTheme';
import { isIslandFire } from '@/lib/fires/derive';
import { STATE_LABEL_KEY, STATE_TEXT_CLASS } from '@/lib/fires/style';
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
  const theme = useEffectiveTheme();
  const mapRef = useRef<MapRef>(null);
  const [tip, setTip] = useState<string | null>(null);

  const paint = useMemo(() => maskPaint(theme), [theme]);
  const peninsular = useMemo(() => fires.filter((f) => !isIslandFire(f)), [fires]);
  const islands = useMemo(() => fires.filter(isIslandFire), [fires]);
  const tipFire = tip ? fires.find((f) => f.slug === tip) : null;

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

  return (
    <Map
      ref={mapRef}
      reuseMaps
      mapStyle={MAP_STYLE[theme]}
      initialViewState={INITIAL_VIEW}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      dragRotate={false}
      renderWorldCopies={false}
      attributionControl={false}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Atribución obligatoria (OpenFreeMap/OSM), compacta y arriba-izquierda
          para no chocar con inset ni leyenda. */}
      <AttributionControl compact position="top-left" />
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

      <MapControls onLocate={handleLocate} />
      <MapLegend />
      <IslandInset fires={islands} onSelect={onSelect} />
    </Map>
  );
}
