'use client';

import { StateGlyph } from '@/components/ui/StateGlyph';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { formatNumber } from '@/lib/utils/format';
import { timeAgoNow } from '@/lib/time';
import { cn } from '@/lib/utils/cn';
import { mix, V } from '@/lib/design/color';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { STATE_LABEL_KEY } from '@/lib/fires/style';
import { PT_TEXT } from '@/lib/fires/labels';
import type { Fire } from '@/types/fire';

function subtitle(f: Fire): string {
  const region = f.region.replace(/\s*\(PT\)/, '');
  if (f.country === 'PT') {
    const st = f.ptState ? ` — ${PT_TEXT[f.ptState].toLowerCase()}` : '';
    return `${f.province} · ${region}${st}`;
  }
  return `${f.municipality} · ${f.province}`;
}

/** Fila de incendio del sheet del mapa (2a). Toca → ficha. */
export function FireRow({
  fire,
  highlighted,
  onSelect,
  onHover,
}: {
  fire: Fire;
  highlighted?: boolean;
  onSelect: (f: Fire) => void;
  onHover?: (slug: string | null) => void;
}) {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);
  const stateLabel = d.states[STATE_LABEL_KEY[fire.state]];

  return (
    <button
      type="button"
      onClick={() => onSelect(fire)}
      onMouseEnter={() => onHover?.(fire.slug)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        'flex w-full items-center gap-[10px] border-t border-subtle px-screen py-[9px] text-left',
        highlighted && 'border-l-2 border-l-action',
      )}
      style={highlighted ? { backgroundColor: mix(V.action, 7) } : undefined}
    >
      <StateGlyph state={fire.state} size={14} className="flex-none" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-row font-semibold text-fg">{fire.name}</span>
          {/* Estado en el nombre accesible: el glifo es aria-hidden (color+forma
              no llega a lectores de pantalla). */}
          <span className="sr-only">
            , {stateLabel}
            {fire.ptState && (
              <span lang="pt">
                {' '}
                ({PT_TEXT[fire.ptState]})
              </span>
            )}
          </span>
          <LevelBadge level={fire.level} country={fire.country} />
        </span>
        <span className="block truncate text-[10.5px] text-fg-mute">{subtitle(fire)}</span>
      </span>
      <span className="flex-none text-right">
        <span className="block font-mono text-[13px] font-semibold text-fg">
          {formatNumber(fire.hectares)} ha
        </span>
        <span className="block font-mono text-[9.5px] text-fg-mute">
          {timeAgoNow(fire.updatedAt, locale)}
        </span>
      </span>
    </button>
  );
}
