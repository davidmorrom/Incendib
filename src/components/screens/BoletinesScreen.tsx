'use client';

import Link from 'next/link';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { LangButton } from '@/components/layout/LangButton';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { interpolate } from '@/lib/i18n';
import { formatNumber } from '@/lib/utils/format';
import { formatPeriod } from '@/lib/boletin/format';
import { mix, V } from '@/lib/design/color';
import type { Boletin } from '@/types/boletin';

/** Índice de boletines semanales (archivo). Más reciente arriba. */
export function BoletinesScreen({ boletines }: { boletines: Boletin[] }) {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);

  return (
    <>
      <ScreenHeader title={d.boletin.title} right={<LangButton />} />

      <div className="min-h-0 flex-1 overflow-y-auto pb-6 lg:mx-auto lg:w-full lg:max-w-2xl lg:border-x">
        <div className="px-screen pt-4 lg:pt-6">
          <h1 className="hidden text-title font-bold text-fg lg:block">{d.boletin.title}</h1>
          <p className="mt-1 max-w-prose text-[12.5px] leading-relaxed text-fg-secondary">
            {d.boletin.subtitle}
          </p>
          <Link
            href="/historico"
            className="mt-2 inline-block font-mono text-[11px] font-semibold text-action-text"
          >
            {d.historico.link} →
          </Link>
        </div>

        {boletines.length === 0 ? (
          <p className="mx-screen mt-4 rounded-card border border-strong px-3 py-6 text-center text-[12.5px] text-fg-secondary">
            {d.boletin.empty}
          </p>
        ) : (
          <ul className="mt-3">
            {boletines.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/boletin/${b.id}`}
                  className="mx-screen flex items-center gap-3 border-t border-subtle py-3.5 last:border-b"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] font-semibold text-fg">
                        {interpolate(d.boletin.week, { n: b.isoWeek })} · {b.year}
                      </span>
                      <span
                        className="rounded-full px-1.5 py-px font-mono text-[9.5px] font-semibold uppercase tracking-wide"
                        style={{
                          color: b.status === 'cerrado' ? 'var(--ok-text)' : 'var(--warn)',
                          backgroundColor: mix(b.status === 'cerrado' ? V.ok : V.warn, 12),
                        }}
                      >
                        {b.status === 'cerrado' ? d.boletin.status.cerrado : d.boletin.status.provisional}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-fg-mute">
                      {formatPeriod(b.periodStart, b.periodEnd, locale)}
                    </p>
                  </div>
                  <div className="flex flex-none items-baseline gap-3 font-mono text-[11px] text-fg-secondary">
                    <span title={d.boletin.kpiActive}>
                      <span className="text-[13px] font-semibold text-fg">{b.kpi.activeFires}</span>{' '}
                      inc.
                    </span>
                    <span title={d.boletin.kpiHectares}>
                      <span className="text-[13px] font-semibold text-fg">
                        {formatNumber(b.kpi.hectares)}
                      </span>{' '}
                      ha
                    </span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--text-mute)" strokeWidth="1.5" className="flex-none" aria-hidden>
                    <path d="M6 3.5 L10.5 8 L6 12.5" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mx-screen mt-5 border-t pt-2.5 text-[10px] leading-relaxed text-fg-mute">
          {d.disclaimer.short.split('112')[0]}
          <span className="font-mono font-semibold text-state-activo-text">112</span>
        </p>
      </div>
    </>
  );
}
