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
import { getNow } from '@/lib/time';
import type { Fire } from '@/types/fire';

/**
 * Pantalla Mapa (home, 2a móvil / 1d desktop). Un único mapa compartido; el
 * layout es una pila en móvil y un panel de 3 columnas (filtros · mapa · lista)
 * en `lg:`. Filtros unificados que afectan a mapa y lista.
 */
export function MapaScreen({ fires, focos24h }: { fires: Fire[]; focos24h: number }) {
  const router = useRouter();
  const [filters, setFilters] = useState<FireFilters>(DEFAULT_FILTERS);
  const [hovered, setHovered] = useState<string | null>(null);

  const kpis = useMemo(() => computeKpis(fires), [fires]);
  const activeCount = kpis.activos;
  const visible = useMemo(
    () => sortByGravity(applyFilters(fires, filters, getNow())),
    [fires, filters],
  );

  const patch = useCallback((p: Partial<FireFilters>) => setFilters((f) => ({ ...f, ...p })), []);
  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), []);
  const select = useCallback((f: Fire) => router.push(`/f/${f.slug}`), [router]);

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

      {/* Mapa compartido */}
      <div className="relative min-h-0 flex-1 bg-bg-map lg:col-start-2">
        <MapCanvasClient fires={visible} onSelect={select} hoveredSlug={hovered} onHover={setHovered} />
        <DesktopKpiOverlay
          className="hidden lg:flex lg:flex-col"
          activos={kpis.activos}
          hectares={kpis.hectares}
          focos24h={focos24h}
        />
      </div>

      {/* Móvil: bottom sheet */}
      <FireListSheet
        className="lg:hidden"
        fires={visible}
        activeCount={activeCount}
        filters={filters}
        onChange={patch}
        onSelect={select}
        onHover={setHovered}
        hoveredSlug={hovered}
      />

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
