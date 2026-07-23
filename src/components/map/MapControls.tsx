'use client';

import { useRef, useState } from 'react';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { useEffectiveTheme } from '@/lib/hooks/useTheme';
import { BASEMAP_OPTIONS, resolveBasemap, type ResolvedBasemap } from '@/lib/map/config';
import { cn } from '@/lib/utils/cn';

const btn = 'if-overlay grid h-9 w-9 place-items-center rounded-card';

/** Clave i18n de la etiqueta de cada mapa base. */
const BASEMAP_LABEL: Record<ResolvedBasemap, keyof ReturnType<typeof useDict>['map']> = {
  claro: 'basemapClaro',
  satelite: 'basemapSatelite',
  relieve: 'basemapRelieve',
  oscuro: 'basemapOscuro',
};

/** Miniatura CSS representativa de cada base (mnemónico, no dato). */
const BASEMAP_PREVIEW: Record<ResolvedBasemap, string> = {
  claro: 'linear-gradient(135deg,#F4F2EC,#D9D3C4)',
  satelite: 'linear-gradient(135deg,#16324a 0%,#2f5a3a 55%,#6b5a38 100%)',
  relieve: 'linear-gradient(135deg,#e7ddc1,#b7c299 55%,#8fa06f)',
  oscuro: 'linear-gradient(135deg,#0C1117,#1e2a3a)',
};

/** Fila-conmutador de una capa (dato superpuesto) dentro del panel. */
function LayerToggle({
  label,
  on,
  disabled,
  onToggle,
}: {
  label: string;
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-[6px] px-2 py-1.5 text-left text-[11.5px]',
        disabled ? 'opacity-40' : on ? 'text-fg' : 'text-fg-secondary',
      )}
    >
      <span>{label}</span>
      <span
        aria-hidden
        className={cn(
          'relative h-[15px] w-[26px] flex-none rounded-full transition-colors',
          on ? 'bg-action' : 'bg-[var(--border-strong)]',
        )}
      >
        <span
          className={cn(
            'absolute top-[2px] h-[11px] w-[11px] rounded-full bg-white transition-all',
            on ? 'left-[13px]' : 'left-[2px]',
          )}
        />
      </span>
    </button>
  );
}

/** Etiqueta de sección (mayúsculas mono, como el resto de overlays). */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-fg-mute">
      {children}
    </div>
  );
}

/**
 * Selector de mapa base (radiogroup accesible). Satélite/relieve son vistas
 * propias, independientes del tema de la UI; claro/oscuro en cambio siguen al
 * tema si luego se conmuta (ver `setTheme`). La opción resaltada es la
 * resuelta según el tema cuando la preferencia es `auto`. Flechas para
 * navegar; Enter/Espacio para elegir.
 */
function BasemapPicker() {
  const d = useDict();
  const theme = useEffectiveTheme();
  const basemap = useUIStore((s) => s.basemap);
  const setBasemap = useUIStore((s) => s.setBasemap);
  const selected = resolveBasemap(basemap, theme);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (i: number, delta: number) => {
    const next = (i + delta + BASEMAP_OPTIONS.length) % BASEMAP_OPTIONS.length;
    const opt = BASEMAP_OPTIONS[next]!;
    setBasemap(opt);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={d.map.basemapTitle} className="grid grid-cols-2 gap-1.5 px-1 pb-1">
      {BASEMAP_OPTIONS.map((opt, i) => {
        const on = selected === opt;
        return (
          <button
            key={opt}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => setBasemap(opt)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                move(i, -1);
              }
            }}
            className={cn(
              'flex flex-col gap-1 rounded-[7px] p-1 text-center transition-colors',
              on ? 'text-fg' : 'text-fg-secondary hover:text-fg-body',
            )}
            style={on ? { boxShadow: '0 0 0 2px var(--action)' } : undefined}
          >
            <span
              aria-hidden
              className="h-[26px] w-full rounded-[5px] border border-[var(--border-subtle)]"
              style={{ backgroundImage: BASEMAP_PREVIEW[opt] }}
            />
            <span className="text-[10.5px] font-medium leading-none">{d.map[BASEMAP_LABEL[opt]]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Controles flotantes del mapa (arriba-derecha): capas + geolocalización. */
export function MapControls({
  onLocate,
  hasPerimeters,
  hasHotspots,
}: {
  onLocate?: () => void;
  hasPerimeters?: boolean;
  hasHotspots?: boolean;
}) {
  const d = useDict();
  const [open, setOpen] = useState(false);
  const perimetersVisible = useUIStore((s) => s.perimetersVisible);
  const togglePerimeters = useUIStore((s) => s.togglePerimeters);
  const hotspotsVisible = useUIStore((s) => s.hotspotsVisible);
  const toggleHotspots = useUIStore((s) => s.toggleHotspots);
  const basemap = useUIStore((s) => s.basemap);

  const anyActive =
    basemap !== 'auto' ||
    (perimetersVisible && hasPerimeters) ||
    (hotspotsVisible && hasHotspots);

  return (
    <div className="absolute right-[10px] top-[10px] z-[3] flex flex-col items-end gap-2">
      <div className="relative">
        <button
          type="button"
          className={cn(btn, anyActive ? 'text-action-text' : 'text-fg-secondary')}
          aria-label={d.map.layersAria}
          aria-expanded={open}
          title={d.map.layersAria}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M8 2 L14 5 L8 8 L2 5 Z" />
            <path d="M2 8.5 L8 11.5 L14 8.5" />
          </svg>
        </button>

        {open && (
          <div
            role="group"
            aria-label={d.map.layersAria}
            className="if-overlay absolute right-0 top-[42px] w-[224px] rounded-card p-1.5"
          >
            <SectionLabel>{d.map.basemapTitle}</SectionLabel>
            <BasemapPicker />

            <div className="my-1 h-px bg-[var(--border-subtle)]" />

            <SectionLabel>{d.map.layersTitle}</SectionLabel>
            <LayerToggle
              label={d.map.layerHotspots}
              on={hotspotsVisible && !!hasHotspots}
              disabled={!hasHotspots}
              onToggle={toggleHotspots}
            />
            <LayerToggle
              label={d.map.layerPerimeters}
              on={perimetersVisible && !!hasPerimeters}
              disabled={!hasPerimeters}
              onToggle={togglePerimeters}
            />
          </div>
        )}
      </div>

      <button
        type="button"
        className={cn(btn, 'text-fg-secondary')}
        onClick={onLocate}
        aria-label={d.map.locateAria}
        title={d.map.locateAria}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
          <circle cx="8" cy="8" r="4" />
          <path d="M8 1 V4 M8 12 V15 M1 8 H4 M12 8 H15" />
        </svg>
      </button>
    </div>
  );
}
