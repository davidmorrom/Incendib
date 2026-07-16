'use client';

import { Segmented } from './controls';
import { OPTIONAL_COLS, type ColKey } from './columns';
import type { GroupBy, Density } from './ReportDataTable';
import { useDict } from '@/components/i18n/I18nProvider';
import { interpolate } from '@/lib/i18n';
import { formatNumber } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

function IconSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 L14 14" />
    </svg>
  );
}
function IconDots() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <circle cx="8" cy="3" r="1.4" /><circle cx="8" cy="8" r="1.4" /><circle cx="8" cy="13" r="1.4" />
    </svg>
  );
}

const POPOVER = 'absolute right-0 z-20 mt-1 w-56 rounded-card border bg-bg-raised p-2 shadow-lg';
const POP_BTN = 'flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-[12px] text-fg-secondary hover:bg-bg-sunken';

/**
 * Barra de herramientas de la tabla del Informe: búsqueda, recuento en vivo
 * (aria-live), agrupación, densidad, selector de columnas y exportar/compartir.
 * Los popovers usan `<details>` (accesibles y sin JS de posicionamiento).
 */
export function ReportToolbar({
  query,
  onQuery,
  visible,
  total,
  activeCount,
  groupBy,
  onGroupBy,
  density,
  onDensity,
  cols,
  onToggleCol,
  onExportCsv,
  onCopyTable,
  onCopyLink,
  copied,
  linkCopied,
}: {
  query: string;
  onQuery: (v: string) => void;
  visible: number;
  total: number;
  activeCount: number;
  groupBy: GroupBy;
  onGroupBy: (g: GroupBy) => void;
  density: Density;
  onDensity: (d: Density) => void;
  cols: ColKey[];
  onToggleCol: (c: ColKey) => void;
  onExportCsv: () => void;
  onCopyTable: () => void;
  onCopyLink: () => void;
  copied: boolean;
  linkCopied: boolean;
}) {
  const d = useDict();

  const colLabel: Record<ColKey, string> = {
    provincia: d.panel.colProvince,
    ccaa: d.panel.colRegion,
    nivel: d.panel.colLevel,
    tipo: d.panel.groupType,
    delta: d.panel.colDelta,
    medios: d.panel.colMedia,
    personal: d.panel.colPersonnel,
    fuente: d.panel.colSource,
    inicio: d.panel.colStart,
  };

  return (
    <div className="flex flex-none flex-wrap items-center gap-2 px-screen py-2">
      {/* Búsqueda */}
      <label className="relative flex min-w-[160px] flex-1 items-center">
        <span className="pointer-events-none absolute left-2.5 text-fg-mute">
          <IconSearch />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={d.panel.searchPlaceholder}
          aria-label={d.panel.search}
          className="w-full rounded-btn border border-subtle bg-bg-sunken py-1.5 pl-8 pr-2 text-[12px] text-fg placeholder:text-fg-mute focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--action)]"
        />
      </label>

      {/* Recuento en vivo */}
      <span className="whitespace-nowrap font-mono text-[10.5px] text-fg-mute" aria-live="polite" role="status">
        {interpolate(d.panel.results, { visible: formatNumber(visible), total: formatNumber(total) })}
        {activeCount > 0 && <span className="text-action-text"> · {interpolate(d.panel.filtersN, { n: activeCount })}</span>}
      </span>

      <div className="flex items-center gap-1.5">
        {/* Agrupar */}
        <Segmented<GroupBy>
          ariaLabel={d.panel.groupBy}
          value={groupBy}
          onChange={onGroupBy}
          className="hidden sm:flex"
          options={[
            { value: 'none', label: d.panel.groupByNone, title: d.panel.groupBy },
            { value: 'ccaa', label: d.panel.groupByRegion },
            { value: 'provincia', label: d.panel.groupByProvince },
            { value: 'state', label: d.panel.groupByState },
          ]}
        />

        {/* Densidad */}
        <Segmented<Density>
          ariaLabel={d.panel.density}
          value={density}
          onChange={onDensity}
          options={[
            { value: 'compact', label: '≡', title: d.panel.densityCompact },
            { value: 'comfortable', label: '☰', title: d.panel.densityComfortable },
          ]}
        />

        {/* Columnas */}
        <details className="relative">
          <summary
            className="flex h-[30px] cursor-pointer list-none items-center gap-1 rounded-btn border border-subtle px-2 text-[11px] font-semibold text-fg-secondary [&::-webkit-details-marker]:hidden"
            aria-label={d.panel.columns}
          >
            {d.panel.columns}
          </summary>
          <div className={POPOVER}>
            <p className="px-2 pb-1 font-mono text-[9px] font-semibold uppercase tracking-wide text-fg-mute">{d.panel.columns}</p>
            {OPTIONAL_COLS.map((c) => {
              const on = cols.includes(c);
              return (
                <button key={c} type="button" onClick={() => onToggleCol(c)} aria-pressed={on} className={POP_BTN}>
                  <span
                    className={cn('flex h-3.5 w-3.5 flex-none items-center justify-center rounded-[3px] border', on ? 'border-action bg-[var(--action)] text-action-text' : 'border-strong')}
                  >
                    {on && (
                      <svg width="9" height="9" viewBox="0 0 10 10" stroke="#fff" strokeWidth="1.8" fill="none">
                        <path d="M1.5 5.2 L4 7.5 L8.5 2.5" />
                      </svg>
                    )}
                  </span>
                  {colLabel[c]}
                </button>
              );
            })}
          </div>
        </details>

        {/* Exportar / compartir */}
        <details className="relative">
          <summary
            className="flex h-[30px] cursor-pointer list-none items-center gap-1 rounded-btn border border-subtle px-2 text-fg-secondary [&::-webkit-details-marker]:hidden"
            aria-label={d.panel.export}
          >
            <IconDots />
          </summary>
          <div className={POPOVER}>
            <button type="button" onClick={onExportCsv} className={POP_BTN}>
              {d.panel.exportCsv}
            </button>
            <button type="button" onClick={onCopyTable} className={POP_BTN}>
              {copied ? d.panel.copied : d.panel.copyTable}
            </button>
            <button type="button" onClick={onCopyLink} className={POP_BTN}>
              {linkCopied ? d.panel.linkCopied : d.panel.shareLink}
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}
