'use client';

import { useMemo, useState } from 'react';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { LangButton } from '@/components/layout/LangButton';
import { ReportKpis } from '@/components/fires/ReportKpis';
import { ReportTable } from '@/components/fires/ReportTable';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { computeKpis } from '@/lib/fires/derive';
import { useNow } from '@/components/time/NowProvider';
import { formatClock } from '@/lib/utils/format';
import { interpolate } from '@/lib/i18n';
import { mix, V } from '@/lib/design/color';
import { cn } from '@/lib/utils/cn';
import type { Fire, SourceStatus } from '@/types/fire';

/** Pantalla Informe (2b): KPIs, filtros por país, banner de fuente degradada y
 * tabla ordenable. */
export function InformeScreen({
  fires,
  focos24h,
  sources,
}: {
  fires: Fire[];
  focos24h: number;
  sources: SourceStatus[];
}) {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);
  const now = useNow();
  const filter = useUIStore((s) => s.filter);
  const setFilter = useUIStore((s) => s.setFilter);
  const [dismissed, setDismissed] = useState(false);

  const kpis = useMemo(() => computeKpis(fires), [fires]);
  const maxLevel = useMemo(
    () => fires.reduce((m, f) => (f.level != null && f.level > m ? f.level : m), -1),
    [fires],
  );
  const maxNames = useMemo(
    () =>
      fires
        .filter((f) => f.level === maxLevel)
        .map((f) => f.name)
        .slice(0, 2)
        .join(', '),
    [fires, maxLevel],
  );
  const counts = {
    todos: fires.length,
    es: fires.filter((f) => f.country === 'ES').length,
    pt: fires.filter((f) => f.country === 'PT').length,
  };
  const visible = useMemo(
    () =>
      fires.filter((f) => filter === 'todos' || (filter === 'es' ? f.country === 'ES' : f.country === 'PT')),
    [fires, filter],
  );
  const degraded = sources.find((s) => s.status === 'degraded' || s.status === 'down');
  const dateLabel = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    timeZone: 'Europe/Madrid',
  }).format(now);

  const chip = (key: 'todos' | 'es' | 'pt', label: string, n: number) => {
    const on = filter === key;
    return (
      <button
        type="button"
        onClick={() => setFilter(key)}
        aria-pressed={on}
        className={cn(
          'whitespace-nowrap rounded-chip border px-[10px] py-[5px] text-[11.5px] font-semibold',
          on ? 'text-action-text' : 'border-strong text-fg-secondary',
        )}
        style={on ? { backgroundColor: mix(V.action, 14), borderColor: mix(V.action, 50) } : undefined}
      >
        {label} ({n})
      </button>
    );
  };

  return (
    <>
      <ScreenHeader
        title={d.report.title}
        right={
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-fg-mute">
              {dateLabel} · {formatClock(now)}
            </span>
            <LangButton />
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-4xl lg:border-x">
      <ReportKpis
        activos={kpis.activos}
        hectares={kpis.hectares}
        focos24h={focos24h}
        maxLevel={maxLevel < 0 ? null : maxLevel}
        maxNames={maxNames}
      />

      <div className="flex flex-none gap-1.5 px-screen pt-2.5">
        {chip('todos', d.report.all, counts.todos)}
        {chip('es', d.report.spain, counts.es)}
        {chip('pt', d.report.portugal, counts.pt)}
      </div>

      {degraded && !dismissed && (
        <div
          role="status"
          className="mx-screen mt-2.5 flex flex-none items-center gap-2 rounded-card border px-[10px] py-2 text-warn"
          style={{ borderColor: mix(V.warn, 40), backgroundColor: mix(V.warn, 8) }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" className="flex-none">
            <path d="M7 1.5 L13 12 H1 Z" />
            <path d="M7 5.5 V8.5" />
            <circle cx="7" cy="10.4" r=".4" fill="currentColor" />
          </svg>
          <span className="flex-1 text-[11px]">
            {interpolate(d.report.degraded, {
              source: degraded.label.split(' / ')[0]!,
              time: formatClock(Date.parse(degraded.lastUpdate)),
            })}
          </span>
          <button type="button" onClick={() => setDismissed(true)} aria-label={d.a11y.dismiss} className="flex-none opacity-70">
            <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
              <path d="M1 1 L9 9 M9 1 L1 9" />
            </svg>
          </button>
        </div>
      )}

      <div className="pt-1.5" />

      <ReportTable
        fires={visible}
        empty={
          <div className="text-center">
            <p className="text-body text-fg-secondary">{d.report.empty}</p>
            <button
              type="button"
              onClick={() => setFilter('todos')}
              className="mt-2 text-body font-semibold text-action-text"
            >
              {d.report.clearFilters}
            </button>
          </div>
        }
      />

      <p className="flex-none border-t px-screen py-[7px] text-[10px] text-fg-mute">
        {d.disclaimer.short.split('112')[0]}
        <span className="font-mono font-semibold text-state-activo-text">112</span>
      </p>
      </div>
    </>
  );
}
