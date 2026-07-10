'use client';

import { StateGlyph } from '@/components/ui/StateGlyph';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import type { GlyphState } from '@/lib/fires/style';

const ENTRIES: { state: GlyphState; key: keyof ReturnType<typeof useDict>['legend'] }[] = [
  { state: 'activo', key: 'activo' },
  { state: 'controlado', key: 'controlado' },
  { state: 'estabilizado', key: 'estabilizado' },
  { state: 'extinguido', key: 'extinguido' },
  { state: 'foco', key: 'foco' },
];

/** Leyenda del mapa: píldora plegada (abajo-derecha) que abre un panel flotante. */
export function MapLegend() {
  const d = useDict();
  const open = useUIStore((s) => s.legendOpen);
  const toggle = useUIStore((s) => s.toggleLegend);

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label={d.legend.title}
          className="if-overlay absolute bottom-[52px] right-[10px] z-[4] flex w-[210px] flex-col gap-2 rounded-card p-3"
        >
          {ENTRIES.map(({ state, key }) => (
            <div key={state} className="flex items-center gap-2">
              <StateGlyph state={state} size={13} glow={state === 'foco'} />
              <span className="text-[11px] text-fg-body">{d.legend[key]}</span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={d.legend.title}
        className="if-overlay absolute bottom-[10px] right-[10px] z-[3] flex h-8 items-center gap-[7px] rounded-full px-3"
      >
        <span className="inline-flex items-center gap-1">
          <StateGlyph state="activo" size={12} />
          <StateGlyph state="controlado" size={11} />
          <StateGlyph state="estabilizado" size={11} />
        </span>
        <span className="text-[11px] font-semibold text-fg-body">{d.map.legendPill}</span>
      </button>
    </>
  );
}
