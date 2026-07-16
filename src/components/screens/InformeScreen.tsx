'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { LangButton } from '@/components/layout/LangButton';
import { FilterPanel } from '@/components/fires/report/FilterPanel';
import { ActiveFilters } from '@/components/fires/report/ActiveFilters';
import { ReportSummary } from '@/components/fires/report/ReportSummary';
import { ReportToolbar } from '@/components/fires/report/ReportToolbar';
import { ReportDataTable, type GroupBy, type Density } from '@/components/fires/report/ReportDataTable';
import { ToggleChip } from '@/components/fires/report/controls';
import { DEFAULT_COLS, type ColKey } from '@/components/fires/report/columns';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { useNow } from '@/components/time/NowProvider';
import {
  DEFAULT_FILTERS,
  applyFilters,
  activeFilterCount,
  type FireFilters,
} from '@/lib/fires/filters';
import { computeFacets, computeStats } from '@/lib/fires/facets';
import { filtersToQuery, queryToFilters } from '@/lib/fires/report-url';
import { PRESET_IDS, presetFilters, activePreset, type PresetId } from '@/lib/fires/report-presets';
import { toCsv, toTsv, exportFilename } from '@/lib/fires/report-export';
import { formatClock } from '@/lib/utils/format';
import { interpolate } from '@/lib/i18n';
import { mix, V } from '@/lib/design/color';
import type { Fire, SourceStatus } from '@/types/fire';

