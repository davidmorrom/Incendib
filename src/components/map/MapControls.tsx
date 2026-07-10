'use client';

import { useDict } from '@/components/i18n/I18nProvider';

const btn = 'if-overlay grid h-9 w-9 place-items-center rounded-card text-fg-secondary';

/** Controles flotantes del mapa (arriba-derecha): capas + geolocalización. */
export function MapControls({ onLocate }: { onLocate?: () => void }) {
  const d = useDict();
  return (
    <div className="absolute right-[10px] top-[10px] z-[3] flex flex-col gap-2">
      <button type="button" className={btn} aria-label={d.map.layersAria} title={d.map.layersAria}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M8 2 L14 5 L8 8 L2 5 Z" />
          <path d="M2 8.5 L8 11.5 L14 8.5" />
        </svg>
      </button>
      <button type="button" className={btn} onClick={onLocate} aria-label={d.map.locateAria} title={d.map.locateAria}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
          <circle cx="8" cy="8" r="4" />
          <path d="M8 1 V4 M8 12 V15 M1 8 H4 M12 8 H15" />
        </svg>
      </button>
    </div>
  );
}
