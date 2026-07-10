'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StateGlyph } from '@/components/ui/StateGlyph';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { formatNumber, elapsedShort } from '@/lib/utils/format';
import { useNow } from '@/components/time/NowProvider';
import { STATE_RANK } from '@/lib/fires/derive';
import { STATE_LABEL_KEY, STATE_TEXT_CLASS } from '@/lib/fires/style';
import { PT_TEXT, reportSubtitle } from '@/lib/fires/labels';
import { cn } from '@/lib/utils/cn';
import type { Fire } from '@/types/fire';

type SortKey = 'name' | 'state' | 'ha' | 'updated';
const DEFAULT_DIR: Record<SortKey, 'asc' | 'desc'> = {
  name: 'asc',
  state: 'asc',
  ha: 'desc',
  updated: 'desc',
};

const TH = 'font-mono text-label font-semibold uppercase tracking-[0.1em]';

/** Tabla del informe (2b): `<table>` semántica, ordenable por columna. */
export function ReportTable({ fires, empty }: { fires: Fire[]; empty?: React.ReactNode }) {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);
  const now = useNow();
  const router = useRouter();
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'ha', dir: 'desc' });

  const sorted = useMemo(() => {
    const mul = sort.dir === 'asc' ? 1 : -1;
    return [...fires].sort((a, b) => {
      let c = 0;
      if (sort.key === 'name') c = a.name.localeCompare(b.name, locale);
      else if (sort.key === 'state') c = STATE_RANK[a.state] - STATE_RANK[b.state];
      else if (sort.key === 'ha') c = a.hectares - b.hectares;
      else c = Date.parse(a.updatedAt) - Date.parse(b.updatedAt);
      return c * mul;
    });
  }, [fires, sort, locale]);

  const toggle = (key: SortKey) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: DEFAULT_DIR[key] },
    );
  const ariaSort = (key: SortKey): 'ascending' | 'descending' | 'none' =>
    sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === 'asc' ? ' ▴' : ' ▾') : '');
  const stateLabel = (f: Fire) =>
    f.country === 'PT' && f.ptState ? PT_TEXT[f.ptState] : d.states[STATE_LABEL_KEY[f.state]];

  if (fires.length === 0) {
    return <div className="flex min-h-0 flex-1 items-center justify-center p-6">{empty}</div>;
  }

  const headerBtn = (key: SortKey, label: string, align: 'left' | 'right') => (
    <button
      type="button"
      onClick={() => toggle(key)}
      className={cn(
        TH,
        align === 'right' && 'w-full text-right',
        sort.key === key ? 'text-action-text' : 'text-fg-mute',
      )}
    >
      {label}
      {arrow(key)}
    </button>
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <table className="w-full table-fixed border-collapse">
        <caption className="sr-only">{d.report.title}</caption>
        <thead>
          <tr className="border-b border-subtle">
            <th scope="col" aria-sort={ariaSort('name')} className="py-1.5 pl-screen text-left">
              {headerBtn('name', d.report.colFire, 'left')}
            </th>
            <th scope="col" aria-sort={ariaSort('state')} className="w-[84px] py-1.5 text-left">
              {headerBtn('state', d.report.colState, 'left')}
            </th>
            <th scope="col" aria-sort={ariaSort('ha')} className="w-[60px] py-1.5 text-right">
              {headerBtn('ha', d.report.colHa, 'right')}
            </th>
            <th scope="col" aria-sort={ariaSort('updated')} className="w-[54px] py-1.5 pr-screen text-right">
              {headerBtn('updated', d.report.colUpdated, 'right')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((f) => (
            <tr
              key={f.slug}
              onClick={() => router.push(`/f/${f.slug}`)}
              className="cursor-pointer border-t border-subtle align-middle"
            >
              <td className="py-2 pl-screen">
                <span className="flex items-center gap-2">
                  <StateGlyph state={f.state} size={12} className="flex-none" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <Link
                        href={`/f/${f.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="truncate text-[12.5px] font-semibold text-fg"
                      >
                        {f.name}
                      </Link>
                      <LevelBadge level={f.level} country={f.country} />
                    </span>
                    <span className="block truncate text-[10px] text-fg-mute">{reportSubtitle(f)}</span>
                  </span>
                </span>
              </td>
              <td className={cn('text-[10px] font-semibold', STATE_TEXT_CLASS[f.state])}>
                {stateLabel(f)}
              </td>
              <td className="text-right font-mono text-[12px] font-semibold text-fg">
                {formatNumber(f.hectares)}
              </td>
              <td className="pr-screen text-right font-mono text-[10px] text-fg-mute">
                {elapsedShort(f.updatedAt, now)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
