'use client';

import { useMemo } from 'react';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { LangButton } from '@/components/layout/LangButton';
import { ColumnChart, type ColumnChartLabels } from '@/components/stats/ColumnChart';
import { DistributionBars, type BarRow } from '@/components/fires/report/DistributionBars';
import { useDict } from '@/components/i18n/I18nProvider';
import { interpolate } from '@/lib/i18n';
import { formatNumber, formatHa } from '@/lib/utils/format';
import { mix, V } from '@/lib/design/color';
import { cn } from '@/lib/utils/cn';
import { aggregate, type EgifDataset, type EgifRanking } from '@/lib/stats/egif';

const BAR_COLOR = mix(V.action, 70);
// Trama diagonal para años en avance/provisional (mismo tono, distinto patrón:
// nunca se depende solo del color — dataviz + WCAG).
const PROVISIONAL_FILL = `repeating-linear-gradient(45deg, ${mix(V.action, 72)} 0 2px, ${mix(V.action, 24)} 2px 5px)`;

const KLABEL = 'font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-fg-mute';
const KVALUE = 'font-mono text-[22px] font-semibold leading-none tabular-nums text-fg';

function StatTile({ label, value, unit, hint }: { label: string; value: string; unit?: string; hint?: string }) {
  return (
    <div className="min-w-0 px-3 py-2.5">
      <div className={KLABEL}>{label}</div>
      <div className={cn(KVALUE, 'mt-1 flex items-baseline gap-1.5')}>
        {value}
        {unit && <span className="text-[11px] text-fg-mute">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 truncate text-[9.5px] text-fg-mute">{hint}</div>}
    </div>
  );
}

/**
 * Pantalla de Estadísticas (F1): serie histórica oficial EGIF/MITECO —
 * siniestros y superficie por año, y rankings territoriales por superficie
 * quemada. Datos estáticos y trazables; NO se fusionan fuentes (EGIF ≠ EFFIS ≠
 * FIRMS). El color codifica la magnitud; cifras en mono; claro/oscuro y móvil.
 */
export function EstadisticasScreen({ data }: { data: EgifDataset }) {
  const d = useDict();
  const t = d.stats;

  const hasSeries = data.series.some((y) => y.fires != null || y.hectares != null);
  const agg = useMemo(() => aggregate(data), [data]);

  const colLabels = (kind: 'fires' | 'hectares'): ColumnChartLabels => ({
    ariaSummary: `${kind === 'fires' ? t.charts.fires : t.charts.hectares}. ${kind === 'fires' ? t.ariaFires : t.ariaHectares}`,
    provisional: t.legendProvisional,
    definitive: t.legendDefinitive,
    tableToggle: t.tableToggle,
    tableHeaders: [t.tableYear, kind === 'fires' ? t.tableFires : t.tableHectares, t.tableStatus],
    statusDefinitive: t.statusDefinitive,
    statusProvisional: t.statusProvisional,
    noData: t.noData,
    empty: t.chartEmpty,
  });

  const firesPoints = data.series.map((y) => ({ year: y.year, value: y.fires, provisional: y.firesProvisional }));
  const haPoints = data.series.map((y) => ({ year: y.year, value: y.hectares, provisional: y.hectaresProvisional }));

  const rankRows = (r: EgifRanking | null): BarRow[] =>
    (r?.items ?? []).map((it, i) => ({
      key: `${it.name}-${i}`,
      label: it.name,
      value: it.hectares,
      valueText: formatHa(it.hectares),
      color: BAR_COLOR,
    }));

  const rankCaption = (r: EgifRanking | null): string | null =>
    r ? `${interpolate(t.rankBasis, { period: r.period })}${r.provisional ? ` · ${t.statusProvisional.toLowerCase()}` : ''}` : null;

  const avgHint =
    agg.hectaresConsolidatedFrom != null && agg.hectaresConsolidatedTo != null
      ? `${agg.hectaresConsolidatedFrom}–${agg.hectaresConsolidatedTo} · ${t.defShort}`
      : undefined;

  return (
    <>
      <ScreenHeader title={t.title} right={<LangButton />} />

      <div className="min-h-0 flex-1 overflow-y-auto pb-8 lg:mx-auto lg:w-full lg:max-w-3xl lg:border-x">
        {/* Introducción + separación honesta de fuentes */}
        <div className="px-screen pt-3">
          <h1 className="hidden text-title font-bold text-fg lg:block">{t.title}</h1>
          <p className="mt-1 text-[13px] font-medium leading-relaxed text-fg-body">{t.lead}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {[t.natures.egif, t.natures.effis, t.natures.firms].map((n, i) => (
              <span
                key={n}
                className={cn(
                  'inline-flex items-center rounded-[4px] border px-2 py-0.5 font-mono text-[9.5px]',
                  i === 0 ? 'border-default text-fg-secondary' : 'border-subtle text-fg-mute',
                )}
              >
                {n}
              </span>
            ))}
          </div>
        </div>

        {!hasSeries ? (
          <p className="px-screen py-10 text-center text-[12px] text-fg-mute">{t.emptyState}</p>
        ) : (
          <>
            {/* KPIs: media histórica, peor año y último año (superficie flagship) */}
            <div className="mt-3 grid grid-cols-2 border-y bg-bg-raised sm:grid-cols-4 [&>*]:border-b [&>*]:border-r [&>*]:border-subtle sm:[&>*]:border-b-0">
              <StatTile
                label={t.kpiAvgFires}
                value={agg.meanFires != null ? formatNumber(agg.meanFires) : '—'}
                hint={t.kpiAvgFiresHint}
              />
              <StatTile
                label={t.kpiAvgHa}
                value={agg.meanHectares != null ? formatNumber(agg.meanHectares) : '—'}
                unit="ha"
                hint={avgHint}
              />
              <StatTile
                label={t.kpiWorst}
                value={agg.worst?.hectares != null ? formatNumber(agg.worst.hectares) : '—'}
                unit="ha"
                hint={
                  agg.worst
                    ? `${agg.worst.year}${agg.worst.hectaresProvisional ? ` · ${t.provShort}` : ''}`
                    : undefined
                }
              />
              <StatTile
                label={t.kpiLatest}
                value={agg.latest?.hectares != null ? formatNumber(agg.latest.hectares) : '—'}
                unit="ha"
                hint={
                  agg.latest
                    ? `${agg.latest.year}${agg.latest.hectaresProvisional ? ` · ${t.provShort}` : ''}`
                    : undefined
                }
              />
            </div>

            {/* Series anuales */}
            <div className="grid gap-6 px-screen py-4 md:grid-cols-2">
              <ColumnChart title={t.charts.fires} points={firesPoints} color={BAR_COLOR} provisionalFill={PROVISIONAL_FILL} labels={colLabels('fires')} />
              <ColumnChart title={t.charts.hectares} points={haPoints} unit="ha" color={BAR_COLOR} provisionalFill={PROVISIONAL_FILL} labels={colLabels('hectares')} />
            </div>

            {/* Rankings territoriales */}
            <div className="grid gap-6 border-t px-screen py-4 md:grid-cols-2">
              <div className="min-w-0">
                <DistributionBars
                  title={t.charts.ccaa}
                  rows={rankRows(data.topCcaa)}
                  emptyLabel={t.rankEmpty}
                  labelWidth="w-[124px]"
                />
                {rankCaption(data.topCcaa) && (
                  <p className="mt-1.5 font-mono text-[9px] text-fg-mute">{rankCaption(data.topCcaa)}</p>
                )}
              </div>
              <div className="min-w-0">
                <DistributionBars
                  title={t.charts.provincias}
                  rows={rankRows(data.topProvincias)}
                  emptyLabel={t.rankEmpty}
                  labelWidth="w-[124px]"
                />
                {rankCaption(data.topProvincias) && (
                  <p className="mt-1.5 font-mono text-[9px] text-fg-mute">{rankCaption(data.topProvincias)}</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Fuentes + nota de datos + disclaimer de no-fusión */}
        <div className="mt-2 border-t px-screen py-3">
          <div className={KLABEL}>{t.sourcesTitle}</div>
          <ul className="mt-1.5 space-y-1">
            {data.sources.map((s) => (
              <li key={s.url} className="text-[11px] leading-snug">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-action-text underline decoration-dotted underline-offset-2"
                >
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
          {data.dataNote && <p className="mt-2 text-[10.5px] leading-snug text-fg-secondary">{data.dataNote}</p>}
          <p className="mt-2 text-[10px] leading-snug text-fg-mute">{t.disclaimer}</p>
          <p className="mt-2 border-t pt-2 text-[10px] leading-snug text-fg-mute">{t.nextPhases}</p>
        </div>
      </div>
    </>
  );
}
