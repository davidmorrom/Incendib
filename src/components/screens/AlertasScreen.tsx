'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { LangButton } from '@/components/layout/LangButton';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { LEGAL } from '@/lib/legal';
import {
  notificationPermission,
  getExistingSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  type PermissionState,
} from '@/lib/push/client';
import { mix, V } from '@/lib/design/color';
import { cn } from '@/lib/utils/cn';
import { interpolate } from '@/lib/i18n';

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
const PREFS_KEY = 'incendib-alerts';

interface AlertPrefs {
  minLevel: 0 | 1 | 2 | 3;
  radiusKm: number;
  silence: boolean;
  zone: { lat: number; lon: number } | null;
}
const DEFAULT_PREFS: AlertPrefs = { minLevel: 2, radiusKm: 30, silence: false, zone: null };

function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative h-[18px] w-[32px] flex-none rounded-full transition-colors',
        on ? 'bg-action' : 'bg-[var(--border-strong)]',
      )}
    >
      <span
        className={cn(
          'absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white transition-all',
          on ? 'left-[16px]' : 'left-[2px]',
        )}
      />
    </span>
  );
}

const SECTION = 'font-mono text-label font-semibold uppercase tracking-[0.12em] text-fg-mute';

/** Pantalla Ajustes de alertas (7a): permiso Web Push + preferencias por zona. */
export function AlertasScreen() {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);
  const [perm, setPerm] = useState<PermissionState>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [test, setTest] = useState<'idle' | 'sent' | 'fail'>('idle');
  const [enableErr, setEnableErr] = useState(false);
  const [prefs, setPrefs] = useState<AlertPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    setPerm(notificationPermission());
    getExistingSubscription().then((s) => setSubscribed(!!s));
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch {
      /* noop */
    }
  }, []);

  const savePrefs = (p: AlertPrefs) => {
    setPrefs(p);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(p));
    } catch {
      /* noop */
    }
  };

  const enable = async () => {
    setBusy(true);
    setTest('idle');
    setEnableErr(false);
    try {
      const sub = await subscribeToPush(VAPID);
      if (sub) {
        setSubscribed(true);
        setPerm('granted');
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON(), prefs }),
        }).catch(() => {});
      } else {
        const p = notificationPermission();
        setPerm(p);
        // Permiso concedido pero sin suscripción ⇒ falló el registro/suscripción
        // (SW en mal estado, permiso "pillado" por una PWA…): guiar a recuperar.
        if (p === 'granted') setEnableErr(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const sub = await getExistingSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ remove: true, endpoint: sub.endpoint }),
        }).catch(() => {});
      }
      await unsubscribeFromPush();
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  };

  // Mantiene las preferencias del servidor en sync mientras se está suscrito
  // (con un pequeño retardo para no llamar en cada arrastre del slider).
  useEffect(() => {
    if (!subscribed) return;
    const t = setTimeout(async () => {
      const sub = await getExistingSubscription();
      if (!sub) return;
      fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), prefs }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [prefs, subscribed]);

  const sendTest = async () => {
    setTest('idle');
    const sub = await getExistingSubscription();
    if (!sub) {
      setTest('fail');
      return;
    }
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    }).catch(() => null);
    setTest(res && res.ok ? 'sent' : 'fail');
  };

  const useLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => savePrefs({ ...prefs, zone: { lat: pos.coords.latitude, lon: pos.coords.longitude } }),
      () => savePrefs({ ...prefs, zone: null }),
    );
  };

  const unsupported = perm === 'unsupported';

  return (
    <>
      <ScreenHeader title={d.alerts.title} right={<LangButton />} />

      <div className="min-h-0 flex-1 overflow-y-auto pb-4 lg:mx-auto lg:w-full lg:max-w-2xl lg:border-x">
        {/* Soft-ask / explicación (8a) */}
        <div
          className="mx-screen mt-3 flex items-start gap-2.5 rounded-card border p-3"
          style={{ borderColor: mix(V.action, 40), backgroundColor: mix(V.action, 8) }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--action-text)" strokeWidth="1.5" className="mt-px flex-none">
            <path d="M9 2a4 4 0 0 0-4 4c0 3-1.5 4.5-1.5 4.5h11S13 9 13 6a4 4 0 0 0-4-4Z" />
            <path d="M7.5 14a1.5 1.5 0 0 0 3 0" />
          </svg>
          <p className="text-[12px] leading-relaxed text-fg-body">{d.alerts.softAsk}</p>
        </div>

        <Link href="/legal" className="mx-screen mt-2 block text-[11px] font-semibold text-action-text">
          {(LEGAL[locale] ?? LEGAL.es).title} →
        </Link>

        {unsupported ? (
          <p className="mx-screen mt-3 rounded-card border border-strong px-3 py-2.5 text-[12px] text-fg-secondary">
            {d.alerts.unsupported}
          </p>
        ) : (
          <>
            {/* Interruptor principal */}
            <div className="mx-screen mt-3">
              {subscribed ? (
                <div className="flex items-center justify-between rounded-card border border-strong px-3 py-2.5">
                  <span className="flex items-center gap-2 text-[12.5px] font-semibold text-ok-text">
                    <span className="h-2 w-2 rounded-full bg-ok" aria-hidden />
                    {d.alerts.enabled}
                  </span>
                  <button
                    type="button"
                    onClick={disable}
                    disabled={busy}
                    className="text-[12px] font-semibold text-fg-secondary underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {d.alerts.disable}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={enable}
                  disabled={busy}
                  className="flex h-11 w-full items-center justify-center rounded-btn text-[13px] font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: 'var(--action)' }}
                >
                  {d.alerts.enable}
                </button>
              )}
              {perm === 'denied' && (
                <p className="mt-2 text-[11px] leading-relaxed text-warn">{d.alerts.denied}</p>
              )}
              {enableErr && perm !== 'denied' && (
                <p className="mt-2 text-[11px] leading-relaxed text-warn">{d.alerts.enableError}</p>
              )}
            </div>

            {/* Preferencias */}
            <div className="px-screen pb-1.5 pt-4">
              <span className={SECTION}>{d.alerts.prefsHeading}</span>
            </div>

            {/* Nivel mínimo */}
            <div className="mx-screen flex items-center justify-between gap-2 border-t border-subtle py-3">
              <span className="text-[12.5px] text-fg-body">{d.alerts.levels}</span>
              <div className="flex gap-1">
                {([0, 1, 2, 3] as const).map((n) => {
                  const on = prefs.minLevel === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => savePrefs({ ...prefs, minLevel: n })}
                      aria-pressed={on}
                      className={cn(
                        'grid h-7 w-7 place-items-center rounded-[6px] border font-mono text-[12px] font-semibold',
                        on ? 'text-action-text' : 'border-strong text-fg-mute',
                      )}
                      style={on ? { backgroundColor: mix(V.action, 16), borderColor: mix(V.action, 55) } : undefined}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Radio + ubicación */}
            <div className="mx-screen border-t border-subtle py-3">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-fg-body">{d.alerts.radius}</span>
                <span className="font-mono text-[12px] font-semibold text-fg">
                  {interpolate('{n} km', { n: prefs.radiusKm })}
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={prefs.radiusKm}
                onChange={(e) => savePrefs({ ...prefs, radiusKm: Number(e.target.value) })}
                className="mt-2 w-full accent-[var(--action)]"
                aria-label={d.alerts.radius}
              />
              <div className="mt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={useLocation}
                  className="text-[11.5px] font-semibold text-action-text"
                >
                  {d.alerts.useLocation}
                </button>
                {prefs.zone && (
                  <span className="font-mono text-[10px] text-fg-mute">{d.alerts.locationSet}</span>
                )}
              </div>
            </div>

            {/* Evacuación siempre suena */}
            <div className="mx-screen flex items-center justify-between gap-2 border-t border-subtle py-3">
              <span className="flex items-center gap-2 text-[12.5px] text-fg-body">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--state-activo-text)" strokeWidth="1.3" aria-hidden>
                  <rect x="3" y="6" width="8" height="6" rx="1" />
                  <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" />
                </svg>
                {d.alerts.evacuationAlways}
              </span>
              <span className="font-mono text-[10px] text-fg-mute">112</span>
            </div>

            {/* Silenciar no críticas */}
            <button
              type="button"
              onClick={() => savePrefs({ ...prefs, silence: !prefs.silence })}
              role="switch"
              aria-checked={prefs.silence}
              className="mx-screen flex w-[calc(100%-28px)] items-center justify-between gap-2 border-t border-subtle py-3 text-left"
            >
              <span className="text-[12.5px] text-fg-body">{d.alerts.silence}</span>
              <Switch on={prefs.silence} />
            </button>

            {/* Prueba */}
            {subscribed && (
              <div className="mx-screen mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={sendTest}
                  className="rounded-btn border border-strong px-3 py-2 text-[12px] font-semibold text-fg-secondary"
                >
                  {d.alerts.test}
                </button>
                {test === 'sent' && <span className="text-[11.5px] font-semibold text-ok-text">{d.alerts.testSent}</span>}
                {test === 'fail' && <span className="text-[11.5px] font-semibold text-warn">{d.alerts.testFail}</span>}
              </div>
            )}

            <p className="mx-screen mt-3 text-[10.5px] leading-relaxed text-fg-mute">{d.alerts.autoNote}</p>
          </>
        )}

        <p className="mx-screen mt-4 border-t pt-2.5 text-[10px] text-fg-mute">
          {d.disclaimer.short.split('112')[0]}
          <span className="font-mono font-semibold text-state-activo-text">112</span>
        </p>
      </div>
    </>
  );
}
