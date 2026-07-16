'use client';

import { useMemo } from 'react';
import { DistributionBars, type BarRow } from './DistributionBars';
import { StateGlyph } from '@/components/ui/StateGlyph';
import { useDict } from '@/components/i18n/I18nProvider';
import { STATE_LABEL_KEY } from '@/lib/fires/style';
import { hasAerial, hasGround } from '@/lib/fires/filters';
import type { ReportStats } from '@/lib/fires/facets';
import { formatNumber } from '@/lib/utils/format';
import { mix, V } from '@/lib/design/color';
import { cn } from '@/lib/utils/cn';
import type { Fire } from '@/types/fire';

const LABEL = 'font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-fg-mute';
const VALUE = 'font-mono text-[22px] font-semibold leading-none tabular-nums';

function Kpi({
  label,
  children,
  hint,
  accent,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="min-w-0 px-3 py-2.5">
      <div className={LABEL}>{label}</div>
      <div className={cn(VALUE, 'mt-1 flex items-baseline gap-1.5')} style={accent ? { color: accent } : undefined}>
        {children}
      </div>
      {hint && <div className="mt-0.5 truncate text-[9.5px] text-fg-mute">{hint}</div>}
    </div>
  );
}

/**
 * Resumen del Informe: KPIs recalculados sobre el CONJUNTO FILTRADO, indicador
 * de cobertura de dato («sin dato con dignidad») y gráficos sobrios de
 * distribución. El color codifica dato; las cifras van en mono con miles por
 * espacio; todo funciona en claro/oscuro y móvil.
 */
export function ReportSummary({
  stats,
  fires,
  focos24h,
}: {
  stats: ReportStats;
  fires: Fire[];
  focos24h: number;
}) {
  const d = useDict();

  const maxLevel = useMemo(
    () => (stats.byLevel.length ? Math.max(...stats.byLevel.map((l) => l.value)) : null),
    [stats.byLevel],
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

  // Cobertura de dato: cuántos incendios traen nivel / medios (honestidad).
  const conNivel = stats.total - stats.sinNivel;
  const conMedios = useMemo(
    () => fires.filter((f) => hasAerial(f) || hasGround(f) || (f.resources?.personnel ?? 0) > 0).length,
    [fires],
  );

  const stateRows: BarRow[] = stats.byState.map((r) => ({
    key: r.state,
    label: d.states[STATE_LABEL_KEY[r.state]],
    value: r.count,
    valueText: formatNumber(r.count),
    color: `var(--state-${r.state})`,
    glyph: <StateGlyph state={r.state} size={10} className="flex-none" />,
  }));

  const regionRows: BarRow[] = stats.byRegion
    .filter((r) => r.hectares > 0)
    .slice(0, 6)
    .map((r) => ({
      key: r.key,
      label: r.key,
      value: r.hectares,
      valueText: `${r.approx ? '~' : ''}${formatNumber(r.hectares)}`,
      color: mix(V.action, 55),
    }));

  const growthPos = stats.crecimiento24h > 0;

  return (
    <section aria-label={d.panel.summary} className="flex shrink-0 flex-col">
      {/* KPIs sobre el conjunto filtrado */}
      <div className="grid grid-cols-2 border-y bg-bg-raised sm:grid-cols-4 [&>*]:border-b [&>*]:border-r [&>*]:border-subtle">
        <Kpi label={d.panel.kpiActivos} accent="var(--state-activo)">
          <span className="h-2 w-2 flex-none rounded-full bg-state-activo" aria-hidden />
          {formatNumber(stats.activos)}
        </Kpi>
        <Kpi label={d.panel.kpiHectares} hint={stats.hectaresApprox ? d.fire.approx : undefined}>
          {stats.hectaresApprox ? '~' : ''}
          {formatNumber(stats.hectares)}
          <span className="text-[11px] text-fg-mute">ha</span>
        </Kpi>
        <Kpi label={d.panel.kpiFocos} accent="var(--state-foco)">
          {formatNumber(focos24h)}
        </Kpi>
        <Kpi label={d.panel.kpiLevel} accent="var(--state-controlado)" hint={maxNames || undefined}>
          {maxLevel != null ? `N${maxLevel}` : '—'}
        </Kpi>
        <Kpi label={d.panel.kpiEvac} accent={stats.conEvacuacion ? 'var(--state-activo)' : undefined}>
          {formatNumber(stats.conEvacuacion)}
        </Kpi>
        <Kpi label={d.panel.kpiAerial}>{formatNumber(stats.medios.aerial)}</Kpi>
        <Kpi label={d.panel.kpiPersonnel}>{formatNumber(stats.medios.personnel)}</Kpi>
        <Kpi label={d.panel.kpiGrowth} accent={growthPos ? 'var(--state-activo)' : undefined}>
          <span aria-hidden>{growthPos ? '▲' : '—'}</span>
          {growthPos ? formatNumber(stats.crecimiento24h) : '0'}
          {growthPos && <span className="text-[11px] text-fg-mute">ha</span>}
        </Kpi>
      </div>

      {/* Cobertura de dato (honestidad) */}
      <p className="flex flex-wrap gap-x-3 gap-y-0.5 border-b px-screen py-1.5 font-mono text-[9.5px] text-fg-mute">
        <span>
          {d.panel.groupLevel}: <span className="text-fg-secondary">{formatNumber(conNivel)}/{formatNumber(stats.total)}</span>
        </span>
        <span>
          {d.panel.groupMedia}: <span className="text-fg-secondary">{formatNumber(conMedios)}/{formatNumber(stats.total)}</span>
        </span>
        <span>
          {d.panel.satelliteYes}: <span className="text-fg-secondary">{formatNumber(stats.confirmadosSatelite)}/{formatNumber(stats.total)}</span>
        </span>
      </p>

      {/* Gráficos de distribución */}
      {stats.total > 0 && (
        <div className="grid gap-4 px-screen py-3 sm:grid-cols-2">
          <DistributionBars title={d.panel.chartState} rows={stateRows} emptyLabel={d.panel.chartEmpty} labelWidth="w-[96px]" />
          <DistributionBars
            title={d.panel.chartTopRegions}
            rows={regionRows}
            emptyLabel={d.panel.chartEmpty}
            labelWidth="w-[96px]"
          />
        </div>
      )}
    </section>
  );
}
