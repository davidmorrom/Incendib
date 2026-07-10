'use client';

import { FireRow } from './FireRow';
import { useDict } from '@/components/i18n/I18nProvider';
import { formatClock } from '@/lib/utils/format';
import { useNow } from '@/components/time/NowProvider';
import { interpolate } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import { mix, V } from '@/lib/design/color';
import type { Fire } from '@/types/fire';
import type { FireFilters } from '@/lib/fires/filters';

const chipBase = 'whitespace-nowrap rounded-chip border px-[10px] py-[5px] text-[11.5px] font-semibold';

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
  const color = accent === 'state' ? V.activo : V.action;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        chipBase,
        active
          ? accent === 'state'
            ? 'text-state-activo-text'
            : 'text-action-text'
          : 'border-strong text-fg-secondary',
      )}
      style={active ? { backgroundColor: mix(color, 13), borderColor: mix(color, 50) } : undefined}
    >
      {label}
    </button>
  );
}

/**
 * Bottom sheet del mapa (2a móvil): recuento + chips de filtro rápido + lista.
 * Los chips mapean al modelo unificado de filtros (afecta también al mapa).
 */
export function FireListSheet({
  className,
  fires,
  activeCount,
  filters,
  onChange,
  onSelect,
  onHover,
  hoveredSlug,
}: {
  className?: string;
  fires: Fire[];
  activeCount: number;
  filters: FireFilters;
  onChange: (patch: Partial<FireFilters>) => void;
  onSelect: (f: Fire) => void;
  onHover?: (slug: string | null) => void;
  hoveredSlug?: string | null;
}) {
  const d = useDict();
  const now = useNow();

  const activos = filters.states.length === 1 && filters.states[0] === 'activo';
  const level2 = filters.levels.includes(2);

  return (
    <section
      aria-label={interpolate(d.map.firesCount, { n: fires.length })}
      className={cn(
        'relative -mt-[14px] flex h-[320px] flex-none flex-col rounded-t-[14px] border-t bg-bg-card',
        className,
      )}
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
          {interpolate(d.map.updated, { time: formatClock(now) })}
        </span>
      </div>

      <div className="flex flex-none gap-1.5 overflow-x-auto px-screen pb-2.5">
        <FilterChip
          label={interpolate(d.map.chipActivos, { n: activeCount })}
          active={activos}
          accent="state"
          onClick={() => onChange({ states: activos ? [] : ['activo'] })}
        />
        <FilterChip
          label={d.map.chip24h}
          active={filters.period === '24h'}
          onClick={() => onChange({ period: filters.period === '24h' ? 'todos' : '24h' })}
        />
        <FilterChip
          label={d.map.chipLevel}
          active={level2}
          onClick={() => onChange({ levels: level2 ? [] : [2, 3] })}
        />
        <FilterChip
          label={d.map.chipSpain}
          active={filters.country === 'es'}
          onClick={() => onChange({ country: filters.country === 'es' ? 'todos' : 'es' })}
        />
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
              <FireRow fire={f} highlighted={hoveredSlug === f.slug} onSelect={onSelect} onHover={onHover} />
            </li>
          ))
        )}
      </ul>

      <p className="flex-none border-t px-screen py-[7px] text-[10px] text-fg-mute">
        {d.disclaimer.short.split('112')[0]}
        <span className="font-mono font-semibold text-state-activo-text">112</span>
      </p>
    </section>
  );
}
