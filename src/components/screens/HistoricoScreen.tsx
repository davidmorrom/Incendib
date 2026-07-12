'use client';

import { useMemo } from 'react';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { LangButton } from '@/components/layout/LangButton';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { interpolate } from '@/lib/i18n';
import { formatNumber } from '@/lib/utils/format';
import type { Fire } from '@/types/fire';
import type { Locale } from '@/lib/i18n/config';

function fmtDate(iso: string, locale: Locale): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(t);
}

/**
 * Histórico de campaña (10b): archivo de áreas quemadas recientes (EFFIS). Datos
 * satelitales, no cifra oficial definitiva. Ordenado por superficie descendente.
 */
export function HistoricoScreen({ areas }: { areas: Fire[] }) {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);

  const sorted = useMemo(() => [...areas].sort((a, b) => b.hectares - a.hectares), [areas]);
  const totalHa = useMemo(() => sorted.reduce((s, a) => s + a.hectares, 0), [sorted]);

  return (
    <>
      <ScreenHeader title={d.historico.title} right={<LangButton />} />

      <div className="min-h-0 flex-1 overflow-y-auto pb-6 lg:mx-auto lg:w-full lg:max-w-2xl lg:border-x">
        <div className="px-screen pt-4 lg:pt-6">
          <h1 className="hidden text-title font-bold text-fg lg:block">{d.historico.title}</h1>
          <p className="mt-1 max-w-prose text-[12.5px] leading-relaxed text-fg-secondary">
            {d.historico.subtitle}
          </p>
          {sorted.length > 0 && (
            <p className="mt-2 font-mono text-[11px] text-fg-mute">
              {interpolate(d.historico.count, { n: sorted.length, ha: formatNumber(totalHa) })}
            </p>
          )}
        </div>

        {sorted.length === 0 ? (
          <p className="mx-screen mt-4 rounded-card border border-strong px-3 py-6 text-center text-[12.5px] text-fg-secondary">
            {d.historico.empty}
          </p>
        ) : (
          <div className="mx-screen mt-3">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-subtle pb-1 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-fg-mute">
              <span>{d.historico.colArea}</span>
              <span className="text-right">{d.report.colUpdated}</span>
              <span className="text-right">{d.historico.colHa}</span>
            </div>
            {sorted.map((a) => (
              <div
                key={a.slug}
                className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 border-b border-subtle py-2"
              >
                <span className="flex min-w-0 items-center gap-1.5 truncate text-[12.5px] text-fg-body">
                  <span className="font-mono text-[9px] text-fg-mute">{a.country}</span>
                  <span className="truncate">
                    {a.municipality !== '—' ? a.municipality : a.name}
                    {a.province !== '—' && (
                      <span className="ml-1.5 font-mono text-[10px] text-fg-mute">{a.province}</span>
                    )}
                  </span>
                </span>
                <span className="text-right font-mono text-[10.5px] text-fg-mute">
                  {fmtDate(a.startedAt, locale)}
                </span>
                <span className="text-right font-mono text-[12px] font-semibold text-fg">
                  {formatNumber(a.hectares)}
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="mx-screen mt-5 border-t pt-2.5 text-[10px] leading-relaxed text-fg-mute">
          {d.disclaimer.short.split('112')[0]}
          <span className="font-mono font-semibold text-state-activo-text">112</span>
        </p>
      </div>
    </>
  );
}
