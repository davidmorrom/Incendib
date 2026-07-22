'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Map,
  Marker,
  Popup,
  Source,
  Layer,
  type MapRef,
  type MapLayerMouseEvent,
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
import { statePalette } from '@/lib/design/tokens';
import { mix, V } from '@/lib/design/color';
import type { FeatureCollection, Polygon, Point } from 'geojson';
import { formatNumber, timeAgo } from '@/lib/utils/format';
import { useNow } from '@/components/time/NowProvider';
import {
  GEO,
  INITIAL_VIEW,
  MAX_ZOOM,
  MIN_ZOOM,
  basemapAttribution,
  basemapStyle,
  maskPaint,
  resolveBasemap,
} from '@/lib/map/config';
import {
  PERIMETER_LINE_LAYOUT,
  perimeterCasingPaint,
  perimeterFillPaint,
  perimeterLinePaint,
} from '@/lib/map/perimeter';
import { SOURCES } from '@/lib/data/sources';
import type { Fire, Hotspot } from '@/types/fire';

/**
 * Mapa MapLibre (2a). Estilo oscuro/claro sin API key, máscara del mundo con
 * España+Portugal recortados y halo sutil, marcadores por estado (color+forma),
 * tooltip al hover, controles y leyenda plegable. Es un componente cliente; se
 * monta vía next/dynamic ssr:false (ver MapCanvasClient).
 */
export interface MapCanvasProps {
  fires: Fire[];
  hotspots?: Hotspot[];
  /** Áreas quemadas recientes (EFFIS) para la capa de perímetros, aparte de los
   * marcadores de incidentes. Se dibujan en color "extinguido". */
  burnedAreas?: Fire[];
  onSelect: (fire: Fire) => void;
  hoveredSlug?: string | null;
  onHover?: (slug: string | null) => void;
}

/** Detalle de un foco al pulsarlo (popup "detección satelital, no confirmada"). */
interface HotspotTip {
  lng: number;
  lat: number;
  frp: number;
  sensor: string;
}