/**
 * Pantalla Informe (2b) — panel de situación avanzado. Filtra por país, CCAA,
 * provincia, estado, nivel, tipo, medios, superficie, periodo, satélite, fuente
 * y texto; KPIs y tabla se recalculan sobre lo filtrado; el estado del panel
 * viaja en la URL (enlace compartible). Diseño: densidad de sala de control,
 * «sin dato» con dignidad, disclaimer 112 y «satélite ≠ confirmado» presentes.
 */
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

  const [filters, setFilters] = useState<FireFilters>(DEFAULT_FILTERS);
  const [hydrated, setHydrated] = useState(false);
  const [cols, setCols] = useState<ColKey[]>(DEFAULT_COLS);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [density, setDensity] = useState<Density>('compact');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Hidratar filtros desde la URL (enlaces compartibles) y persistirlos allí.
  useEffect(() => {
    const q = window.location.search.replace(/^\?/, '');
    if (q) setFilters(queryToFilters(q));
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const q = filtersToQuery(filters);
    window.history.replaceState(null, '', q ? `${window.location.pathname}?${q}` : window.location.pathname);
  }, [filters, hydrated]);

  const facets = useMemo(() => computeFacets(fires), [fires]);
  const visible = useMemo(() => applyFilters(fires, filters, now), [fires, filters, now]);
  const stats = useMemo(() => computeStats(visible), [visible]);
  const activeCount = activeFilterCount(filters);
  const currentPreset = activePreset(filters);

  const patch = useCallback((p: Partial<FireFilters>) => setFilters((f) => ({ ...f, ...p })), []);
  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), []);
  const toggleCol = useCallback(
    (c: ColKey) => setCols((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c])),
    [],
  );
  const applyPreset = useCallback(
    (id: PresetId) => setFilters((f) => (activePreset(f) === id ? DEFAULT_FILTERS : presetFilters(id))),
    [],
  );

  // Cerrar el sheet de filtros con Escape.
  useEffect(() => {
    if (!filtersOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFiltersOpen(false);
    window.addEventListener('keydown', onKey);
    sheetRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [filtersOpen]);

  // ── Exportar / compartir ────────────────────────────────────────────────
  const buildRows = useCallback((): string[][] => {
    const header = [
      d.panel.colFire, 'Municipio', d.panel.colProvince, d.panel.colRegion, d.panel.groupCountry,
      d.panel.colState, d.panel.colLevel, d.panel.groupType, 'ha', 'aprox', 'delta24h',
      'aereos', 'terrestres', 'personal', 'evacuacion', 'satelite', d.panel.colSource, 'inicio', 'actualizado',
    ];
    const rows = visible.map((f) => [
      f.name,
      f.municipality && f.municipality !== '—' ? f.municipality : '',
      f.province && f.province !== '—' ? f.province : '',
      f.region,
      f.country,
      f.state,
      f.level != null ? String(f.level) : '',
      f.type ?? '',
      f.hectares > 0 ? String(f.hectares) : '',
      f.hectaresApprox ? '1' : '',
      f.delta24h != null ? String(f.delta24h) : '',
      String(f.resources?.aerial ?? ''),
      String(f.resources?.ground ?? ''),
      String(f.resources?.personnel ?? ''),
      f.evacuation ? '1' : '',
      f.satelliteConfirmed ? '1' : '',
      f.sources.join(' '),
      f.startedAt,
      f.updatedAt,
    ]);
    return [header, ...rows];
  }, [visible, d]);

  const flash = (set: (v: boolean) => void) => {
    set(true);
    setTimeout(() => set(false), 1600);
  };
  const onExportCsv = useCallback(() => {
    const blob = new Blob([toCsv(buildRows())], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFilename('incendib-informe', Date.now());
    a.click();
    URL.revokeObjectURL(url);
  }, [buildRows]);
  const onCopyTable = useCallback(() => {
    navigator.clipboard?.writeText(toTsv(buildRows())).then(() => flash(setCopied)).catch(() => {});
  }, [buildRows]);
  const onCopyLink = useCallback(() => {
    navigator.clipboard?.writeText(window.location.href).then(() => flash(setLinkCopied)).catch(() => {});
  }, []);

  const degraded = sources.find((s) => s.status === 'degraded' || s.status === 'down');
  const dateLabel = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', timeZone: 'Europe/Madrid' }).format(now);

  const presetsRow = (
    <div className="flex flex-none items-center gap-1.5 overflow-x-auto px-screen py-2">
      <span className="flex-none font-mono text-[9px] font-semibold uppercase tracking-wide text-fg-mute">
        {d.panel.presetsLabel}
      </span>
      {PRESET_IDS.map((id) => (
        <ToggleChip
          key={id}
          label={d.panel.presets[id]}
          active={currentPreset === id}
          onClick={() => applyPreset(id)}
          className="flex-none"
        />
      ))}
      <Link href="/incendios-hoy" className="ml-auto flex-none whitespace-nowrap text-[11px] font-semibold text-action-text">
        {d.today.link} ›
      </Link>
    </div>
  );

  const toolbar = (
    <ReportToolbar
      query={filters.query}
      onQuery={(v) => patch({ query: v })}
      visible={visible.length}
      total={fires.length}
      activeCount={activeCount}
      groupBy={groupBy}
      onGroupBy={setGroupBy}
      density={density}
      onDensity={setDensity}
      cols={cols}
      onToggleCol={toggleCol}
      onExportCsv={onExportCsv}
      onCopyTable={onCopyTable}
      onCopyLink={onCopyLink}
      copied={copied}
      linkCopied={linkCopied}
    />
  );

  const table = (
    <ReportDataTable
      fires={visible}
      cols={cols}
      groupBy={groupBy}
      density={density}
      empty={
        <div className="text-center">
          <p className="text-body text-fg-secondary">{d.panel.empty}</p>
          {activeCount > 0 && (
            <button type="button" onClick={reset} className="mt-2 text-body font-semibold text-action-text">
              {d.panel.reset}
            </button>
          )}
        </div>
      }
    />
  );

  const disclaimer = (
    <p className="flex-none border-t px-screen py-[7px] text-[10px] text-fg-mute">
      {d.disclaimer.short.split('112')[0]}
      <span className="font-mono font-semibold text-state-activo-text">112</span>
    </p>
  );

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

      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[300px_1fr] lg:grid-rows-1">
        {/* Desktop: barra lateral de filtros */}
        <aside className="hidden min-h-0 border-r bg-bg-raised lg:col-start-1 lg:flex lg:flex-col">
          <FilterPanel
            facets={facets}
            filters={filters}
            onChange={patch}
            onReset={reset}
            visible={visible.length}
            total={fires.length}
            activeCount={activeCount}
            className="min-h-0 flex-1"
          />
        </aside>

        {/* Principal — en móvil scrollea toda la columna; en desktop scrollea la
            tabla dentro de su panel. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:col-start-2 lg:overflow-hidden">
          {presetsRow}

          {/* Móvil: botón de filtros + activos */}
          <div className="flex flex-none items-center gap-2 px-screen pb-1 lg:hidden">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-chip border border-strong px-3 py-1.5 text-[11.5px] font-semibold text-fg-secondary"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                <path d="M2 4h12M4.5 8h7M6.5 12h3" />
              </svg>
              {d.panel.filters}
              {activeCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[9px] font-bold text-action-text" style={{ backgroundColor: mix(V.action, 16) }}>
                  {activeCount}
                </span>
              )}
            </button>
          </div>

          <ActiveFilters filters={filters} onChange={patch} onReset={reset} />

          {degraded && !dismissed && (
            <div
              role="status"
              className="mx-screen mt-1 flex flex-none items-center gap-2 rounded-card border px-[10px] py-2 text-warn"
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

          <ReportSummary stats={stats} fires={visible} focos24h={focos24h} />
          {toolbar}
          {table}
          {disclaimer}
        </div>
      </div>

      {/* Móvil: panel de filtros en bottom-sheet accesible */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end lg:hidden">
          <button type="button" aria-label={d.panel.close} onClick={() => setFiltersOpen(false)} className="absolute inset-0 bg-black/40" />
          <div
            ref={sheetRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={d.panel.filters}
            className="relative flex max-h-[86dvh] flex-col rounded-t-[16px] border-t bg-bg-raised outline-none"
          >
            <div className="mx-auto mt-2 h-1 w-9 flex-none rounded-full" style={{ background: 'var(--border-strong)' }} aria-hidden />
            <FilterPanel
              facets={facets}
              filters={filters}
              onChange={patch}
              onReset={reset}
              visible={visible.length}
              total={fires.length}
              activeCount={activeCount}
              className="min-h-0 flex-1"
            />
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="flex-none border-t py-3 text-center text-[13px] font-semibold text-action-text"
            >
              {interpolate(d.panel.resultsFires, { visible: visible.length, total: fires.length })}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
