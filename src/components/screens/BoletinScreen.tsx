'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { LangButton } from '@/components/layout/LangButton';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { interpolate } from '@/lib/i18n';
import { formatNumber } from '@/lib/utils/format';
import { formatPeriod, delta, type Delta } from '@/lib/boletin/format';
import { mix, V } from '@/lib/design/color';
import { cn } from '@/lib/utils/cn';
import type { Boletin } from '@/types/boletin';
import type { Locale } from '@/lib/i18n/config';
import type { SeverityLevel } from '@/types/fire';

const SECTION = 'font-mono text-label font-semibold uppercase tracking-[0.12em] text-fg-mute';

function fmtDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

/** Flecha de variación: ▲ rojo = empeora, ▼ verde = mejora (color = dato). */
function DeltaTag({ delta: dl, label }: { delta: Delta | null; label: string }) {
  if (!dl || dl.dir === 'flat') return null;
  const up = dl.dir === 'up';
  return (
    <span
      className={cn('font-mono text-[10px] font-semibold', up ? 'text-state-activo-text' : 'text-ok-text')}
      title={label}
    >
      {up ? '▲' : '▼'} {formatNumber(dl.abs)}
    </span>
  );
}

function Kpi({
  label,
  value,
  unit,
  delta: dl,
  vsLabel,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: Delta | null;
  vsLabel?: string;
}) {
  return (
    <div className="border-t border-subtle px-screen py-3 first:border-t-0 md:border-t-0">
      <div className={SECTION}>{label}</div>
      <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
        <span className="font-mono text-[22px] font-bold leading-none text-fg">{value}</span>
        {unit && <span className="font-mono text-[11px] text-fg-mute">{unit}</span>}
      </div>
      {dl != null && vsLabel && (
        <div className="mt-1">
          <DeltaTag delta={dl} label={vsLabel} />
        </div>
      )}
    </div>
  );
}

function levelText(level: SeverityLevel): string {
  return level == null ? '—' : String(level);
}

/** Referencia mínima a una edición contigua (para navegar el archivo). */
type EdRef = { id: string; isoWeek: number; year: number } | null;

