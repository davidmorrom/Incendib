'use client';

import { FireRow } from './FireRow';
import { useDict } from '@/components/i18n/I18nProvider';
import { formatClock } from '@/lib/utils/format';
import { getNow } from '@/lib/time';
import { interpolate } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import { mix, V } from '@/lib/design/color';
import type { Fire } from '@/types/fire';
import type { MapFilters } from '@/components/screens/MapaScreen';

const chipBase =
  'whitespace-nowrap rounded-chip border px-[10px] py-[5px] text-[11.5px] font-semibold';

function FilterChip({
  label,
  active,
  accent = 'action',
  onClick,
}: {
  label: string;
  active: boolean;
  accent?: 'action' | 'state';
  onClick?: () => void;
}) {
  if (!active) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={false}
        className={cn(chipBase, 'border-strong text-fg-secondary')}
      >
        {label}
      </button>
    );
  }
  const color = accent === 'state' ? V.activo : V.action;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={true}
      className={cn(chipBase, accent === 'state' ? 'text-state-activo-text' : 'text-action-text')}
      style={{ backgroundColor: mix(color, 13), borderColor: mix(color, 50) }}
    >
      {label}
    </button>
  );
}

/**
 * Bottom sheet del mapa (2a): recuento + chips de filtro rápido + lista de
 * incendios por gravedad + disclaimer. Los filtros afectan también al mapa
 * (estado en MapaScreen).
 */
export function FireListSheet({
  fires,
  activeCount,
  filters,
  onToggle,
  onSelect,
  onHover,
  hoveredSlug,
}: {
  fires: Fire[];
  activeCount: number;
  filters: MapFilters;
  onToggle: (key: keyof MapFilters) => void;
  onSelect: (f: Fire) => void;
  onHover?: (slug: string | null) => void;
  hoveredSlug?: string | null;
}) {
  const d = useDict();

  return (
    <section
      aria-label={interpolate(d.map.firesCount, { n: fires.length })}
      className="relative -mt-[14px] flex h-[320px] flex-none flex-col rounded-t-[14px] border-t bg-bg-card"
    >
      <div
        className="mx-auto mt-2 h-1 w-9 flex-none rounded-full"
        style={{ background: 'var(--border-strong)' }}
        aria-hidden
      />

      <div className="flex flex-none items-baseline justify-between px-screen pb-2 pt-0.5">
        <span className="text-[13px] font-semibold text-fg">
          {interpolate(d.map.firesCount, { n: fires.length })}{' '}
          <span className="font-normal text-fg-mute">· {d.map.bySeverity}</span>
        </span>
        <span className="font-mono text-meta text-fg-mute">
          {interpolate(d.map.updated, { time: formatClock(getNow()) })}
        </span>
      </div>

      <div className="flex flex-none gap-1.5 overflow-x-auto px-screen pb-2.5">
        <FilterChip
          label={interpolate(d.map.chipActivos, { n: activeCount })}
          active={filters.onlyActive}
          accent="state"
          onClick={() => onToggle('onlyActive')}
        />
        <FilterChip label={d.map.chip24h} active={filters.last24h} onClick={() => onToggle('last24h')} />
        <FilterChip label={d.map.chipLevel} active={filters.levelGE2} onClick={() => onToggle('levelGE2')} />
        <FilterChip label={d.map.chipSpain} active={filters.spainOnly} onClick={() => onToggle('spainOnly')} />
        <span className={cn(chipBase, 'border-strong text-fg-secondary opacity-70')}>
          + {d.map.moreFilters}
        </span>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {fires.length === 0 ? (
          <li className="px-screen py-6 text-center text-body text-fg-secondary">{d.report.empty}</li>
        ) : (
          fires.map((f) => (
            <li key={f.slug}>
              <FireRow
                fire={f}
                highlighted={hoveredSlug === f.slug}
                onSelect={onSelect}
                onHover={onHover}
              />
            </li>
          ))
        )}
      </ul>

      <p className="flex-none border-t px-screen py-[7px] text-[10px] text-fg-mute">
        {/* Disclaimer 112 localizado (todas las variantes terminan en "112"). */}
        {d.disclaimer.short.split('112')[0]}
        <span className="font-mono font-semibold text-state-activo-text">112</span>
      </p>
    </section>
  );
}
