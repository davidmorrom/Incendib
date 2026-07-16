'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { LangButton } from '@/components/layout/LangButton';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { useDict } from '@/components/i18n/I18nProvider';
import { rankByProvince } from '@/lib/fires/ranking';
import { provinceSlug } from '@/lib/fires/place';
import { formatNumber, formatHa } from '@/lib/utils/format';
import { interpolate } from '@/lib/i18n';
import type { Fire } from '@/types/fire';

/**
 * Pantalla «Incendios hoy»: ranking territorial de la actividad actual por
 * provincia (o distrito PT), inspirado en el proyecto hermano mapasdeincendios.es
 * (ver docs/research). Rankea incidencias con provincia conocida; el recuento de
 * focos satelitales se muestra aparte, con su advertencia. */
export function IncendiosHoyScreen({ fires, focos24h }: { fires: Fire[]; focos24h: number }) {
  const d = useDict();
  const rows = useMemo(() => rankByProvince(fires), [fires]);

  const HEAD = 'font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-fg-mute';

  return (
    <>
      <ScreenHeader title={d.today.title} right={<LangButton />} />

      <div className="flex min-h-0 flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-3xl lg:border-x">
        {/* Recuento nacional de focos satelitales (con advertencia). */}
        <div className="flex-none border-b px-screen py-3">
          <p className="font-mono text-[15px] font-semibold tabular-nums text-fg">
            {interpolate(d.today.firms24h, { n: formatNumber(focos24h) })}
          </p>
          <p className="mt-0.5 text-[10.5px] text-fg-mute">{d.today.firmsNote}</p>
        </div>

        {/* Cabecera de la tabla-ranking. */}
        <div className="flex flex-none items-center gap-2 px-screen pb-1.5 pt-3">
          <h2 className="text-[13px] font-bold text-fg">{d.today.subtitle}</h2>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-center text-body text-fg-secondary">{d.today.empty}</p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-[1] bg-bg-base">
                <tr className="border-b">
                  <th scope="col" className={`${HEAD} px-screen py-1.5`}>
                    {d.today.colProvince}
                  </th>
                  <th scope="col" className={`${HEAD} px-1 py-1.5 text-right`}>
                    {d.today.colActive}
                  </th>
                  <th scope="col" className={`${HEAD} px-1 py-1.5 text-right`}>
                    {d.today.colTotal}
                  </th>
                  <th scope="col" className={`${HEAD} px-screen py-1.5 text-right`}>
                    {d.today.colArea}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const pslug = provinceSlug(r.province);
                  return (
                  <tr key={`${r.country}-${r.region}-${r.province}`} className="border-b">
                    <td className="px-screen py-2 align-top">
                      <div className="flex items-center gap-1.5">
                        {pslug ? (
                          <Link href={`/p/${pslug}`} className="text-body font-semibold text-action-text">
                            {r.province}
                          </Link>
                        ) : (
                          <span className="text-body font-semibold text-fg">{r.province}</span>
                        )}
                        <LevelBadge level={r.maxLevel} country={r.country} />
                      </div>
                      <span className="text-[10.5px] text-fg-mute">{r.region}</span>
                    </td>
                    <td className="px-1 py-2 text-right align-top">
                      <span
                        className={`font-mono text-body tabular-nums ${
                          r.activos > 0 ? 'font-semibold text-state-activo-text' : 'text-fg-mute'
                        }`}
                      >
                        {formatNumber(r.activos)}
                      </span>
                    </td>
                    <td className="px-1 py-2 text-right align-top font-mono text-body tabular-nums text-fg-secondary">
                      {formatNumber(r.total)}
                    </td>
                    <td className="px-screen py-2 text-right align-top font-mono text-body tabular-nums text-fg-secondary">
                      {r.hectares > 0 ? `${r.hectaresApprox ? '~' : ''}${formatHa(r.hectares)}` : '—'}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-none items-center justify-between gap-2 border-t px-screen py-2">
          <Link href="/informe" className="text-[11px] font-semibold text-action-text">
            {d.report.title}
          </Link>
          <p className="text-[10px] text-fg-mute">
            {d.disclaimer.short.split('112')[0]}
            <span className="font-mono font-semibold text-state-activo-text">112</span>
          </p>
        </div>
      </div>
    </>
  );
}
