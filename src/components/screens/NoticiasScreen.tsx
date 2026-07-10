'use client';

import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { LangButton } from '@/components/layout/LangButton';
import { LiveEmbed } from '@/components/news/LiveEmbed';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { timeAgo } from '@/lib/utils/format';
import { useNow } from '@/components/time/NowProvider';
import { MOCK_NEWS, MOCK_CAMERAS, MOCK_ACCOUNTS } from '@/lib/data/news';
import { cn } from '@/lib/utils/cn';

const SECTION = 'font-mono text-label font-semibold uppercase tracking-[0.12em] text-fg-mute';
const STRIPES = 'repeating-linear-gradient(135deg,#161d26 0 7px,#10151b 7px 14px)';
const DOT: Record<'action' | 'activo' | 'ok', string> = {
  action: 'bg-action',
  activo: 'bg-state-activo',
  ok: 'bg-ok',
};

/** Pantalla Noticias y directos (3a): directo 24 h, titulares, cámaras DGT y
 * cuentas oficiales. */
export function NoticiasScreen() {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);
  const now = useNow();

  return (
    <>
      <ScreenHeader title={d.news.title} right={<LangButton />} />

      <div className="min-h-0 flex-1 overflow-y-auto pb-4 lg:mx-auto lg:w-full lg:max-w-2xl lg:border-x">
        <div className="px-screen pt-3">
          <LiveEmbed />
        </div>

        {/* Titulares */}
        <div className="flex items-center justify-between px-screen pb-1.5 pt-3.5">
          <span className={SECTION}>{d.news.headlines}</span>
          <span className="text-[10.5px] font-semibold text-action-text">{d.news.newsSources}</span>
        </div>
        <ul className="px-screen">
          {MOCK_NEWS.map((n) => (
            <li key={n.id} className="border-t border-subtle">
              <a href={n.url} className="flex gap-2.5 py-[9px]" target={n.url.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span
                      className={cn(
                        'font-mono text-[9px] font-semibold uppercase',
                        n.tone === 'warn' ? 'text-state-controlado-text' : 'text-action-text',
                      )}
                    >
                      {n.region}
                    </span>
                    <span className="font-mono text-[9px] text-fg-mute">
                      · {timeAgo(n.at, now, locale)} · {n.source}
                    </span>
                  </div>
                  <div className="text-[12.5px] font-semibold leading-snug text-fg">{n.title}</div>
                </div>
                <div
                  className="grid h-[50px] w-[66px] flex-none place-items-center rounded-[6px] border border-subtle"
                  style={{ background: STRIPES }}
                  aria-hidden
                >
                  <span className="font-mono text-[7px] text-fg-mute">foto</span>
                </div>
              </a>
            </li>
          ))}
        </ul>

        {/* Cámaras DGT */}
        <div className="flex items-center justify-between px-screen pb-1.5 pt-3.5">
          <span className={SECTION}>{d.news.cameras}</span>
          <span className="font-mono text-[9px] text-fg-mute">{d.news.refreshed}</span>
        </div>
        <div className="flex gap-2 overflow-x-auto px-screen pb-1">
          {MOCK_CAMERAS.map((c) => (
            <div key={c.id} className="w-[118px] flex-none">
              <div
                className="relative h-[66px] rounded-[6px] border border-subtle"
                style={{ background: STRIPES }}
              >
                <span className="absolute bottom-1 left-1.5 font-mono text-[8px] font-medium text-fg-secondary">
                  {c.location}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-fg-secondary">{c.name}</div>
            </div>
          ))}
        </div>

        {/* Cuentas oficiales */}
        <div className="px-screen pb-1.5 pt-3.5">
          <span className={SECTION}>{d.news.accounts}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 px-screen">
          {MOCK_ACCOUNTS.map((a) => (
            <a
              key={a.handle}
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-strong px-[9px] py-[5px] text-[11px] font-semibold text-fg-body"
            >
              <span className={cn('h-[5px] w-[5px] rounded-full', DOT[a.tone])} aria-hidden />
              {a.handle}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
