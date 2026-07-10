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
const SENSORS = ['NASA FIRMS — VIIRS 375 m', 'NASA FIRMS — MODIS 1 km', 'EFFIS / Copernicus'];
const FWI = ['#2F6B4F', '#98A93B', '#E5C337', '#E8912D', '#D24317', '#B3261E'];

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
        {/* Superficie (visual) */}
        <div className={GROUP}>{d.filters.area}</div>
        <div className="relative mt-3 h-1 rounded-full" style={{ background: 'var(--border-default)' }}>
          <div className="absolute inset-y-0 left-[10%] right-[20%] rounded-full bg-action" />
          <span className="absolute -top-1.5 left-[10%] h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-action bg-fg" />
          <span className="absolute -top-1.5 right-[20%] h-3.5 w-3.5 translate-x-1/2 rounded-full border-2 border-action bg-fg" />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[9px] text-fg-mute">
          <span>0</span><span>500</span><span>5 000</span><span>+</span>
        </div>

        <Divider />
        {/* Fuente y sensor (visual) */}
        <div className={GROUP}>{d.filters.sourceSensor}</div>
        <div className="mt-2 flex flex-col gap-2">
          {SENSORS.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className="grid h-[13px] w-[13px] place-items-center rounded-[3px] bg-action">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="var(--bg-base)" strokeWidth="1.6">
                  <path d="M1.5 4 L3.2 5.8 L6.5 2" />
                </svg>
              </span>
              <span className="text-[11px] text-fg-body">{s}</span>
            </div>
          ))}
        </div>

        <Divider />
        {/* Riesgo FWI (visual) */}
        <div className="flex items-center justify-between">
          <span className={GROUP}>{d.filters.risk}</span>
        </div>
        <div className="mt-2 flex gap-0.5">
          {FWI.map((c, i) => (
            <span key={c} className="h-4 flex-1 rounded-[2px]" style={{ background: c, opacity: i < 3 ? 0.4 : 1 }} />
          ))}
        </div>
        <div className="mt-1 flex justify-between font-mono text-[8.5px] text-fg-mute">
          <span>{d.filters.riskLow}</span>
          <span>{d.filters.riskHigh}</span>
        </div>
      </div>

      <div className="flex-none border-t px-3.5 py-2.5 font-mono text-[10px] text-fg-mute">
        {interpolate(d.filters.active, { n: activeFilterCount(filters) })} ·{' '}
        {interpolate(d.filters.showing, { visible, total })}
      </div>
    </aside>
  );
}
