'use client';

import { formatNumber } from '@/lib/utils/format';
import { useDict } from '@/components/i18n/I18nProvider';

/** Tira de KPIs del mapa (2a): Activos · Ha afectadas · Focos 24 h. */
export function KpiStrip({
  activos,
  hectares,
  focos24h,
}: {
  activos: number;
  hectares: number;
  focos24h: number;
}) {
  const d = useDict();
  const label = 'text-label font-sans font-semibold uppercase tracking-[0.09em] text-fg-mute';
  const value = 'font-mono text-[19px] font-semibold';

  return (
    <div className="flex flex-none border-b bg-bg-raised">
      <div className="flex-1 border-r border-subtle px-screen py-2">
        <div className={label}>{d.map.kpiActivos}</div>
        <div className="flex items-center gap-1.5">
          <span className="h-[7px] w-[7px] flex-none rounded-full bg-state-activo" aria-hidden />
          <span className={`${value} text-state-activo-text`}>{activos}</span>
        </div>
      </div>
      <div className="flex-[1.3] border-r border-subtle px-screen py-2">
        <div className={label}>{d.map.kpiHa}</div>
        <div className={`${value} text-fg`}>{formatNumber(hectares)}</div>
      </div>
      <div className="flex-1 px-screen py-2">
        <div className={label}>{d.map.kpiFocos}</div>
        <div className={`${value} text-state-foco-text`}>{formatNumber(focos24h)}</div>
      </div>
    </div>
  );
}
