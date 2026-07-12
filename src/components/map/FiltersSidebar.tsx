'use client';

import { StateGlyph } from '@/components/ui/StateGlyph';
import { useDict } from '@/components/i18n/I18nProvider';
import { countByState, activeFilterCount } from '@/lib/fires/filters';
import type { FireFilters, CountryFilter, Period } from '@/lib/fires/filters';
import { STATE_LABEL_KEY, STATE_TEXT_CLASS } from '@/lib/fires/style';
import { interpolate } from '@/lib/i18n';
import { mix, V } from '@/lib/design/color';
import { cn } from '@/lib/utils/cn';
import type { Fire, FireState, SeverityLevel } from '@/types/fire';

const STATES: FireState[] = ['activo', 'controlado', 'estabilizado', 'extinguido'];
const LEVELS: Exclude<SeverityLevel, null>[] = [0, 1, 2, 3];
const PERIODS: Exclude<Period, 'todos'>[] = ['24h', '48h', '72h', '7d'];
/** Umbrales de superficie mínima (ha). Funcional: fija `minHa`. */
const HA_MINS = [0, 10, 100, 1000] as const;

const HEAD = 'font-mono text-[10px] font-semibold uppercase tracking-[0.13em] text-fg-mute';
const GROUP = 'text-[11.5px] font-bold text-fg';

function Divider() {
  return <div className="my-3 h-px" style={{ background: 'var(--border-subtle)' }} />;
}

/** Barra lateral de filtros del panel desktop (1d). */
export function FiltersSidebar({
  className,
  fires,
  filters,
  onChange,
  onReset,
  visible,
  total,
}: {
  className?: string;
  fires: Fire[];
  filters: FireFilters;
  onChange: (patch: Partial<FireFilters>) => void;
  onReset: () => void;
  visible: number;
  total: number;
}) {
  const d = useDict();
  const counts = countByState(fires);

  const toggleState = (s: FireState) =>
    onChange({
      states: filters.states.includes(s) ? filters.states.filter((x) => x !== s) : [...filters.states, s],
    });
  const toggleLevel = (l: Exclude<SeverityLevel, null>) =>
    onChange({
      levels: filters.levels.includes(l) ? filters.levels.filter((x) => x !== l) : [...filters.levels, l],
    });
  const setCountry = (c: CountryFilter) => onChange({ country: c });
  const setPeriod = (p: Exclude<Period, 'todos'>) =>
    onChange({ period: filters.period === p ? 'todos' : p });

  const seg = (on: boolean) =>
    on
      ? { className: 'text-action-text', style: { backgroundColor: mix(V.action, 18), borderColor: mix(V.action, 55) } }
      : { className: 'border-strong text-fg-mute', style: undefined };

  return (
    <aside className={cn('flex-col overflow-hidden border-r bg-bg-raised', className)}>
      <div className="flex flex-none items-center justify-between px-3.5 pb-2 pt-3">
        <span className={HEAD}>{d.filters.title}</span>
        <button type="button" onClick={onReset} className="text-[11px] font-semibold text-action-text">
          {d.filters.reset}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-2">
        {/* Estado operativo */}
        <div className={GROUP}>{d.filters.state}</div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {STATES.map((s) => {
            const on = filters.states.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleState(s)}
                aria-pressed={on}
                className={cn(
                  'flex items-center gap-1.5 rounded-chip border px-2 py-1.5 text-[10.5px] font-semibold',
                  on ? STATE_TEXT_CLASS[s] : 'border-strong text-fg-secondary',
                )}
                style={on ? { backgroundColor: mix(V[s], 12), borderColor: mix(V[s], 50) } : undefined}
              >
                <StateGlyph state={s} size={11} className="flex-none" />
                <span className="truncate">{d.states[STATE_LABEL_KEY[s]]}</span>
                <span className="ml-auto font-mono text-[9.5px]">{counts[s]}</span>
              </button>
            );
          })}
        </div>

        <Divider />
        {/* País */}
        <div className={GROUP}>{d.filters.country}</div>
        <div className="mt-2 flex gap-1.5">
          {([['todos', d.report.all], ['es', d.report.spain], ['pt', d.report.portugal]] as const).map(
            ([c, label]) => {
              const s = seg(filters.country === c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCountry(c)}
                  aria-pressed={filters.country === c}
                  className={cn('flex-1 rounded-chip border px-2 py-1.5 text-[10.5px] font-semibold', s.className)}
                  style={s.style}
                >
                  {label}
                </button>
              );
            },
          )}
        </div>

        <Divider />
        {/* Nivel de gravedad */}
        <div className={GROUP}>{d.filters.level}</div>
        <div className="mt-2 flex gap-1.5">
          {LEVELS.map((l) => {
            const s = seg(filters.levels.includes(l));
            return (
              <button
                key={l}
                type="button"
                onClick={() => toggleLevel(l)}
                aria-pressed={filters.levels.includes(l)}
                className={cn('flex-1 rounded-chip border py-1.5 font-mono text-[11px] font-semibold', s.className)}
                style={s.style}
              >
                {l}
              </button>
            );
          })}
        </div>

        <Divider />
        {/* Periodo */}
        <div className={GROUP}>{d.filters.period}</div>
        <div className="mt-2 flex gap-0.5 rounded-btn border border-subtle bg-bg-sunken p-0.5">
          {PERIODS.map((p) => {
            const on = filters.period === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                aria-pressed={on}
                className={cn(
                  'flex-1 rounded-[4px] py-1.5 font-mono text-[10.5px] font-semibold',
                  on ? 'text-action-text' : 'text-fg-mute',
                )}
                style={on ? { backgroundColor: mix(V.action, 18) } : undefined}
              >
                {p.replace('h', ' h').replace('d', ' d')}
              </button>
            );
          })}
        </div>

        <Divider />
        {/* Superficie mínima (funcional: fija minHa) */}
        <div className={GROUP}>{d.filters.area}</div>
        <div className="mt-2 flex gap-1.5">
          {HA_MINS.map((min) => {
            const s = seg(filters.minHa === min);
            return (
              <button
                key={min}
                type="button"
                onClick={() => onChange({ minHa: min })}
                aria-pressed={filters.minHa === min}
                className={cn('flex-1 rounded-chip border py-1.5 font-mono text-[10px] font-semibold', s.className)}
                style={s.style}
              >
                {min === 0 ? d.report.all : `≥${min >= 1000 ? '1 000' : min}`}
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 font-mono text-[8.5px] leading-relaxed text-fg-mute">{d.filters.areaNote}</div>
      </div>

      <div className="flex-none border-t px-3.5 py-2.5 font-mono text-[10px] text-fg-mute">
        {interpolate(d.filters.active, { n: activeFilterCount(filters) })} ·{' '}
        {interpolate(d.filters.showing, { visible, total })}
      </div>
    </aside>
  );
}
