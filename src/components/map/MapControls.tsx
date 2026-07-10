'use client';

import { useState } from 'react';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { cn } from '@/lib/utils/cn';

const btn = 'if-overlay grid h-9 w-9 place-items-center rounded-card';

/** Fila-conmutador de una capa dentro del panel. */
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

  const anyActive = (perimetersVisible && hasPerimeters) || (hotspotsVisible && hasHotspots);

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
            aria-label={d.map.layersTitle}
            className="if-overlay absolute right-0 top-[42px] w-[220px] rounded-card p-1.5"
          >
            <div className="px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-fg-mute">
              {d.map.layersTitle}
            </div>
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
