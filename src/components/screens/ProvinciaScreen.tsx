'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { LangButton } from '@/components/layout/LangButton';
import { StateGlyph } from '@/components/ui/StateGlyph';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { interpolate } from '@/lib/i18n';
import { formatNumber } from '@/lib/utils/format';
import { STATE_LABEL_KEY } from '@/lib/fires/style';
import { cn } from '@/lib/utils/cn';
import { mix, V } from '@/lib/design/color';
import type { Country, FireState, SeverityLevel } from '@/types/fire';
import type { Locale } from '@/lib/i18n/config';

/** Episodio (incidente) listado en la página de provincia. Serializable. */
export interface EpisodeRow {
  slug: string;
  name: string;
  municipality: string;
  state: FireState;
  level: SeverityLevel;
  country: Country;
  hectares: number;
  hectaresApprox?: boolean;
  startedAt: string;
  /** true si el episodio ya no está en las fuentes en vivo (ficha histórica). */
  historical: boolean;
  satelliteConfirmed?: boolean;
}

/** Grupo de episodios del mismo paraje (varios = reactivaciones). Serializable. */
export interface PlaceGroupView {
  key: string;
  name: string;
  province: string;
  region: string;
  country: Country;
  /** Episodios del más reciente al más antiguo. */
  episodes: EpisodeRow[];
  /** Cuántos episodios están activos ahora mismo. */
  activeCount: number;
}

function fmtDate(iso: string, locale: Locale): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Madrid',
  }).format(t);
}

const TAG = 'rounded-[4px] px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-[0.06em]';

/**
 * Página de provincia (`/p/[provincia]`): listado de los incendios que ha habido
 * y está habiendo en la provincia, agrupados por paraje. Cuando un paraje tiene
 * varios episodios (reactivaciones), se muestran juntos y marcados. Los datos
 * mezclan incendios en vivo, fichas archivadas y áreas quemadas por satélite.
 */
