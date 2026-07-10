'use client';

import { formatNumber } from '@/lib/utils/format';
import { useDict } from '@/components/i18n/I18nProvider';
import { cn } from '@/lib/utils/cn';

const LABEL = 'font-sans text-[9px] font-semibold uppercase tracking-[0.1em] text-fg-mute';
const VALUE = 'font-mono text-[20px] font-semibold leading-none';

/** Tarjetas KPI sobre el mapa en el panel desktop (1d). */
export function DesktopKpiOverlay({
  className,
  activos,
  hectares,
  focos24h,
}: {
  className?: string;
  activos: number;
  hectares: number;
  focos24h: number;
}) {
  const d = useDict();
  return (
    <div className={cn('absolute left-3.5 top-3.5 z-[3] gap-2', className)}>
      <div className="if-overlay rounded-card px-3.5 py-2">
        <div className={LABEL}>{d.map.kpiActivos}</div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="h-[7px] w-[7px] rounded-full bg-state-activo" aria-hidden />
          <span className={`${VALUE} text-state-activo-text`}>{activos}</span>
        </div>
      </div>
      <div className="if-overlay rounded-card px-3.5 py-2">
        <div className={LABEL}>{d.map.kpiHa}</div>
        <div className={`${VALUE} mt-1`}>{formatNumber(hectares)}</div>
      </div>
      <div className="if-overlay rounded-card px-3.5 py-2">
        <div className={LABEL}>{d.map.kpiFocos}</div>
        <div className={`${VALUE} mt-1 text-state-foco-text`}>{formatNumber(focos24h)}</div>
      </div>
    </div>
  );
}
