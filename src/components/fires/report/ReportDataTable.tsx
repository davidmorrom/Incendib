'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StateGlyph } from '@/components/ui/StateGlyph';
import { MediosCell, DeltaCell, type ColKey } from './columns';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { useNow } from '@/components/time/NowProvider';
import { formatNumber, elapsedShort } from '@/lib/utils/format';
import { interpolate } from '@/lib/i18n';
import { STATE_RANK } from '@/lib/fires/derive';
import { STATE_LABEL_KEY, STATE_TEXT_CLASS } from '@/lib/fires/style';
import { PT_TEXT } from '@/lib/fires/labels';
import { cn } from '@/lib/utils/cn';
import type { Fire } from '@/types/fire';

export type GroupBy = 'none' | 'ccaa' | 'provincia' | 'state';
export type Density = 'compact' | 'comfortable';
type SortKey = 'name' | 'provincia' | 'ccaa' | 'state' | 'nivel' | 'ha' | 'delta' | 'inicio' | 'updated';

const DEFAULT_DIR: Record<SortKey, 'asc' | 'desc'> = {
  name: 'asc',
  provincia: 'asc',
  ccaa: 'asc',
  state: 'asc',
  nivel: 'desc',
  ha: 'desc',
  delta: 'desc',
  inicio: 'desc',
  updated: 'desc',
};

const TH = 'font-mono text-label font-semibold uppercase tracking-[0.1em]';

/** Compara con los valores ausentes SIEMPRE al final (independiente de la dirección). */
function cmpNullable(
  a: number | null | undefined,
  b: number | null | undefined,
  dir: 1 | -1,
): number {
  const na = a == null;
  const nb = b == null;
  if (na && nb) return 0;
  if (na) return 1;
  if (nb) return -1;
  return (a - b) * dir;
}

/**
 * Tabla densa del Informe: `<table>` semántica, columnas configurables,
 * ordenable (nulos al final), agrupable por CCAA/provincia/estado con
 * subtotales, y densidad ajustable. El «sin dato» se muestra «—» en tono neutro,
 * nunca 0. Fila → ficha del incendio.
 */
