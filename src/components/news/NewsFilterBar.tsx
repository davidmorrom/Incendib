'use client';

import { useState } from 'react';
import { useDict } from '@/components/i18n/I18nProvider';
import { interpolate } from '@/lib/i18n';
import { activeNewsFilterCount, type NewsFilters, type RegionFacet } from '@/lib/news/facets';
import { mix, V } from '@/lib/design/color';
import { cn } from '@/lib/utils/cn';
import { SearchIcon } from './icons';

const ZONES_SHOWN = 8;

const seg = (on: boolean) =>
  on
    ? { className: 'text-action-text', style: { backgroundColor: mix(V.action, 18), borderColor: mix(V.action, 55) } }
    : { className: 'border-strong text-fg-secondary', style: undefined as React.CSSProperties | undefined };

/**
 * Barra de facetas y búsqueda del panel de noticias (móvil + desktop). Todo el
 * filtrado es cliente (respeta el ISR). El recuento de resultados se anuncia por
 * una región `aria-live` educada; el estado vacío conserva el tono neutro.
 */
export function NewsFilterBar({
  filters,
  onChange,
  onReset,
  regions,
  resultsCount,
  className,
}: {
  filters: NewsFilters;
  onChange: (patch: Partial<NewsFilters>) => void;
  onReset: () => void;
  regions: RegionFacet[];
  resultsCount: number;
  className?: string;
}) {
  const d = useDict();
  const [showAllZones, setShowAllZones] = useState(false);
  const active = activeNewsFilterCount(filters);
  const shownZones = showAllZones ? regions : regions.slice(0, ZONES_SHOWN);

  const toggleRegion = (region: string) =>
    onChange({
      regions: filters.regions.includes(region)
        ? filters.regions.filter((r) => r !== region)
        : [...filters.regions, region],
    });

  const country = (['todos', 'es', 'pt'] as const).map((c) => ({
    c,
    label: c === 'todos' ? d.report.all : c === 'es' ? d.report.spain : d.report.portugal,
  }));

  return (
    <div className={cn('bg-bg-base', className)}>
      {/* Búsqueda */}
      <div className="flex items-center gap-2 rounded-btn border border-strong bg-bg-sunken px-2.5 py-2">
        <SearchIcon size={14} className="flex-none text-fg-mute" />
        <input
          type="search"
          value={filters.query}
          onChange={(e) => onChange({ query: e.target.value })}
          placeholder={d.news.search}
          aria-label={d.news.searchAria}
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-fg outline-none placeholder:text-fg-mute"
        />
      </div>

      {/* País + toggles */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <div className="flex gap-0.5 rounded-btn border border-subtle bg-bg-sunken p-0.5">
          {country.map(({ c, label }) => {
            const on = filters.country === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ country: c })}
                aria-pressed={on}
                className={cn(
                  'rounded-[4px] px-2.5 py-1 text-[11px] font-semibold',
                  on ? 'text-action-text' : 'text-fg-mute',
                )}
                style={on ? { backgroundColor: mix(V.action, 18) } : undefined}
              >
                {label}
              </button>
            );
          })}
        </div>

        {(
          [
            ['critical', d.news.onlyCritical],
            ['linkedOnly', d.news.onlyLinked],
          ] as const
        ).map(([key, label]) => {
          const on = filters[key];
          const s = seg(on);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ [key]: !on } as Partial<NewsFilters>)}
              aria-pressed={on}
              className={cn('rounded-chip border px-2.5 py-1 text-[11px] font-semibold', s.className)}
              style={s.style}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Zonas (facetas con recuento) */}
      {regions.length > 0 && (
        <div className="mt-2">
          <div className="mb-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.13em] text-fg-mute">
            {d.news.zones}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {shownZones.map(({ region, count }) => {
              const on = filters.regions.includes(region);
              const s = seg(on);
              return (
                <button
                  key={region}
                  type="button"
                  onClick={() => toggleRegion(region)}
                  aria-pressed={on}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-chip border px-2 py-1 text-[11px] font-semibold',
                    s.className,
                  )}
                  style={s.style}
                >
                  <span className="truncate max-w-[9rem]">{region}</span>
                  <span className="font-mono text-[9.5px] text-fg-mute">{count}</span>
                </button>
              );
            })}
            {regions.length > ZONES_SHOWN && (
              <button
                type="button"
                onClick={() => setShowAllZones((v) => !v)}
                className="rounded-chip border border-subtle px-2 py-1 text-[11px] font-semibold text-action-text"
              >
                {showAllZones ? d.news.zones : d.news.moreZones}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Recuento + reset */}
      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-[10px] text-fg-mute" role="status" aria-live="polite">
          {resultsCount === 1
            ? d.news.resultOne
            : interpolate(d.news.results, { n: resultsCount })}
        </span>
        {active > 0 && (
          <button type="button" onClick={onReset} className="text-[11px] font-semibold text-action-text">
            {d.news.reset}
          </button>
        )}
      </div>
    </div>
  );
}