export function MapCanvas({ fires, hotspots = [], burnedAreas = [], onSelect, hoveredSlug, onHover }: MapCanvasProps) {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);
  const now = useNow();
  const perimetersVisible = useUIStore((s) => s.perimetersVisible);
  const hotspotsVisible = useUIStore((s) => s.hotspotsVisible);
  const basemap = useUIStore((s) => s.basemap);
  const theme = useEffectiveTheme();
  const resolvedBasemap = useMemo(() => resolveBasemap(basemap, theme), [basemap, theme]);
  const mapStyle = useMemo(() => basemapStyle(basemap, theme), [basemap, theme]);
  // Opciones de contraste de los perímetros según la base activa.
  const perimeterOpts = useMemo(
    () => ({ imagery: resolvedBasemap === 'satelite', darkBase: resolvedBasemap === 'oscuro' }),
    [resolvedBasemap],
  );
  const mapRef = useRef<MapRef>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [hotspotTip, setHotspotTip] = useState<HotspotTip | null>(null);
  const [areaTip, setAreaTip] = useState<{
    lng: number;
    lat: number;
    name: string;
    ha: number;
    date: string;
  } | null>(null);
  const [cursor, setCursor] = useState<'grab' | 'pointer'>('grab');

  const paint = useMemo(() => maskPaint(resolvedBasemap), [resolvedBasemap]);
  const peninsular = useMemo(() => fires.filter((f) => !isIslandFire(f)), [fires]);
  const islands = useMemo(() => fires.filter(isIslandFire), [fires]);
  const tipFire = tip ? fires.find((f) => f.slug === tip) : null;

  // Perímetros de área quemada (EFFIS): color por estado, según tema. Se pintan
  // primero las áreas quemadas (extinguido) y encima los incendios activos, para
  // que el perímetro del incidente en curso destaque sobre lo ya quemado.
  const perimeters = useMemo<FeatureCollection<Polygon>>(() => {
    const palette = statePalette(theme);
    const tagged = [
      ...burnedAreas.map((f) => [f, 'area'] as const),
      ...fires.map((f) => [f, 'fire'] as const),
    ];
    return {
      type: 'FeatureCollection',
      features: tagged
        .filter(([f]) => f.perimeter && f.perimeter.length > 2)
        .map(([f, kind]) => ({
          type: 'Feature',
          properties: {
            kind,
            slug: f.slug,
            color: palette[f.state].base,
            name: f.name,
            ha: f.hectares,
            date: f.startedAt,
          },
          geometry: { type: 'Polygon', coordinates: [f.perimeter!] },
        })),
    };
  }, [fires, burnedAreas, theme]);
  const hasPerimeters = perimeters.features.length > 0;

  // Focos satelitales (FIRMS): puntos naranja con glow, tamaño por FRP, con
  // clustering. Detección térmica, NO incendio confirmado.
  const foco = useMemo(() => statePalette(theme).focoSatelital.base, [theme]);
  const ashColor = useMemo(() => statePalette(theme).extinguido.base, [theme]);
  // Edad en horas de cada foco (para atenuar los antiguos). Se recalcula cada
  // ~10 min (bucket) para no rehacer el GeoJSON en cada tic del reloj.
  const ageBucket = Math.floor(now / 600_000);
  const hotspotsGeo = useMemo<FeatureCollection<Point>>(
    () => ({
      type: 'FeatureCollection',
      features: hotspots.map((h) => ({
        type: 'Feature',
        properties: {
          frp: h.frp,
          sensor: h.sensor,
          confidence: h.confidence,
          ageH: Math.max(0, (ageBucket * 600_000 - Date.parse(h.acquiredAt)) / 3_600_000),
        },
        geometry: { type: 'Point', coordinates: h.coordinates },
      })),
    }),
    [hotspots, ageBucket],
  );
  const hasHotspots = hotspots.length > 0;
  const showHotspots = hotspotsVisible && hasHotspots;

  const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (!f) {
      setHotspotTip(null);
      setAreaTip(null);
      return;
    }
    // Clic en un área quemada (EFFIS): muestra su información. Los perímetros de
    // incendios activos (kind 'fire') no abren nada aquí (lo hace el marcador).
    if (f.layer?.id === 'perimeter-fill') {
      if (f.properties?.kind === 'area') {
        setAreaTip({
          lng: e.lngLat.lng,
          lat: e.lngLat.lat,
          name: String(f.properties.name ?? ''),
          ha: Number(f.properties.ha ?? 0),
          date: String(f.properties.date ?? ''),
        });
        setHotspotTip(null);
      }
      return;
    }
    const coords = (f.geometry as Point).coordinates as [number, number];
    if (f.layer?.id === 'hotspot-clusters') {
      const z = mapRef.current?.getZoom() ?? INITIAL_VIEW.zoom;
      mapRef.current?.easeTo({ center: coords, zoom: Math.min(z + 2, MAX_ZOOM), duration: 500 });
      setHotspotTip(null);
    } else if (f.layer?.id === 'hotspot-core') {
      setHotspotTip({
        lng: coords[0],
        lat: coords[1],
        frp: Number(f.properties?.frp ?? 0),
        sensor: String(f.properties?.sensor ?? 'VIIRS'),
      });
    }
  }, []);

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
      onClick={handleMapClick}
      onMouseEnter={() => setCursor('pointer')}
      onMouseLeave={() => setCursor('grab')}
      cursor={cursor}
      interactiveLayerIds={[
        ...(perimetersVisible && hasPerimeters ? ['perimeter-fill'] : []),
        ...(showHotspots ? ['hotspot-clusters', 'hotspot-core'] : []),
      ]}
      mapStyle={mapStyle}
      initialViewState={INITIAL_VIEW}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      dragRotate={false}
      renderWorldCopies={false}
      attributionControl={false}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Atribución obligatoria de la capa base (según el mapa base activo),
          propia y discreta: arriba-izq en móvil, abajo-centro en desktop (sin
          chocar con KPIs/leyenda/inset). */}
      <div
        className={`pointer-events-none absolute left-2 top-2 z-[1] max-w-[70vw] font-mono text-[8px] leading-tight lg:left-1/2 lg:top-auto lg:bottom-1.5 lg:max-w-none lg:-translate-x-1/2 ${
          resolvedBasemap === 'satelite'
            ? 'text-white/80 [text-shadow:0_1px_3px_rgba(0,0,0,0.85)]'
            : 'text-fg-mute'
        }`}
      >
        {basemapAttribution(resolvedBasemap)}
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

      {/* Perímetros (EFFIS + frente activo): relleno traslúcido + casing neutro
          (legible sobre cualquier base) + línea del color del estado. El orden
          fill→casing→line deja el borde nítido encima. Los focos y marcadores
          van después → siempre por encima de los polígonos. */}
      {perimetersVisible && hasPerimeters && (
        <Source id="perimeters" type="geojson" data={perimeters}>
          <Layer id="perimeter-fill" type="fill" paint={perimeterFillPaint(perimeterOpts)} />
          <Layer
            id="perimeter-casing"
            type="line"
            layout={PERIMETER_LINE_LAYOUT}
            paint={perimeterCasingPaint(perimeterOpts)}
          />
          <Layer
            id="perimeter-line"
            type="line"
            layout={PERIMETER_LINE_LAYOUT}
            paint={perimeterLinePaint(perimeterOpts)}
          />
        </Source>
      )}

      {/* Focos satelitales (FIRMS): detección térmica, NO incendio confirmado.
          Naranja con glow, tamaño por FRP, agrupados en cúmulos a poco zoom. */}
      {showHotspots && (
        <Source
          id="hotspots"
          type="geojson"
          data={hotspotsGeo}
          cluster
          clusterRadius={42}
          clusterMaxZoom={9}
        >
          <Layer
            id="hotspot-glow"
            type="circle"
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-color': foco,
              'circle-blur': 1,
              'circle-opacity': ['interpolate', ['linear'], ['get', 'ageH'], 0, 0.32, 24, 0.2, 72, 0.08],
              'circle-radius': ['interpolate', ['linear'], ['get', 'frp'], 0, 6, 50, 12, 150, 20],
            }}
          />
          <Layer
            id="hotspot-core"
            type="circle"
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-color': foco,
              'circle-opacity': ['interpolate', ['linear'], ['get', 'ageH'], 0, 0.95, 24, 0.75, 72, 0.45],
              'circle-radius': ['interpolate', ['linear'], ['get', 'frp'], 0, 2.5, 50, 5, 150, 8],
              'circle-stroke-color':
                perimeterOpts.imagery || theme === 'light' ? '#FFFFFF' : 'rgba(0,0,0,0.35)',
              'circle-stroke-width': perimeterOpts.imagery || theme === 'light' ? 1 : 0.5,
            }}
          />
          <Layer
            id="hotspot-clusters"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': foco,
              'circle-opacity': 0.85,
              'circle-radius': ['step', ['get', 'point_count'], 11, 10, 15, 30, 21],
              'circle-stroke-color': theme === 'light' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.3)',
              'circle-stroke-width': 1.5,
            }}
          />
          <Layer
            id="hotspot-cluster-count"
            type="symbol"
            filter={['has', 'point_count']}
            layout={{
              'text-field': ['get', 'point_count_abbreviated'],
              'text-font': ['Noto Sans Regular'],
              'text-size': 11,
            }}
            paint={{ 'text-color': theme === 'light' ? '#FFFFFF' : '#2A1206' }}
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
              <span className="font-mono">
                {tipFire.hectares > 0
                  ? `${tipFire.hectaresApprox ? '~' : ''}${formatNumber(tipFire.hectares)} ha`
                  : d.kpis.noData}
              </span>
            </div>
            <div className="mt-[3px] font-mono text-[9px] text-fg-mute">
              {d.status.updatedAgo.replace('{when}', timeAgo(tipFire.updatedAt, now, locale))} ·{' '}
              {SOURCES[tipFire.sources[0] ?? 'nacional'].label.split(' · ')[0]}
            </div>
            {tipFire.satelliteConfirmed && (
              <div className="mt-[3px] flex items-center gap-1 font-mono text-[9px] text-state-foco-text">
                <span className="h-1.5 w-1.5 flex-none rounded-full bg-state-foco" aria-hidden />
                {d.fire.satelliteConfirmed.replace('{km}', String(tipFire.hotspotKm ?? 0))}
              </div>
            )}
          </div>
        </Popup>
      )}

      {perimetersVisible && areaTip && (
        <Popup
          longitude={areaTip.lng}
          latitude={areaTip.lat}
          anchor="bottom"
          offset={8}
          closeButton={false}
          closeOnClick={false}
          onClose={() => setAreaTip(null)}
          className="if-tooltip"
        >
          <div
            className="if-overlay max-w-[200px] rounded-card px-[10px] py-[7px]"
            style={{ borderColor: mix(ashColor, 45) }}
          >
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-2 w-2 flex-none rounded-full"
                style={{ backgroundColor: ashColor }}
              />
              <span className="truncate text-[12px] font-semibold text-fg">
                {areaTip.name || d.legend.perimeter}
              </span>
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-fg-secondary">
              {d.legend.perimeter}
              {areaTip.ha > 0 ? ` · ${formatNumber(areaTip.ha)} ha` : ''}
            </div>
            <div className="mt-[3px] font-mono text-[9px] text-fg-mute">
              EFFIS · {timeAgo(areaTip.date, now, locale)}
            </div>
          </div>
        </Popup>
      )}

      {showHotspots && hotspotTip && (
        <Popup
          longitude={hotspotTip.lng}
          latitude={hotspotTip.lat}
          anchor="bottom"
          offset={12}
          closeButton={false}
          closeOnClick={false}
          onClose={() => setHotspotTip(null)}
          className="if-tooltip"
        >
          <div
            className="if-overlay max-w-[200px] rounded-card px-[10px] py-[7px]"
            style={{ borderColor: mix(V.foco, 45) }}
          >
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-2 w-2 flex-none rounded-full bg-state-foco"
                style={{ boxShadow: '0 0 4px var(--state-foco)' }}
              />
              <span className="text-[12px] font-semibold text-fg">{d.legend.foco}</span>
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-fg-secondary">
              {hotspotTip.sensor} · FRP {formatNumber(hotspotTip.frp)} MW
            </div>
            <div className="mt-[3px] font-mono text-[9px] text-state-foco-text">{d.map.notConfirmed}</div>
          </div>
        </Popup>
      )}

      <MapControls onLocate={handleLocate} hasPerimeters={hasPerimeters} hasHotspots={hasHotspots} />
      <MapLegend />
      <IslandInset fires={islands} onSelect={onSelect} />
    </Map>
  );
}
