'use client';

import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { LangButton } from '@/components/layout/LangButton';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { timeAgo } from '@/lib/utils/format';
import { useNow } from '@/components/time/NowProvider';
import { FULL_ATTRIBUTION } from '@/lib/data/sources';
import { mix, V } from '@/lib/design/color';
import { cn } from '@/lib/utils/cn';
import type { SourceStatus } from '@/types/fire';

const DOT: Record<SourceStatus['status'], string> = {
  ok: 'bg-ok',
  degraded: 'bg-state-controlado',
  down: 'bg-state-extinguido',
};
const RIGHT: Record<SourceStatus['status'], string> = {
  ok: 'text-ok',
  degraded: 'text-warn',
  down: 'text-fg-mute',
};

const SECTION = 'font-mono text-label font-semibold uppercase tracking-[0.12em] text-fg-mute';

/** Pantalla Fuentes y licencias (3b): disclaimer, estado por fuente y atribución. */
export function FuentesScreen({ sources }: { sources: SourceStatus[] }) {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);
  const now = useNow();
  const [pre, post] = d.sources.disclaimerBody.split('112');

  return (
    <>
      <ScreenHeader title={d.sources.title} right={<LangButton />} />

      <div className="min-h-0 flex-1 overflow-y-auto lg:mx-auto lg:w-full lg:max-w-2xl lg:border-x">
        {/* Disclaimer destacado */}
        <div
          className="mx-screen mt-3 flex items-start gap-2.5 rounded-card border p-3"
          style={{ borderColor: mix(V.activo, 40), backgroundColor: mix(V.activo, 10) }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="var(--state-activo-text)"
            strokeWidth="1.4"
            className="mt-px flex-none"
          >
            <path d="M9 1.5 L16.5 15 H1.5 Z" />
            <path d="M9 6.5 V10" />
            <circle cx="9" cy="12.6" r=".5" fill="var(--state-activo-text)" />
          </svg>
          <div>
            <div className="text-[12.5px] font-bold text-state-activo-text">
              {d.sources.disclaimerTitle}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-fg-body">
              {pre}
              <span className="font-mono font-bold text-state-activo-text">112</span>
              {post}
            </p>
          </div>
        </div>

        {/* Estado de las fuentes */}
        <div className="px-screen pb-1.5 pt-3.5">
          <span className={SECTION}>{d.sources.statusHeading}</span>
        </div>
        <ul className="px-screen">
          {sources.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2.5 border-t border-subtle py-[9px]"
            >
              <span className={cn('h-2 w-2 flex-none rounded-full', DOT[s.status])} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold text-fg">
                  {s.label} <span className="font-normal text-fg-mute">· {s.description}</span>
                </div>
                {s.note && (
                  <div
                    className={cn(
                      'font-mono text-[9.5px]',
                      s.status === 'degraded' ? 'text-warn' : 'text-fg-mute',
                    )}
                  >
                    {s.note}
                  </div>
                )}
              </div>
              <span className={cn('flex-none font-mono text-[9.5px] font-medium', RIGHT[s.status])}>
                {s.status === 'degraded'
                  ? d.sources.degraded
                  : s.status === 'down'
                    ? d.sources.down
                    : timeAgo(s.lastUpdate, now, locale)}
              </span>
            </li>
          ))}
        </ul>

        {/* Atribución */}
        <div className="mt-3 border-t px-screen pb-4 pt-2.5">
          <div className={cn(SECTION, 'mb-2')}>{d.sources.attributionHeading}</div>
          <p className="font-mono text-[10px] leading-relaxed text-fg-secondary">{FULL_ATTRIBUTION}</p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-btn border border-strong py-[7px] text-[11px] font-semibold text-fg-secondary"
            >
              {d.sources.about}
            </button>
            <button
              type="button"
              className="flex-1 rounded-btn border border-strong py-[7px] text-[11px] font-semibold text-fg-secondary"
            >
              {d.sources.methodology}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
