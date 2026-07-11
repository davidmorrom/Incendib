'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { LangButton } from '@/components/layout/LangButton';
import { LiveEmbed } from '@/components/news/LiveEmbed';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { timeAgo } from '@/lib/utils/format';
import { useNow } from '@/components/time/NowProvider';
import { MOCK_NEWS, MOCK_CAMERAS, MOCK_ACCOUNTS } from '@/lib/data/news';
import { STATE_LABEL_KEY, STATE_TEXT_CLASS } from '@/lib/fires/style';
import { cn } from '@/lib/utils/cn';
import type { Fire } from '@/types/fire';

const SECTION = 'font-mono text-label font-semibold uppercase tracking-[0.12em] text-fg-mute';
const STRIPES = 'repeating-linear-gradient(135deg,#161d26 0 7px,#10151b 7px 14px)';
const DOT: Record<'action' | 'activo' | 'ok', string> = {
  action: 'bg-action',
  activo: 'bg-state-activo',
  ok: 'bg-ok',
};

function SectionHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-screen pb-1.5 pt-3.5">
      <span className={SECTION}>{title}</span>
      {right}
    </div>
  );
}

/** Titulares filtrados por incendio (feed). */
function Headlines() {
  const locale = useUIStore((s) => s.locale);
  const now = useNow();
  return (
    <ul className="px-screen">
      {MOCK_NEWS.map((n) => (
        <li key={n.id} className="border-t border-subtle">
          <a
            href={n.url}
            className="flex gap-2.5 py-[9px]"
            target={n.url.startsWith('http') ? '_blank' : undefined}
            rel="noreferrer"
          >
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
  );
}

/** Cámaras DGT. `grid`: rejilla (desktop, columna estrecha); si no, tira horizontal. */
function Cameras({ grid }: { grid?: boolean }) {
  return (
    <div
      className={cn(
        grid ? 'grid grid-cols-2 gap-2 px-screen' : 'flex gap-2 overflow-x-auto px-screen pb-1',
      )}
    >
      {MOCK_CAMERAS.map((c) => (
        <div key={c.id} className={grid ? '' : 'w-[118px] flex-none'}>
          <div className="relative h-[66px] rounded-[6px] border border-subtle" style={{ background: STRIPES }}>
            <span className="absolute bottom-1 left-1.5 font-mono text-[8px] font-medium text-fg-secondary">
              {c.location}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-fg-secondary">{c.name}</div>
        </div>
      ))}
    </div>
  );
}

/** Cuentas oficiales (chips enlazables). */
function Accounts() {
  return (
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
  );
}

interface ChronoEvent {
  key: string;
  at: string;
  title: string;
  sub: string;
  dot: string; // clase text-* (el punto usa bg-current)
  href: string;
  external: boolean;
}

/** Cronología en vivo (6a): mezcla incendios reales y titulares, por hora. */
function Chronology({ fires }: { fires: Fire[] }) {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);
  const now = useNow();

  const events = useMemo<ChronoEvent[]>(() => {
    const fromFires: ChronoEvent[] = fires.map((f) => {
      const place = f.municipality && f.municipality !== '—' ? f.municipality : f.region.replace(/\s*\(PT\)/, '');
      return {
        key: `f-${f.slug}`,
        at: f.updatedAt,
        title: f.name,
        sub: `${d.states[STATE_LABEL_KEY[f.state]]} · ${place}`,
        dot: STATE_TEXT_CLASS[f.state],
        href: `/f/${f.slug}`,
        external: false,
      };
    });
    const fromNews: ChronoEvent[] = MOCK_NEWS.map((n) => ({
      key: `n-${n.id}`,
      at: n.at,
      title: n.title,
      sub: `${n.region} · ${n.source}`,
      dot: n.tone === 'warn' ? 'text-state-controlado-text' : 'text-action-text',
      href: n.url,
      external: n.url.startsWith('http'),
    }));
    return [...fromFires, ...fromNews]
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .slice(0, 28);
  }, [fires, d]);

  if (!events.length) {
    return <p className="px-screen py-6 text-center text-body text-fg-secondary">{d.empty.good}</p>;
  }

  return (
    <ol className="px-screen py-2">
      {events.map((e, i) => {
        const inner = (
          <>
            <div className="flex flex-none flex-col items-center">
              <span className={cn('mt-1 h-2 w-2 rounded-full bg-current', e.dot)} aria-hidden />
              {i < events.length - 1 && <span className="w-px flex-1" style={{ background: 'var(--border-default)' }} />}
            </div>
            <div className="min-w-0 pb-3">
              <div className="font-mono text-[9px] text-fg-mute">{timeAgo(e.at, now, locale)}</div>
              <div className="mt-px truncate text-[12px] font-semibold text-fg">{e.title}</div>
              <div className="truncate text-[10.5px] text-fg-secondary">{e.sub}</div>
            </div>
          </>
        );
        return e.external ? (
          <li key={e.key}>
            <a href={e.href} target="_blank" rel="noreferrer" className="flex gap-2.5">
              {inner}
            </a>
          </li>
        ) : (
          <li key={e.key}>
            <Link href={e.href} className="flex gap-2.5">
              {inner}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** Pantalla Noticias y directos (3a móvil / 6a desktop: cronología · directo +
 * titulares · cámaras + cuentas). */
export function NoticiasScreen({ fires }: { fires: Fire[] }) {
  const d = useDict();

  return (
    <>
      <ScreenHeader title={d.news.title} right={<LangButton />} />

      {/* Móvil (3a): pila */}
      <div className="min-h-0 flex-1 overflow-y-auto pb-4 lg:hidden">
        <div className="px-screen pt-3">
          <LiveEmbed />
        </div>
        <SectionHead
          title={d.news.headlines}
          right={<span className="text-[10.5px] font-semibold text-action-text">{d.news.newsSources}</span>}
        />
        <Headlines />
        <SectionHead
          title={d.news.cameras}
          right={<span className="font-mono text-[9px] text-fg-mute">{d.news.refreshed}</span>}
        />
        <Cameras />
        <SectionHead title={d.news.accounts} />
        <Accounts />
      </div>

      {/* Desktop (6a): 3 columnas — cronología · directo+titulares · cámaras+cuentas */}
      <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-[300px_1fr_320px] lg:grid-rows-1">
        {/* Cronología */}
        <div className="min-h-0 overflow-y-auto border-r">
          <div className="sticky top-0 z-[1] border-b bg-bg-base px-screen py-2.5">
            <span className={SECTION}>{d.news.chronology}</span>
          </div>
          <Chronology fires={fires} />
        </div>

        {/* Directo + titulares */}
        <div className="min-h-0 overflow-y-auto">
          <div className="px-5 pt-4">
            <LiveEmbed />
          </div>
          <SectionHead
            title={d.news.headlines}
            right={<span className="text-[10.5px] font-semibold text-action-text">{d.news.newsSources}</span>}
          />
          <Headlines />
          <div className="pb-4" />
        </div>

        {/* Cámaras + cuentas */}
        <div className="min-h-0 overflow-y-auto border-l">
          <SectionHead
            title={d.news.cameras}
            right={<span className="font-mono text-[9px] text-fg-mute">{d.news.refreshed}</span>}
          />
          <Cameras grid />
          <SectionHead title={d.news.accounts} />
          <Accounts />
          <div className="pb-4" />
        </div>
      </div>
    </>
  );
}
