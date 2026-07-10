'use client';

import { formatNumber } from '@/lib/utils/format';
import { useDict } from '@/components/i18n/I18nProvider';

const LABEL = 'font-sans text-label font-semibold uppercase tracking-[0.1em] text-fg-mute';
const VALUE = 'font-mono text-[28px] font-semibold leading-none';

/** KPIs 2×2 del informe (2b): activos · ha · focos 24 h · nivel máximo. */
export function ReportKpis({
  activos,
  hectares,
  focos24h,
  maxLevel,
  maxNames,
}: {
  activos: number;
  hectares: number;
  focos24h: number;
  maxLevel: number | null;
  maxNames: string;
}) {
  const d = useDict();
  return (
    <div className="grid flex-none grid-cols-2 border-y bg-bg-raised">
      <div className="border-b border-r border-subtle px-4 py-3">
        <div className={LABEL}>{d.kpis.activos}</div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="h-[9px] w-[9px] flex-none rounded-full bg-state-activo" aria-hidden />
          <span className={`${VALUE} text-state-activo-text`}>{activos}</span>
        </div>
      </div>
      <div className="border-b border-subtle px-4 py-3">
        <div className={LABEL}>{d.kpis.hectareas}</div>
        <div className={`${VALUE} mt-0.5 text-fg`}>{formatNumber(hectares)}</div>
      </div>
      <div className="border-r border-subtle px-4 py-3">
        <div className={LABEL}>{d.kpis.focos24h}</div>
        <div className={`${VALUE} mt-0.5 text-state-foco-text`}>{formatNumber(focos24h)}</div>
      </div>
      <div className="px-4 py-3">
        <div className={LABEL}>{d.kpis.nivelMaximo}</div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className={`${VALUE} text-state-controlado-text`}>
            {maxLevel != null ? `N${maxLevel}` : '—'}
          </span>
          {maxNames && (
            <span className="text-[10.5px] leading-tight text-fg-mute">{maxNames}</span>
          )}
        </div>
      </div>
    </div>
  );
}