export function ReportDataTable({
  fires,
  cols,
  groupBy,
  density,
  empty,
}: {
  fires: Fire[];
  cols: ColKey[];
  groupBy: GroupBy;
  density: Density;
  empty?: React.ReactNode;
}) {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);
  const now = useNow();
  const router = useRouter();
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'ha', dir: 'desc' });

  const show = (c: ColKey) => cols.includes(c);
  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', timeZone: 'Europe/Madrid' }),
    [locale],
  );

  const comparator = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    return (a: Fire, b: Fire): number => {
      switch (sort.key) {
        case 'name':
          return a.name.localeCompare(b.name, locale) * dir;
        case 'provincia':
          return a.province.localeCompare(b.province, locale) * dir;
        case 'ccaa':
          return a.region.localeCompare(b.region, locale) * dir;
        case 'state':
          return (STATE_RANK[a.state] - STATE_RANK[b.state]) * dir;
        case 'nivel':
          return cmpNullable(a.level ?? null, b.level ?? null, dir);
        case 'ha':
          return cmpNullable(a.hectares || null, b.hectares || null, dir);
        case 'delta':
          return cmpNullable(a.delta24h, b.delta24h, dir);
        case 'inicio':
          return cmpNullable(Date.parse(a.startedAt) || null, Date.parse(b.startedAt) || null, dir);
        default:
          return cmpNullable(Date.parse(a.updatedAt) || null, Date.parse(b.updatedAt) || null, dir);
      }
    };
  }, [sort, locale]);

  // Agrupación: {label, key, rows, hectares, approx}[] ordenados por superficie.
  const groups = useMemo(() => {
    const sorted = [...fires].sort(comparator);
    if (groupBy === 'none') return [{ key: '', label: '', rows: sorted, hectares: 0, count: 0, approx: false }];
    const keyOf = (f: Fire) =>
      groupBy === 'ccaa'
        ? f.region
        : groupBy === 'provincia'
          ? f.province
          : d.states[STATE_LABEL_KEY[f.state]];
    const map = new Map<string, Fire[]>();
    for (const f of sorted) {
      const k = keyOf(f) || '—';
      (map.get(k) ?? map.set(k, []).get(k)!).push(f);
    }
    const gs = [...map.entries()].map(([key, rows]) => {
      const hectares = rows.reduce((s, f) => s + (f.hectares || 0), 0);
      const approx = rows.some((f) => f.hectares > 0 && f.hectaresApprox);
      return { key, label: key === '—' ? d.panel.noData : key, rows, hectares, count: rows.length, approx };
    });
    gs.sort((a, b) => b.hectares - a.hectares || b.count - a.count || a.label.localeCompare(b.label, locale));
    return gs;
  }, [fires, comparator, groupBy, d, locale]);

  if (fires.length === 0) {
    return <div className="flex min-h-[30vh] flex-1 items-center justify-center p-6 lg:min-h-0">{empty}</div>;
  }

  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: DEFAULT_DIR[key] }));
  const ariaSort = (key: SortKey): 'ascending' | 'descending' | 'none' =>
    sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === 'asc' ? ' ▴' : ' ▾') : '');

  const sortBtn = (key: SortKey, label: string, align: 'left' | 'right' = 'left') => (
    <button
      type="button"
      onClick={() => toggle(key)}
      className={cn(TH, align === 'right' && 'w-full text-right', sort.key === key ? 'text-action-text' : 'text-fg-mute')}
    >
      {label}
      {arrow(key)}
    </button>
  );

  const pad = density === 'compact' ? 'py-1.5' : 'py-3';
  const stateLabel = (f: Fire) =>
    f.country === 'PT' && f.ptState ? PT_TEXT[f.ptState] : d.states[STATE_LABEL_KEY[f.state]];
  const dash = <span className="text-fg-mute">—</span>;

  // Nº de columnas para el colSpan del encabezado de grupo.
  const colCount = 1 + cols.length + 3; // incendio + opcionales + estado/ha/act.

  return (
    <div className="shrink-0 overflow-x-auto lg:min-h-0 lg:flex-1 lg:shrink lg:overflow-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <caption className="sr-only">{d.report.title}</caption>
        <thead className="sticky top-0 z-[1] bg-bg-base">
          <tr className="border-b border-subtle">
            <th scope="col" aria-sort={ariaSort('name')} className="py-1.5 pl-screen text-left">
              {sortBtn('name', d.panel.colFire)}
            </th>
            {show('provincia') && (
              <th scope="col" aria-sort={ariaSort('provincia')} className="py-1.5 pl-3 text-left">
                {sortBtn('provincia', d.panel.colProvince)}
              </th>
            )}
            {show('ccaa') && (
              <th scope="col" aria-sort={ariaSort('ccaa')} className="py-1.5 pl-3 text-left">
                {sortBtn('ccaa', d.panel.colRegion)}
              </th>
            )}
            <th scope="col" aria-sort={ariaSort('state')} className="w-[84px] py-1.5 pl-3 text-left">
              {sortBtn('state', d.panel.colState)}
            </th>
            {show('nivel') && (
              <th scope="col" aria-sort={ariaSort('nivel')} className="w-[54px] py-1.5 pl-3 text-left">
                {sortBtn('nivel', d.panel.colLevel)}
              </th>
            )}
            {show('tipo') && (
              <th scope="col" className={cn(TH, 'w-[80px] py-1.5 pl-3 text-left text-fg-mute')}>
                {d.panel.groupType}
              </th>
            )}
            <th scope="col" aria-sort={ariaSort('ha')} className="w-[64px] py-1.5 pl-3 text-right">
              {sortBtn('ha', d.panel.colHa, 'right')}
            </th>
            {show('delta') && (
              <th scope="col" aria-sort={ariaSort('delta')} className="w-[64px] py-1.5 pl-3 text-right">
                {sortBtn('delta', d.panel.colDelta, 'right')}
              </th>
            )}
            {show('medios') && (
              <th scope="col" className={cn(TH, 'w-[104px] py-1.5 pl-3 text-left text-fg-mute')}>
                {d.panel.colMedia}
              </th>
            )}
            {show('personal') && (
              <th scope="col" className={cn(TH, 'w-[56px] py-1.5 pl-3 text-right text-fg-mute')}>
                {d.panel.colPersonnel}
              </th>
            )}
            {show('fuente') && (
              <th scope="col" className={cn(TH, 'w-[90px] py-1.5 pl-3 text-left text-fg-mute')}>
                {d.panel.colSource}
              </th>
            )}
            {show('inicio') && (
              <th scope="col" aria-sort={ariaSort('inicio')} className="w-[64px] py-1.5 pl-3 text-right">
                {sortBtn('inicio', d.panel.colStart, 'right')}
              </th>
            )}
            <th scope="col" aria-sort={ariaSort('updated')} className="w-[54px] py-1.5 pr-screen text-right">
              {sortBtn('updated', d.panel.colUpdated, 'right')}
            </th>
          </tr>
        </thead>

        {groups.map((g) => (
          <tbody key={g.key || 'all'}>
            {groupBy !== 'none' && (
              <tr className="sticky top-[29px] z-[1]">
                <th
                  scope="colgroup"
                  colSpan={colCount}
                  className="border-y border-subtle bg-bg-raised px-screen py-1 text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-fg">{g.label}</span>
                    <span className="font-mono text-[9.5px] font-normal text-fg-mute">
                      {interpolate(d.panel.subtotal, {
                        n: formatNumber(g.count),
                        ha: `${g.approx ? '~' : ''}${formatNumber(g.hectares)}`,
                      })}
                    </span>
                  </span>
                </th>
              </tr>
            )}
            {g.rows.map((f) => (
              <tr
                key={f.slug}
                onClick={() => router.push(`/f/${f.slug}`)}
                className="cursor-pointer border-t border-subtle align-middle hover:bg-bg-raised"
              >
                <td className={cn('pl-screen', pad)}>
                  <span className="flex items-center gap-2">
                    <StateGlyph state={f.state} size={12} className="flex-none" />
                    <span className="min-w-0">
                      <Link
                        href={`/f/${f.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block truncate text-[12.5px] font-semibold text-fg"
                      >
                        {f.name}
                      </Link>
                      {f.municipality && f.municipality !== '—' && (
                        <span className="block truncate text-[10px] text-fg-mute">{f.municipality}</span>
                      )}
                    </span>
                  </span>
                </td>
                {show('provincia') && (
                  <td className={cn('pl-3 text-[11px] text-fg-secondary', pad)}>
                    {f.province && f.province !== '—' ? f.province : dash}
                  </td>
                )}
                {show('ccaa') && <td className={cn('pl-3 text-[11px] text-fg-secondary', pad)}>{f.region || dash}</td>}
                <td className={cn('pl-3 text-[10px] font-semibold', STATE_TEXT_CLASS[f.state], pad)}>{stateLabel(f)}</td>
                {show('nivel') && (
                  <td className={cn('pl-3 font-mono text-[11px] font-semibold', pad)}>
                    {f.level != null ? (
                      <span className={f.level >= 2 ? 'text-state-controlado-text' : 'text-fg-secondary'}>N{f.level}</span>
                    ) : (
                      dash
                    )}
                  </td>
                )}
                {show('tipo') && (
                  <td className={cn('pl-3 text-[10.5px] text-fg-secondary', pad)}>
                    {f.type
                      ? f.type === 'forestal'
                        ? d.panel.typeForestal
                        : f.type === 'agricola'
                          ? d.panel.typeAgricola
                          : d.panel.typeUrbano
                      : dash}
                  </td>
                )}
                <td className={cn('pl-3 text-right font-mono text-[12px] font-semibold text-fg', pad)}>
                  {f.hectares > 0 ? `${f.hectaresApprox ? '~' : ''}${formatNumber(f.hectares)}` : dash}
                </td>
                {show('delta') && (
                  <td className={cn('pl-3 text-right', pad)}>
                    <DeltaCell delta={f.delta24h} />
                  </td>
                )}
                {show('medios') && (
                  <td className={cn('pl-3', pad)}>
                    <MediosCell fire={f} title={d.resources.heading} />
                  </td>
                )}
                {show('personal') && (
                  <td className={cn('pl-3 text-right font-mono text-[11px] text-fg-secondary', pad)}>
                    {f.resources?.personnel ? formatNumber(f.resources.personnel) : dash}
                  </td>
                )}
                {show('fuente') && (
                  <td className={cn('pl-3 text-[10px] text-fg-mute', pad)}>
                    {f.sources[0] ? d.panel.sourceNames[f.sources[0]] ?? f.sources[0] : dash}
                  </td>
                )}
                {show('inicio') && (
                  <td className={cn('pl-3 text-right font-mono text-[10px] text-fg-mute', pad)}>
                    {Number.isFinite(Date.parse(f.startedAt)) ? dateFmt.format(Date.parse(f.startedAt)) : dash}
                  </td>
                )}
                <td className={cn('pr-screen text-right font-mono text-[10px] text-fg-mute', pad)}>
                  {elapsedShort(f.updatedAt, now)}
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