/** Vista de una edición del boletín semanal (inmutable). */
export function BoletinScreen({
  boletin: b,
  older,
  newer,
}: {
  boletin: Boletin;
  older?: EdRef;
  newer?: EdRef;
}) {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);
  const k = b.kpi;
  const p = b.prevKpi;
  const vs = d.boletin.vsPrev;
  const [copied, setCopied] = useState(false);
  const [cited, setCited] = useState(false);

  async function onCite() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const citation =
      `Incendib. ${interpolate(d.boletin.week, { n: b.isoWeek })} · ${b.year} ` +
      `(${formatPeriod(b.periodStart, b.periodEnd, locale)}). ${url}`;
    try {
      await navigator.clipboard.writeText(citation);
      setCited(true);
      setTimeout(() => setCited(false), 2000);
    } catch {
      /* sin permiso de portapapeles: no hacemos nada */
    }
  }

  async function onShare() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = `${interpolate(d.boletin.week, { n: b.isoWeek })} · ${b.year} — Incendib`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* el usuario canceló: no es un error */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* sin permiso de portapapeles: no hacemos nada */
    }
  }

  return (
    <>
      <ScreenHeader
        title={`${interpolate(d.boletin.week, { n: b.isoWeek })} · ${b.year}`}
        right={<LangButton />}
      />

      <div className="min-h-0 flex-1 overflow-y-auto pb-6 lg:mx-auto lg:w-full lg:max-w-5xl lg:border-x print:block print:overflow-visible print:pb-0 print:max-w-none print:border-x-0">
        {/* Cabecera de edición */}
        <header className="px-screen pt-4 lg:pt-6">
          <div className="flex items-center gap-2">
            <Link href="/boletines" className="font-mono text-[11px] font-semibold text-action-text print:hidden">
              ← {d.boletin.title}
            </Link>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <h1 className="text-title font-bold text-fg">
              {interpolate(d.boletin.week, { n: b.isoWeek })} · {b.year}
            </h1>
            <span
              className="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide"
              style={{
                color: b.status === 'cerrado' ? 'var(--ok-text)' : 'var(--warn)',
                backgroundColor: mix(b.status === 'cerrado' ? V.ok : V.warn, 12),
              }}
            >
              {b.status === 'cerrado' ? d.boletin.status.cerrado : d.boletin.status.provisional}
            </span>
          </div>
          <p className="mt-1 font-mono text-[12px] text-fg-secondary">
            {formatPeriod(b.periodStart, b.periodEnd, locale)}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="font-mono text-[10.5px] text-fg-mute">
              {interpolate(d.boletin.published, { when: fmtDate(b.publishedAt, locale) })}
            </span>
            <button
              type="button"
              onClick={onShare}
              aria-live="polite"
              className="font-mono text-[10.5px] font-semibold text-action-text print:hidden"
            >
              {copied ? d.boletin.shareCopied : d.boletin.share}
            </button>
            <button
              type="button"
              onClick={onCite}
              aria-live="polite"
              className="font-mono text-[10.5px] font-semibold text-action-text print:hidden"
            >
              {cited ? d.boletin.citeCopied : d.boletin.cite}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="font-mono text-[10.5px] font-semibold text-action-text print:hidden"
            >
              {d.boletin.print}
            </button>
          </div>
        </header>

        {/* KPIs de la semana */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <Kpi
            label={d.boletin.kpiFirms}
            value={formatNumber(k.firmsWeek)}
            delta={delta(k.firmsWeek, p?.firmsWeek)}
            vsLabel={vs}
          />
          <Kpi
            label={d.boletin.kpiActive}
            value={formatNumber(k.activeFires)}
            delta={delta(k.activeFires, p?.activeFires)}
            vsLabel={vs}
          />
          <Kpi
            label={d.boletin.kpiHectares}
            value={formatNumber(k.hectares)}
            unit="ha"
            delta={delta(k.hectares, p?.hectares)}
            vsLabel={vs}
          />
          <Kpi
            label={d.boletin.kpiPerimeters}
            value={formatNumber(k.perimeters)}
            delta={delta(k.perimeters, p?.perimeters)}
            vsLabel={vs}
          />
          <Kpi label={d.boletin.kpiMaxLevel} value={levelText(k.maxLevel)} unit={k.maxLevelWhere} />
        </div>

        {/* Ranking + destacados: apilados en móvil, dos columnas en desktop */}
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6">
        {/* Ranking territorial */}
        {b.ranking.length > 0 && (
          <section className="mt-5">
            <div className="px-screen pb-1.5">
              <span className={SECTION}>{d.boletin.rankingHeading}</span>
            </div>
            <div className="mx-screen">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-subtle pb-1 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-fg-mute">
                <span>{d.boletin.colRegion}</span>
                <span className="text-right">{d.boletin.colFires}</span>
                <span className="text-right">{d.boletin.colHa}</span>
              </div>
              {b.ranking.map((r) => (
                <div
                  key={`${r.country}-${r.region}`}
                  className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 border-b border-subtle py-2"
                >
                  <span className="flex items-center gap-1.5 truncate text-[12.5px] text-fg-body">
                    <span className="font-mono text-[9px] text-fg-mute">{r.country}</span>
                    {r.region}
                  </span>
                  <span className="text-right font-mono text-[12px] text-fg">{r.fires}</span>
                  <span className="text-right font-mono text-[12px] font-semibold text-fg">
                    {formatNumber(r.hectares)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Incendios destacados */}
        <section className="mt-5">
          <div className="px-screen pb-1.5">
            <span className={SECTION}>{d.boletin.highlightsHeading}</span>
          </div>
          {b.highlights.length === 0 ? (
            <p className="mx-screen rounded-card border border-strong px-3 py-4 text-center text-[12px] text-ok-text">
              {d.boletin.noHighlights}
            </p>
          ) : (
            <ul className="mx-screen">
              {b.highlights.map((h) => {
                const red = h.level != null && h.level >= 2;
                return (
                  <li key={h.slug}>
                    <Link
                      href={`/f/${h.slug}`}
                      className="flex items-center gap-2.5 border-t border-subtle py-2.5 last:border-b"
                    >
                      <span
                        className="h-2 w-2 flex-none rounded-full"
                        style={{ backgroundColor: `var(--state-${h.state})` }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-fg-body">
                        {h.name}
                        <span className="ml-1.5 font-mono text-[10px] text-fg-mute">{h.region}</span>
                      </span>
                      {h.level != null && (
                        <span
                          className={cn(
                            'font-mono text-[10px] font-semibold',
                            red ? 'text-state-activo-text' : 'text-fg-mute',
                          )}
                        >
                          {interpolate(d.boletin.level, { n: h.level })}
                        </span>
                      )}
                      <span className="w-16 flex-none text-right font-mono text-[12px] font-semibold text-fg">
                        {formatNumber(h.hectares)} ha
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        </div>

        {/* Notas y método + atribución */}
        <section className="mx-screen mt-5 rounded-card border border-subtle bg-bg-raised p-3">
          <span className={SECTION}>{d.boletin.methodHeading}</span>
          <p className="mt-1.5 text-[11px] leading-relaxed text-fg-secondary">{d.boletin.method}</p>
          {b.note && (
            <p className="mt-2 text-[11px] leading-relaxed text-fg-secondary">{b.note}</p>
          )}
          {b.sources.length > 0 && (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-fg-mute">
              {b.sources.join(' · ')}
            </p>
          )}
          <a
            href={`/boletin/${b.id}/data.json`}
            className="mt-2 inline-block font-mono text-[10.5px] font-semibold text-action-text print:hidden"
          >
            {d.boletin.downloadData} ↓
          </a>
        </section>

        {(older || newer) && (
          <nav className="mx-screen mt-5 flex items-center justify-between gap-2 border-t pt-3 print:hidden">
            {older ? (
              <Link
                href={`/boletin/${older.id}`}
                className="font-mono text-[11px] font-semibold text-action-text"
              >
                ← {d.boletin.prevEdition}
              </Link>
            ) : (
              <span />
            )}
            {newer ? (
              <Link
                href={`/boletin/${newer.id}`}
                className="font-mono text-[11px] font-semibold text-action-text"
              >
                {d.boletin.nextEdition} →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}

        <p className="mx-screen mt-4 border-t pt-2.5 text-[10px] leading-relaxed text-fg-mute">
          {d.disclaimer.short.split('112')[0]}
          <span className="font-mono font-semibold text-state-activo-text">112</span>
        </p>
      </div>
    </>
  );
}
