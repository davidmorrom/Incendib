'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { KpiStrip } from '@/components/ui/KpiStrip';
import { MapCanvasClient } from '@/components/map/MapCanvasClient';
import { FireListSheet } from '@/components/fires/FireListSheet';
import { computeKpis, sortByGravity } from '@/lib/fires/derive';
import { getNow } from '@/lib/time';
import type { Fire } from '@/types/fire';

export interface MapFilters {
  onlyActive: boolean;
  last24h: boolean;
  levelGE2: boolean;
  spainOnly: boolean;
}

const NO_FILTERS: MapFilters = {
  onlyActive: false,
  last24h: false,
  levelGE2: false,
  spainOnly: false,
};

function applyFilters(fires: Fire[], f: MapFilters, now: number): Fire[] {
  const dayMs = 24 * 3600 * 1000;
  return fires.filter((x) => {
    if (f.onlyActive && x.state !== 'activo') return false;
    if (f.levelGE2 && (x.level ?? 0) < 2) return false;
    if (f.spainOnly && x.country !== 'ES') return false;
    if (f.last24h && now - Date.parse(x.updatedAt) > dayMs) return false;
    return true;
  });
}

/**
 * Pantalla Mapa (home, 2a). Isla cliente: mantiene filtros y hover; los filtros
 * rápidos afectan a mapa y lista a la vez. Tocar un incendio abre su ficha
 * (/f/{slug}), la URL propia y compartible.
 */
export function MapaScreen({ fires, focos24h }: { fires: Fire[]; focos24h: number }) {
  const router = useRouter();
  const [filters, setFilters] = useState<MapFilters>(NO_FILTERS);
  const [hovered, setHovered] = useState<string | null>(null);

  const kpis = useMemo(() => computeKpis(fires), [fires]);
  const visible = useMemo(
    () => sortByGravity(applyFilters(fires, filters, getNow())),
    [fires, filters],
  );

  const toggle = useCallback(
    (key: keyof MapFilters) => setFilters((f) => ({ ...f, [key]: !f[key] })),
    [],
  );
  const select = useCallback((f: Fire) => router.push(`/f/${f.slug}`), [router]);

  return (
    <>
      <AppHeader />
      <KpiStrip activos={kpis.activos} hectares={kpis.hectares} focos24h={focos24h} />
      <div className="relative min-h-0 flex-1 bg-bg-map">
        <MapCanvasClient
          fires={visible}
          onSelect={select}
          hoveredSlug={hovered}
          onHover={setHovered}
        />
      </div>
      <FireListSheet
        fires={visible}
        activeCount={kpis.activos}
        filters={filters}
        onToggle={toggle}
        onSelect={select}
        onHover={setHovered}
        hoveredSlug={hovered}
      />
    </>
  );
}