export function ProvinciaScreen({
  provinceName,
  region,
  groups,
}: {
  provinceName: string;
  region?: string;
  groups: PlaceGroupView[];
}) {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);

  const { active, total, hectares, hectaresApprox } = useMemo(() => {
    let active = 0;
    let total = 0;
    let hectares = 0;
    let hectaresApprox = false;
    for (const g of groups)
      for (const e of g.episodes) {
        total += 1;
        if (e.state === 'activo') active += 1;
        if (Number.isFinite(e.hectares)) {
          hectares += e.hectares;
          if (e.hectaresApprox) hectaresApprox = true;
        }
      }
    return { active, total, hectares, hectaresApprox };
  }, [groups]);

  const activeGroups = groups.filter((g) => g.activeCount > 0);
  const pastGroups = groups.filter((g) => g.activeCount === 0);

  const title = interpolate(d.province.in, { province: provinceName });

  const KPI = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
    <div className="flex-1">
      <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-fg-mute">{label}</div>
      <div
        className={cn(
          'mt-0.5 font-mono text-[19px] font-semibold tabular-nums',
          accent && active > 0 ? 'text-state-activo-text' : 'text-fg',
        )}
      >
        {value}
      </div>
    </div>
  );

  const EpisodeLink = ({ e }: { e: EpisodeRow }) => {
    const stateLabel = d.states[STATE_LABEL_KEY[e.state]];
    return (
      <Link
        href={`/f/${e.slug}`}
        className="flex items-center gap-2.5 border-t border-subtle py-[9px] text-left first:border-t-0"
      >
        <StateGlyph state={e.state} size={13} className="flex-none" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-row font-semibold text-fg">{e.name}</span>
            <span className="sr-only">, {stateLabel}</span>
            <LevelBadge level={e.level} country={e.country} />
            {e.historical && (
              <span className={cn(TAG, 'border border-strong text-fg-mute')}>{d.province.historical}</span>
            )}
            {!e.historical && e.satelliteConfirmed && (
              <span
                className="h-1.5 w-1.5 flex-none rounded-full bg-state-foco"
                style={{ boxShadow: '0 0 4px var(--state-foco)' }}
                aria-hidden
              />
            )}
          </span>
          <span className="block truncate text-[10.5px] text-fg-mute">
            {interpolate(d.province.started, { date: fmtDate(e.startedAt, locale) })}
          </span>
        </span>
        <span className="flex-none text-right font-mono text-[13px] font-semibold text-fg">
          {e.hectares > 0 ? `${e.hectaresApprox ? '~' : ''}${formatNumber(e.hectares)} ha` : d.kpis.noData}
        </span>
      </Link>
    );
  };

  const Group = ({ g }: { g: PlaceGroupView }) => {
    // Un solo episodio: fila simple. Varios (reactivación): tarjeta con cabecera
    // del paraje y sus episodios listados, marcada «Reactivado».
    if (g.episodes.length === 1) {
      return (
        <div className="px-screen">
          <EpisodeLink e={g.episodes[0]!} />
        </div>
      );
    }
    return (
      <div
        className="mx-screen my-1.5 rounded-card border"
        style={{ borderColor: mix(V.foco, 40), background: mix(V.foco, 5) }}
      >
        <div className="flex items-center justify-between gap-2 px-3 pt-2">
          <span className="truncate text-[12.5px] font-bold text-fg">{g.name}</span>
          <span className={cn(TAG, 'flex-none text-state-foco-text')} style={{ background: mix(V.foco, 16) }}>
            {d.province.reactivated} · {interpolate(d.province.episodes, { n: g.episodes.length })}
          </span>
        </div>
        <div className="px-3 pb-1">
          {g.episodes.map((e) => (
            <EpisodeLink key={e.slug} e={e} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <ScreenHeader title={title} right={<LangButton />} />

      <div className="min-h-0 flex-1 overflow-y-auto pb-6 lg:mx-auto lg:w-full lg:max-w-2xl lg:border-x">
        {/* Cabecera */}
        <div className="px-screen pt-4 lg:pt-6">
          <div className="flex items-center gap-2">
            <h1 className="text-title font-bold text-fg">{provinceName}</h1>
            {region && <span className="font-mono text-[11px] text-fg-mute">{region}</span>}
          </div>
          <div className="mt-3 flex gap-4 border-y py-2.5">
            <KPI label={d.province.active} value={formatNumber(active)} accent />
            <KPI label={d.province.total} value={formatNumber(total)} />
            <KPI
              label={d.province.area}
              value={hectares > 0 ? `${hectaresApprox ? '~' : ''}${formatNumber(hectares)}` : '—'}
            />
          </div>
        </div>

        {total === 0 ? (
          <p className="mx-screen mt-4 rounded-card border border-strong px-3 py-6 text-center text-[12.5px] text-fg-secondary">
            {d.province.empty}
          </p>
        ) : (
          <>
            {activeGroups.length > 0 && (
              <section className="mt-3">
                <h2 className="px-screen pb-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-fg-mute">
                  {d.province.sectionActive}
                </h2>
                {activeGroups.map((g) => (
                  <Group key={g.key} g={g} />
                ))}
              </section>
            )}
            {pastGroups.length > 0 && (
              <section className="mt-4">
                <h2 className="px-screen pb-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-fg-mute">
                  {d.province.sectionHistory}
                </h2>
                {pastGroups.map((g) => (
                  <Group key={g.key} g={g} />
                ))}
              </section>
            )}
          </>
        )}

        <p className="mx-screen mt-5 border-t pt-2.5 text-[10.5px] leading-relaxed text-fg-mute">{d.province.note}</p>

        <div className="mt-3 flex items-center justify-between gap-2 px-screen">
          <Link href="/incendios-hoy" className="text-[11px] font-semibold text-action-text">
            {d.province.allProvinces}
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
