'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { KpiStrip } from '@/components/ui/KpiStrip';
import { MapCanvasClient } from '@/components/map/MapCanvasClient';
import { DesktopKpiOverlay } from '@/components/map/DesktopKpiOverlay';
import { FiltersSidebar } from '@/components/map/FiltersSidebar';
import { FireListSheet } from '@/components/fires/FireListSheet';
import { DesktopFireList } from '@/components/fires/DesktopFireList';
import { computeKpis, sortByGravity } from '@/lib/fires/derive';
import { DEFAULT_FILTERS, applyFilters, type FireFilters } from '@/lib/fires/filters';
import { useNow } from '@/components/time/NowProvider';
import { useDict } from '@/components/i18n/I18nProvider';
import { useBottomSheet, sanitizeSnaps } from '@/lib/hooks/useBottomSheet';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import type { Fire } from '@/types/fire';

/**
 * Pantalla Mapa (home, 2a móvil / 1d desktop). Un único mapa compartido; el
 * layout es una pila en móvil y un panel de 3 columnas (filtros · mapa · lista)
 * en `lg:`. Filtros unificados que afectan a mapa y lista.
 */
export function MapaScreen({
  fires,
  focos24h,
}: {
  fires: Fire[];
  focos24h: number;
}) {
  const router = useRouter();
  const now = useNow();
  const d = useDict();
  const [filters, setFilters] = useState<FireFilters>(DEFAULT_FILTERS);
  const [hovered, setHovered] = useState<string | null>(null);
  // En móvil no hay barra lateral de filtros (es `lg:` only): el chip «+ Filtros»
  // del sheet abre este panel para dar acceso a los filtros avanzados.
  const [filtersOpen, setFiltersOpen] = useState(false);

  const kpis = useMemo(() => computeKpis(fires), [fires]);
  const activeCount = kpis.activos;
  const visible = useMemo(
    () => sortByGravity(applyFilters(fires, filters, now)),
    [fires, filters, now],
  );

  const patch = useCallback((p: Partial<FireFilters>) => setFilters((f) => ({ ...f, ...p })), []);
  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), []);
  const select = useCallback((f: Fire) => router.push(`/f/${f.slug}`), [router]);

  // Hoja de incendios arrastrable (solo móvil; en `lg:` la lista es una columna
  // fija). Tres anclajes: asomo (ver casi todo el mapa) · medio (por defecto) ·
  // desplegada (más lista, un asomo de mapa arriba).
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const getSnaps = useCallback(
    (h: number) =>
      sanitizeSnaps([Math.round(h * 0.34), Math.round(h * 0.52), h - 92], h, { min: 128 }),
    [],
  );
  const { containerRef, sheetRef, grabberProps } = useBottomSheet<HTMLDivElement, HTMLElement>({
    getSnaps,
    initialSnap: 1,
    enabled: isMobile,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[264px_1fr_340px] lg:grid-rows-1">
      {/* Móvil: cabecera + KPIs */}
      <div className="flex-none lg:hidden">
        <AppHeader />
        <KpiStrip activos={kpis.activos} hectares={kpis.hectares} focos24h={focos24h} />
      </div>

      {/* Desktop: barra lateral de filtros */}
      <FiltersSidebar
        className="hidden lg:flex lg:col-start-1"
        fires={fires}
        filters={filters}
        onChange={patch}
        onReset={reset}
        visible={visible.length}
        total={fires.length}
      />

      {/* Región mapa + hoja. En móvil es una columna medible (el mapa `flex-1`
          crece cuando la hoja encoge y a la inversa). En `lg:` este contenedor
          desaparece (`display:contents`) y sus hijos entran directos en la
          rejilla de 3 columnas (mapa · col-2, la hoja se oculta). */}
      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1 flex-col lg:contents"
      >
        {/* Mapa compartido */}
        <div className="relative min-h-0 flex-1 bg-bg-map lg:col-start-2">
          <MapCanvasClient
            fires={visible}
            onSelect={select}
            hoveredSlug={hovered}
            onHover={setHovered}
          />
          <DesktopKpiOverlay
            className="hidden lg:flex lg:flex-col"
            activos={kpis.activos}
            hectares={kpis.hectares}
            focos24h={focos24h}
          />
        </div>

        {/* Móvil: bottom sheet arrastrable */}
        <FireListSheet
          className="lg:hidden"
          fires={visible}
          activeCount={activeCount}
          filters={filters}
          onChange={patch}
          onSelect={select}
          onHover={setHovered}
          hoveredSlug={hovered}
          onOpenFilters={() => setFiltersOpen(true)}
          sheetRef={sheetRef}
          grabberProps={isMobile ? grabberProps : undefined}
        />
      </div>

      {/* Móvil: filtros avanzados en modal (la barra lateral es solo desktop) */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end lg:hidden">
          <button
            type="button"
            aria-label={d.filters.close}
            onClick={() => setFiltersOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative flex max-h-[82dvh] flex-col rounded-t-[16px] border-t bg-bg-raised">
            <div
              className="mx-auto mt-2 h-1 w-9 flex-none rounded-full"
              style={{ background: 'var(--border-strong)' }}
              aria-hidden
            />
            <FiltersSidebar
              className="flex min-h-0 flex-1 border-r-0"
              fires={fires}
              filters={filters}
              onChange={patch}
              onReset={reset}
              visible={visible.length}
              total={fires.length}
            />
          </div>
        </div>
      )}

      {/* Desktop: lista derecha */}
      <DesktopFireList
        className="hidden lg:flex lg:col-start-3"
        fires={visible}
        onSelect={select}
        onHover={setHovered}
        hoveredSlug={hovered}
      />
    </div>
  );
}
