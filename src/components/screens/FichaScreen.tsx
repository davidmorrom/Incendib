'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StateGlyph } from '@/components/ui/StateGlyph';
import { ResourcesPanel } from '@/components/fires/ResourcesPanel';
import { FireMiniMapClient } from '@/components/map/FireMiniMapClient';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { formatNumber, formatClock, timeAgo } from '@/lib/utils/format';
import { useNow } from '@/components/time/NowProvider';
import { interpolate } from '@/lib/i18n';
import { STATE_LABEL_KEY, STATE_TEXT_CLASS } from '@/lib/fires/style';
import { PT_TEXT } from '@/lib/fires/labels';
import { SOURCES } from '@/lib/data/sources';
import { mix, V } from '@/lib/design/color';
import { cn } from '@/lib/utils/cn';
import type { Fire, FireState } from '@/types/fire';

const STAT_LABEL = 'font-sans text-[9px] font-semibold uppercase tracking-[0.1em] text-fg-mute';

function stateVar(s: FireState): string {
  return V[s];
}

export function FichaScreen({ fire }: { fire: Fire }) {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);
  const now = useNow();
  const router = useRouter();
  const [following, setFollowing] = useState(false);
  const [copied, setCopied] = useState(false);

  const stateLabel =
    fire.country === 'PT' && fire.ptState ? PT_TEXT[fire.ptState] : d.states[STATE_LABEL_KEY[fire.state]];
  const dateFmt = (iso: string) =>
    `${new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', timeZone: 'Europe/Madrid' }).format(
      Date.parse(iso),
    )} · ${formatClock(Date.parse(iso))}`;

  const back = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/');
  };

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav?.share) {
      try {
        await nav.share({ title: interpolate(d.fire.incidentOf, { name: fire.name }), url });
        return;
      } catch {
        /* cancelado */
      }
    }
    try {
      await nav?.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  };

  const hotspotCount = Math.max(1, Math.round(fire.hectares / 600));

  return (
    <main id="contenido" className="flex h-dvh flex-col overflow-hidden bg-bg-base text-fg">
      {/* Mapa enfocado */}
      <div className="relative min-h-0 flex-1 bg-bg-map">
        <FireMiniMapClient fire={fire} />

        <div className="absolute left-3 right-3 top-3.5 z-[3] flex items-center gap-2">
          <button
            type="button"
            onClick={back}
            aria-label={d.a11y.back}
            className="if-overlay grid h-[38px] w-[38px] flex-none place-items-center rounded-btn text-fg-body"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 3 L5 8 L10 13" />
            </svg>
          </button>
          <div className="if-overlay flex h-[38px] flex-1 items-center gap-2 rounded-btn px-3">
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="var(--text-mute)" strokeWidth="1.6" className="flex-none">
              <circle cx="8" cy="8" r="5" />
              <path d="M12 12 L16 16" />
            </svg>
            <span className="flex-1 truncate text-[12.5px] text-fg-body">
              {fire.municipality}, {fire.province}
            </span>
          </div>
        </div>

        {fire.state === 'activo' && (
          <div
            className="if-overlay absolute left-3 top-[62px] z-[3] inline-flex items-center gap-1.5 rounded-[5px] px-[9px] py-[5px]"
            style={{ borderColor: mix(V.foco, 40) }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-state-foco" aria-hidden />
            <span className="font-mono text-[9.5px] font-medium text-state-foco-text">
              {interpolate(d.fire.hotspots, { n: hotspotCount, time: '13:47' })}
            </span>
          </div>
        )}
      </div>

      {/* Hoja de detalle */}
      <section className="relative -mt-[14px] flex h-[min(496px,72dvh)] flex-none flex-col overflow-hidden rounded-t-[14px] border-t bg-bg-card">
        <div className="mx-auto mt-2 h-1 w-9 flex-none rounded-full" style={{ background: 'var(--border-strong)' }} aria-hidden />

        <div className="flex-none px-4">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-chip border px-[9px] py-[3.5px] text-[10.5px] font-bold leading-none tracking-[0.04em]',
                STATE_TEXT_CLASS[fire.state],
              )}
              style={{ backgroundColor: mix(stateVar(fire.state), 14), borderColor: mix(stateVar(fire.state), 45) }}
            >
              <StateGlyph state={fire.state} size={10} />
              {stateLabel.toUpperCase()}
            </span>
            {fire.level != null && fire.level >= 1 && (
              <span
                className="rounded-chip border px-[9px] py-[3.5px] font-mono text-[10.5px] font-bold text-state-controlado-text"
                style={{ backgroundColor: mix(V.controlado, 12), borderColor: mix(V.controlado, 45) }}
              >
                {`NIVEL ${fire.level}`}
              </span>
            )}
            {fire.fwi && (
              <span className="rounded-chip border border-strong px-[9px] py-[3.5px] font-mono text-[10.5px] font-medium text-fg-secondary">
                {interpolate(d.fire.fwi, { level: fire.fwi }).toUpperCase()}
              </span>
            )}
            <div className="flex-1" />
            <button type="button" onClick={share} aria-label={d.fire.share} className="text-action-text">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                <circle cx="8" cy="3" r="1.6" />
                <circle cx="3" cy="9" r="1.6" />
                <circle cx="13" cy="9" r="1.6" />
                <path d="M8 4.5 L3.8 7.7 M8 4.5 L12.2 7.7" />
              </svg>
            </button>
          </div>

          <h1 className="mt-2.5 text-[18px] font-bold tracking-[-0.01em]">
            {interpolate(d.fire.incidentOf, { name: fire.name })}
          </h1>
          <p className="mt-px text-[12px] text-fg-secondary">
            {fire.municipality} · {fire.province} · {fire.region.replace(/\s*\(PT\)/, '')}
          </p>
          <p className="mt-1.5 font-mono text-[9.5px] text-fg-mute">
            {d.fire.source}: {fire.sources.map((s) => SOURCES[s].label).join(' · ')} —{' '}
            {interpolate(d.status.updatedAgo, { when: timeAgo(fire.updatedAt, now, locale) })}
          </p>
        </div>

        {/* Stats 2×2 */}
        <div
          className="mt-3 grid flex-none grid-cols-2 gap-px border-y"
          style={{ backgroundColor: 'var(--border-subtle)' }}
        >
          <div className="bg-bg-card px-4 py-2.5">
            <div className={STAT_LABEL}>{d.fire.surface}</div>
            {fire.hectares > 0 ? (
              <>
                <div className="whitespace-nowrap font-mono text-[20px] font-semibold">
                  {fire.hectaresApprox ? '~' : ''}
                  {formatNumber(fire.hectares)} <span className="text-[11px] text-fg-secondary">ha</span>
                </div>
                <div
                  className={cn(
                    'whitespace-nowrap font-mono text-[10px] font-medium',
                    fire.hectaresApprox || !(fire.delta24h && fire.delta24h > 0)
                      ? 'text-fg-mute'
                      : 'text-state-activo-text',
                  )}
                >
                  {fire.hectaresApprox
                    ? d.fire.approx
                    : fire.delta24h && fire.delta24h > 0
                      ? interpolate(d.fire.delta24h, { n: formatNumber(fire.delta24h) })
                      : d.fire.noProgress}
                </div>
              </>
            ) : (
              <div className="mt-1 whitespace-nowrap font-mono text-[13px] font-semibold text-fg-secondary">
                {d.kpis.noData}
              </div>
            )}
          </div>
          <div className="bg-bg-card px-4 py-2.5">
            <div className={STAT_LABEL}>{d.fire.start}</div>
            <div className="mt-1 font-mono text-[15px] font-semibold">{dateFmt(fire.startedAt)}</div>
            <div className="font-mono text-[9.5px] text-fg-mute">{timeAgo(fire.startedAt, now, locale)}</div>
          </div>
          <div className="bg-bg-card px-4 py-2.5">
            <div className={STAT_LABEL}>{d.fire.resources}</div>
            <div className="mt-1 font-mono text-[12.5px]">
              {fire.resources?.aerial != null || fire.resources?.ground != null
                ? `${fire.resources.aerial ?? 0} aér · ${fire.resources.ground ?? 0} terr`
                : (fire.resources?.raw ?? '—')}
            </div>
            {(fire.resources?.personnel != null || fire.resources?.note) && (
              <div className="font-mono text-[10px] text-fg-secondary">
                {fire.resources?.personnel != null && `${formatNumber(fire.resources.personnel)} efectivos`}
                {fire.resources?.personnel != null && fire.resources?.note && ' · '}
                {fire.resources?.note}
              </div>
            )}
          </div>
          <div className="bg-bg-card px-4 py-2.5">
            <div className={STAT_LABEL}>{d.fire.weather}</div>
            {fire.weather ? (
              <>
                <div className="mt-1 font-mono text-[12.5px]">
                  {fire.weather.tempC} °C · HR {fire.weather.humidity} %
                </div>
                <div className="font-mono text-[10px] text-fg-secondary">Viento {fire.weather.wind}</div>
              </>
            ) : (
              <div className="mt-1 font-mono text-[12.5px] text-fg-mute">—</div>
            )}
          </div>
        </div>

        {/* Medios desplegados + Evolución */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3">
          <ResourcesPanel resources={fire.resources} />
          {fire.timeline && fire.timeline.length > 0 ? (
            <>
              <div className="mt-4 font-mono text-label font-semibold uppercase tracking-[0.12em] text-fg-mute">
                {d.fire.evolution}
              </div>
              <ol className="mt-2">
                {fire.timeline.map((e, i, arr) => (
                  <li key={`${e.at}-${i}`} className="flex gap-2.5">
                    <div className="flex flex-none flex-col items-center">
                      <span
                        className="mt-1 h-2 w-2 rounded-full"
                        style={{ background: e.state ? stateVar(e.state) : V.foco }}
                        aria-hidden
                      />
                      {i < arr.length - 1 && <span className="w-px flex-1" style={{ background: 'var(--border-default)' }} />}
                    </div>
                    <div className="pb-3">
                      <div className="font-mono text-[10px] font-semibold text-fg-secondary">{dateFmt(e.at)}</div>
                      <div className="mt-px text-[11.5px] text-fg-body">{e.label}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </div>

        {/* Acciones */}
        <div className="flex flex-none gap-2 border-t px-4 py-2.5">
          <button
            type="button"
            onClick={() => setFollowing((f) => !f)}
            aria-pressed={following}
            className={cn(
              'flex h-10 flex-1 items-center justify-center rounded-btn border text-[12.5px] font-semibold',
              following ? 'text-ok-text' : 'text-action-text',
            )}
            style={{
              backgroundColor: mix(following ? V.ok : V.action, 16),
              borderColor: mix(following ? V.ok : V.action, 55),
            }}
          >
            {following ? `✓ ${d.status.live}` : d.fire.follow}
          </button>
          <button
            type="button"
            onClick={share}
            className="flex h-10 w-[120px] items-center justify-center rounded-btn border border-strong text-[12.5px] font-semibold text-fg-secondary"
          >
            {copied ? d.fire.copied : d.fire.shareCta}
          </button>
        </div>

        <p className="flex-none px-4 pb-2.5 text-[9.5px] text-fg-mute">
          {d.disclaimer.short.split('112')[0]}
          <span className="font-semibold text-state-activo-text">112</span>
        </p>
      </section>
    </main>
  );
}
