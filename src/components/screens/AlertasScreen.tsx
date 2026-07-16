'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { LangButton } from '@/components/layout/LangButton';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { useFollowStore } from '@/lib/follow';
import { LEGAL } from '@/lib/legal';
import {
  notificationPermission,
  getExistingSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  type PermissionState,
} from '@/lib/push/client';
import {
  loadPrefs,
  savePrefsLocal,
  syncPrefsToServer,
  browserTimeZone,
} from '@/lib/alerts/storage';
import {
  DEFAULT_RADIUS_KM,
  MAX_ZONES,
  minuteOfDayToHHMM,
  parseMinuteOfDay,
  type AlertPrefs,
  type AlertZone,
} from '@/lib/alerts/prefs';
import { canonicalProvinceSlug, haversineKm } from '@/lib/alerts/match';
import { PROVINCES } from '@/lib/geo/provinces';
import { mix, V } from '@/lib/design/color';
import { cn } from '@/lib/utils/cn';
import { interpolate } from '@/lib/i18n';

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

const SECTION = 'font-mono text-label font-semibold uppercase tracking-[0.12em] text-fg-mute';

/** Incendio mínimo que devuelve /api/fires (para el conteo por zona). */
interface ZoneFire {
  state: string;
  province: string;
  coordinates: [number, number];
}

function uid(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* noop */
  }
  return `z-${Math.floor(performance.now() * 1000).toString(36)}-${PROVINCES.length}`;
}

/** Interruptor accesible (role=switch) con área táctil ≥44px y foco visible. */
function Toggle({
  checked,
  onChange,
  label,
  locked,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-disabled={locked || undefined}
      onClick={() => !locked && onChange(!checked)}
      className={cn(
        'grid h-11 w-11 flex-none place-items-center rounded-md outline-none',
        'focus-visible:ring-2 focus-visible:ring-[var(--action)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]',
        locked && 'cursor-default',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'relative block h-[22px] w-[38px] rounded-full transition-colors',
          checked ? 'bg-action' : 'bg-[var(--border-strong)]',
          locked && 'opacity-90',
        )}
      >
        <span
          className={cn(
            'absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white transition-all',
            checked ? 'left-[18px]' : 'left-[2px]',
          )}
        />
      </span>
    </button>
  );
}

/* ── Iconos (extraídos del mock 7a; color = dato, vía tokens) ─────────────────── */
function PinIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={active ? V.action : V.extinguido} strokeWidth="1.4" className="flex-none" aria-hidden>
      <path d="M8 14.5 C8 14.5 13 10.2 13 6.5 A5 5 0 0 0 3 6.5 C3 10.2 8 14.5 8 14.5 Z" />
      <circle cx="8" cy="6.5" r="1.8" />
    </svg>
  );
}

/** Pantalla Ajustes de alertas (7a): panel avanzado de Web Push por zonas y tipos. */
export function AlertasScreen() {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);

  // Estado de permiso / suscripción (se conserva toda la máquina de estados).
  const [perm, setPerm] = useState<PermissionState>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [test, setTest] = useState<'idle' | 'sent' | 'fail'>('idle');
  const [enableErr, setEnableErr] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Preferencias (fuente de verdad en el dispositivo: localStorage).
  const [prefs, setPrefs] = useState<AlertPrefs>(() => ({
    version: 2,
    zones: [],
    minLevel: 2,
    types: { newFire: true, escalation: true, evacuation: true, hotspots: false, followed: true },
    quietHours: null,
    followedSlugs: [],
  }));

  // Incendios en vivo (para el conteo por zona).
  const [fires, setFires] = useState<ZoneFire[]>([]);

  // Edición de zonas.
  const [adding, setAdding] = useState(false);
  const [picker, setPicker] = useState(false);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [geoErr, setGeoErr] = useState(false);

  const followed = useFollowStore((s) => s.fires);
  const unfollowFire = useFollowStore((s) => s.unfollow);

  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    setPerm(notificationPermission());
    getExistingSubscription().then((s) => setSubscribed(!!s));
    setPrefs(loadPrefs());
    fetch('/api/fires')
      .then((r) => r.json())
      .then((data: { fires?: ZoneFire[] }) => setFires(Array.isArray(data.fires) ? data.fires : []))
      .catch(() => {});
  }, []);

  // Persiste local siempre; replica al servidor (debounced) si hay suscripción.
  // Estampa el idioma actual para que el cron localice el texto de las push.
  const update = (raw: AlertPrefs) => {
    const next = { ...raw, locale };
    setPrefs(next);
    savePrefsLocal(next);
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => void syncPrefsToServer(next), 500);
  };

  // Mantiene followedSlugs en sync con la lista de seguimiento local.
  useEffect(() => {
    if (!mounted) return;
    const slugs = followed.map((f) => f.slug);
    setPrefs((p) => {
      if (p.followedSlugs.length === slugs.length && p.followedSlugs.every((s, i) => s === slugs[i])) return p;
      const next = { ...p, followedSlugs: slugs };
      savePrefsLocal(next);
      return next;
    });
  }, [followed, mounted]);

  // El selector de provincia es modal: cerrar con Escape.
  useEffect(() => {
    if (!picker) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPicker(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picker]);

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
          body: JSON.stringify({ subscription: sub.toJSON(), prefs: { ...prefs, locale } }),
        }).catch(() => {});
      } else {
        const p = notificationPermission();
        setPerm(p);
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
      body: JSON.stringify({ subscription: sub.toJSON(), locale }),
    }).catch(() => null);
    setTest(res && res.ok ? 'sent' : 'fail');
  };

  // ── Zonas ──────────────────────────────────────────────────────────────────
  const addLocationZone = () => {
    setGeoErr(false);
    if (!navigator.geolocation) {
      setGeoErr(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const zone: AlertZone = {
          id: uid(),
          kind: 'location',
          label: d.alerts.zoneKindLocation,
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          radiusKm: DEFAULT_RADIUS_KM,
          enabled: true,
        };
        update({ ...prefs, zones: [...prefs.zones, zone].slice(0, MAX_ZONES) });
        setAdding(false);
      },
      () => setGeoErr(true),
    );
  };

  const addProvinceZone = (slug: string, name: string) => {
    if (prefs.zones.some((z) => z.provinceSlug === slug)) {
      setPicker(false);
      setAdding(false);
      return;
    }
    const zone: AlertZone = { id: uid(), kind: 'province', label: name, provinceSlug: slug, enabled: true };
    update({ ...prefs, zones: [...prefs.zones, zone].slice(0, MAX_ZONES) });
    setPicker(false);
    setAdding(false);
    setQuery('');
  };

  const updateZone = (id: string, patch: Partial<AlertZone>) =>
    update({ ...prefs, zones: prefs.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) });

  const removeZone = (id: string) => {
    update({ ...prefs, zones: prefs.zones.filter((z) => z.id !== id) });
    setEditingId(null);
  };

  const setType = (key: keyof AlertPrefs['types'], v: boolean) =>
    update({ ...prefs, types: { ...prefs.types, [key]: v } });

  const setQuiet = (enabled: boolean) => {
    if (!enabled) return update({ ...prefs, quietHours: null, timeZone: undefined });
    update({ ...prefs, quietHours: { start: 0, end: 7 * 60 }, timeZone: browserTimeZone() });
  };
  const setQuietBound = (which: 'start' | 'end', hhmm: string) => {
    const m = parseMinuteOfDay(hhmm);
    if (m == null || !prefs.quietHours) return;
    update({ ...prefs, quietHours: { ...prefs.quietHours, [which]: m }, timeZone: browserTimeZone() });
  };

  /** Incendios (no extinguidos) que caen en la zona — conteo situacional honesto. */
  const zoneCount = (z: AlertZone): number => {
    if (!fires.length) return 0;
    return fires.filter((f) => {
      if (f.state === 'extinguido') return false;
      if (z.kind === 'province') return canonicalProvinceSlug(f.province) === z.provinceSlug;
      if (z.lat == null || z.lon == null) return false;
      return haversineKm(f.coordinates, [z.lon, z.lat]) <= (z.radiusKm ?? DEFAULT_RADIUS_KM);
    }).length;
  };

  const filteredProvinces = useMemo(() => {
    const q = canonicalProvinceSlug(query);
    const list = q ? PROVINCES.filter((p) => canonicalProvinceSlug(p.name).includes(q)) : PROVINCES;
    return list.slice(0, 60);
  }, [query]);

  const unsupported = perm === 'unsupported';
  const legal = LEGAL[locale] ?? LEGAL.es;
  // Los focos satelitales solo se emparejan por proximidad a una zona geográfica
  // (no por provincia): sin ninguna, el aviso no llegaría nunca → avisar en la UI.
  const hasGeoZone = prefs.zones.some((z) => z.enabled && z.kind !== 'province' && z.lat != null && z.lon != null);

  const kindLabel = (z: AlertZone) =>
    z.kind === 'province' ? d.alerts.zoneKindProvince : z.kind === 'pin' ? d.alerts.zoneKindPin : d.alerts.zoneKindLocation;

  return (
    <>
      <ScreenHeader
        title={d.alerts.title}
        right={
          <div className="flex items-center gap-2">
            {mounted && subscribed && (
              <span
                className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold text-ok-text"
                style={{ borderColor: mix(V.ok, 40), backgroundColor: mix(V.ok, 12) }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden />
                {d.alerts.enabledChip}
              </span>
            )}
            <LangButton />
          </div>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto pb-4 lg:mx-auto lg:w-full lg:max-w-2xl lg:border-x">
        {/* Soft-ask / explicación */}
        <div
          className="mx-screen mt-3 flex items-start gap-2.5 rounded-card border p-3"
          style={{ borderColor: mix(V.action, 40), backgroundColor: mix(V.action, 8) }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--action-text)" strokeWidth="1.5" className="mt-px flex-none" aria-hidden>
            <path d="M9 2a4 4 0 0 0-4 4c0 3-1.5 4.5-1.5 4.5h11S13 9 13 6a4 4 0 0 0-4-4Z" />
            <path d="M7.5 14a1.5 1.5 0 0 0 3 0" />
          </svg>
          <p className="text-[12px] leading-relaxed text-fg-body">{d.alerts.softAsk}</p>
        </div>

        <Link href="/legal" className="mx-screen mt-2 block text-[11px] font-semibold text-action-text">
          {legal.title} →
        </Link>

        {unsupported ? (
          <p className="mx-screen mt-3 rounded-card border border-strong px-3 py-2.5 text-[12px] text-fg-secondary">
            {d.alerts.unsupported}
          </p>
        ) : (
          <>
            {/* Interruptor principal de suscripción */}
            <div className="mx-screen mt-3">
              {mounted && subscribed ? (
                <div className="flex items-center justify-between rounded-card border border-strong px-3 py-2.5">
                  <span className="flex items-center gap-2 text-[12.5px] font-semibold text-ok-text">
                    <span className="h-2 w-2 rounded-full bg-ok" aria-hidden />
                    {d.alerts.enabled}
                  </span>
                  <button
                    type="button"
                    onClick={disable}
                    disabled={busy}
                    className="min-h-[36px] text-[12px] font-semibold text-fg-secondary underline-offset-2 hover:underline disabled:opacity-50"
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
              {perm === 'denied' && <p className="mt-2 text-[11px] leading-relaxed text-warn">{d.alerts.denied}</p>}
              {enableErr && perm !== 'denied' && (
                <p className="mt-2 text-[11px] leading-relaxed text-warn">{d.alerts.enableError}</p>
              )}
              {mounted && !subscribed && perm !== 'denied' && (
                <p className="mt-2 text-[11px] leading-relaxed text-fg-mute">{d.alerts.configurableFirst}</p>
              )}
            </div>

            {/* ── ZONAS VIGILADAS ─────────────────────────────────────────────── */}
            <div className="px-screen pb-1.5 pt-5">
              <span className={SECTION}>{d.alerts.zonesHeading}</span>
            </div>
            <div className="mx-screen space-y-2">
              {prefs.zones.length === 0 && (
                <p className="text-[11.5px] leading-relaxed text-fg-mute">{d.alerts.zonesEmpty}</p>
              )}
              {prefs.zones.map((z) => {
                const n = zoneCount(z);
                const dimmed = !z.enabled;
                return (
                  <div key={z.id} className="rounded-card border border-strong">
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                      <PinIcon active={z.enabled} />
                      <button
                        type="button"
                        onClick={() => setEditingId(editingId === z.id ? null : z.id)}
                        aria-expanded={editingId === z.id}
                        className={cn('min-w-0 flex-1 text-left', dimmed && 'opacity-60')}
                      >
                        <div className="truncate text-[12.5px] font-semibold text-fg-body">
                          {z.label}
                          {z.kind !== 'province' && (
                            <span className="ml-1.5 font-mono text-[10px] font-medium text-fg-mute">
                              {interpolate(d.alerts.zoneRadiusMeta, { n: z.radiusKm ?? DEFAULT_RADIUS_KM })}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-fg-mute">
                          {kindLabel(z)} ·{' '}
                          {!z.enabled
                            ? d.alerts.zonePaused
                            : n === 0
                              ? d.alerts.noFiresInZone
                              : n === 1
                                ? d.alerts.firesInZoneOne
                                : interpolate(d.alerts.firesInZoneMany, { n })}
                        </div>
                      </button>
                      <Toggle
                        checked={z.enabled}
                        onChange={(v) => updateZone(z.id, { enabled: v })}
                        label={interpolate(d.alerts.toggleZone, { zone: z.label })}
                      />
                    </div>

                    {editingId === z.id && (
                      <div className="border-t border-subtle px-3 py-3">
                        <label className="block text-[10px] font-semibold uppercase tracking-wide text-fg-mute">
                          {d.alerts.zoneName}
                        </label>
                        <input
                          type="text"
                          value={z.label}
                          maxLength={40}
                          onChange={(e) => updateZone(z.id, { label: e.target.value })}
                          className="mt-1 w-full rounded-btn border border-strong bg-transparent px-2.5 py-2 text-[12.5px] text-fg-body outline-none focus-visible:ring-2 focus-visible:ring-[var(--action)]"
                        />
                        {z.kind !== 'province' && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11.5px] text-fg-body">{d.alerts.radius}</span>
                              <span className="font-mono text-[11px] font-semibold text-fg">
                                {interpolate(d.alerts.zoneRadiusMeta, { n: z.radiusKm ?? DEFAULT_RADIUS_KM })}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={5}
                              max={100}
                              step={5}
                              value={z.radiusKm ?? DEFAULT_RADIUS_KM}
                              onChange={(e) => updateZone(z.id, { radiusKm: Number(e.target.value) })}
                              className="mt-1.5 w-full accent-[var(--action)]"
                              aria-label={d.alerts.radius}
                            />
                          </div>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => removeZone(z.id)}
                            className="min-h-[40px] text-[12px] font-semibold text-state-activo-text"
                          >
                            {d.alerts.zoneRemove}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="min-h-[40px] text-[12px] font-semibold text-action-text"
                          >
                            {d.alerts.done}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Añadir zona */}
              {prefs.zones.length < MAX_ZONES &&
                (adding ? (
                  <div className="rounded-card border border-dashed p-2" style={{ borderColor: mix(V.action, 45) }}>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={addLocationZone}
                        className="flex-1 rounded-btn border border-strong px-2 py-2.5 text-[12px] font-semibold text-fg-body"
                      >
                        {d.alerts.useLocation}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPicker(true);
                          setQuery('');
                        }}
                        className="flex-1 rounded-btn border border-strong px-2 py-2.5 text-[12px] font-semibold text-fg-body"
                      >
                        {d.alerts.chooseProvince}
                      </button>
                    </div>
                    {geoErr && <p className="mt-2 text-[11px] text-warn">{d.alerts.locationError}</p>}
                    <button
                      type="button"
                      onClick={() => {
                        setAdding(false);
                        setGeoErr(false);
                      }}
                      className="mt-1 min-h-[36px] text-[11px] font-semibold text-fg-mute"
                    >
                      {d.alerts.cancel}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="flex h-11 w-full items-center justify-center gap-1.5 rounded-card border border-dashed text-[12px] font-semibold text-action-text"
                    style={{ borderColor: mix(V.action, 45) }}
                  >
                    + {d.alerts.addZone}
                  </button>
                ))}
              {prefs.zones.length === 0 && (
                <p className="text-[10.5px] leading-relaxed text-fg-mute">{d.alerts.nationalNote}</p>
              )}
            </div>

            {/* ── AVISARME CUANDO ─────────────────────────────────────────────── */}
            <div className="px-screen pb-1 pt-5">
              <span className={SECTION}>{d.alerts.notifyHeading}</span>
            </div>
            <div className="mx-screen">
              <TypeRow
                icon={<span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: V.activo }} aria-hidden />}
                label={d.alerts.typeNewFire}
                checked={prefs.types.newFire}
                onChange={(v) => setType('newFire', v)}
              />
              <TypeRow
                icon={<span className="flex-none font-mono text-[9px] font-bold" style={{ color: V.controlado }} aria-hidden>N{prefs.minLevel}</span>}
                label={d.alerts.typeEscalation}
                checked={prefs.types.escalation}
                onChange={(v) => setType('escalation', v)}
              />
              <TypeRow
                icon={
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={V.error} strokeWidth="1.4" className="flex-none" aria-hidden>
                    <path d="M8 2 L14 13 H2 Z" />
                    <path d="M8 6.5 V9.5" />
                    <circle cx="8" cy="11.4" r=".5" fill={V.error} />
                  </svg>
                }
                label={d.alerts.typeEvacuation}
                checked
                locked
                note={d.alerts.evacuationLocked}
                onChange={() => {}}
              />
              <TypeRow
                icon={<span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: V.foco }} aria-hidden />}
                label={d.alerts.typeHotspots}
                hint={d.alerts.hotspotsHint}
                warn={prefs.types.hotspots && !hasGeoZone ? d.alerts.hotspotsNeedsZone : undefined}
                checked={prefs.types.hotspots}
                onChange={(v) => setType('hotspots', v)}
              />
            </div>

            {/* Umbral de nivel */}
            <div className="mx-screen mt-3 rounded-card border border-subtle px-3 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-fg-body">{d.alerts.thresholdHeading}</span>
                <div role="radiogroup" aria-label={d.alerts.thresholdHeading} className="flex gap-1">
                  {([0, 1, 2, 3] as const).map((lvl) => {
                    const on = prefs.minLevel === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => update({ ...prefs, minLevel: lvl })}
                        className={cn(
                          'grid h-11 w-11 place-items-center rounded-[6px] border font-mono text-[12px] font-semibold outline-none',
                          'focus-visible:ring-2 focus-visible:ring-[var(--action)]',
                          on ? 'text-action-text' : 'border-strong text-fg-mute',
                        )}
                        style={on ? { backgroundColor: mix(V.action, 16), borderColor: mix(V.action, 55) } : undefined}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-fg-mute">{d.alerts.thresholdHint}</p>
            </div>

            {/* ── SILENCIO ────────────────────────────────────────────────────── */}
            <div className="px-screen pb-1 pt-5">
              <span className={SECTION}>{d.alerts.silenceHeading}</span>
            </div>
            <div className="mx-screen rounded-card border border-subtle">
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--fg-secondary)" strokeWidth="1.3" className="flex-none" aria-hidden>
                  <path d="M13.5 9.5 A6 6 0 1 1 6.5 2.5 A4.8 4.8 0 0 0 13.5 9.5 Z" />
                </svg>
                <span className="flex-1 text-[12.5px] text-fg-body">
                  {d.alerts.doNotDisturb}
                  {prefs.quietHours && (
                    <span className="ml-1.5 font-mono text-[10.5px] text-fg-mute">
                      {minuteOfDayToHHMM(prefs.quietHours.start)}–{minuteOfDayToHHMM(prefs.quietHours.end)}
                    </span>
                  )}
                </span>
                <Toggle checked={!!prefs.quietHours} onChange={setQuiet} label={d.alerts.doNotDisturb} />
              </div>
              {prefs.quietHours && (
                <div className="flex items-center gap-4 border-t border-subtle px-3 py-2.5">
                  <label className="flex items-center gap-2 text-[11.5px] text-fg-body">
                    {d.alerts.quietFrom}
                    <input
                      type="time"
                      value={minuteOfDayToHHMM(prefs.quietHours.start)}
                      onChange={(e) => setQuietBound('start', e.target.value)}
                      className="rounded-btn border border-strong bg-transparent px-2 py-1.5 font-mono text-[12px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-[var(--action)]"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-[11.5px] text-fg-body">
                    {d.alerts.quietTo}
                    <input
                      type="time"
                      value={minuteOfDayToHHMM(prefs.quietHours.end)}
                      onChange={(e) => setQuietBound('end', e.target.value)}
                      className="rounded-btn border border-strong bg-transparent px-2 py-1.5 font-mono text-[12px] text-fg outline-none focus-visible:ring-2 focus-visible:ring-[var(--action)]"
                    />
                  </label>
                </div>
              )}
              <p className="border-t border-subtle px-3 py-2.5 text-[10.5px] leading-relaxed text-fg-mute">
                {d.alerts.quietNote.split('112')[0]}
                {d.alerts.quietNote.includes('112') && (
                  <span className="font-mono font-semibold text-state-activo-text">112</span>
                )}
              </p>
            </div>

            {/* Prueba */}
            {mounted && subscribed && (
              <div className="mx-screen mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={sendTest}
                  className="min-h-[40px] rounded-btn border border-strong px-3 py-2 text-[12px] font-semibold text-fg-secondary"
                >
                  {d.alerts.test}
                </button>
                {test === 'sent' && <span className="text-[11.5px] font-semibold text-ok-text">{d.alerts.testSent}</span>}
                {test === 'fail' && <span className="text-[11.5px] font-semibold text-warn">{d.alerts.testFail}</span>}
              </div>
            )}
          </>
        )}

        {/* ── Incendios que sigues (push-aware) ──────────────────────────────── */}
        {mounted && (
          <section className="mt-6">
            <div className="mx-screen flex items-center justify-between pb-1.5">
              <span className={SECTION}>{d.alerts.followingHeading}</span>
              {!unsupported && (
                <Toggle
                  checked={prefs.types.followed}
                  onChange={(v) => setType('followed', v)}
                  label={d.alerts.followedToggle}
                />
              )}
            </div>
            {followed.length === 0 ? (
              <p className="mx-screen text-[12px] leading-relaxed text-fg-mute">{d.alerts.followingEmpty}</p>
            ) : (
              <>
                <ul className="mx-screen">
                  {followed.map((f) => (
                    <li key={f.slug} className="flex items-center gap-2 border-t border-subtle py-2.5 last:border-b">
                      <Link href={`/f/${f.slug}`} className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-fg-body">
                        {f.name}
                        <span className="ml-1.5 font-mono text-[10px] text-fg-mute">{f.region}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => unfollowFire(f.slug)}
                        className="min-h-[40px] flex-none font-mono text-[10.5px] font-semibold text-action-text"
                      >
                        {d.alerts.unfollow}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mx-screen mt-2 text-[10.5px] leading-relaxed text-fg-mute">{d.alerts.followingNote}</p>
              </>
            )}
          </section>
        )}

        <p className="mx-screen mt-4 text-[10.5px] leading-relaxed text-fg-mute">{d.alerts.autoNote}</p>

        <p className="mx-screen mt-3 border-t pt-2.5 text-[10px] text-fg-mute">
          {d.disclaimer.short.split('112')[0]}
          <span className="font-mono font-semibold text-state-activo-text">112</span>
        </p>
      </div>

      {/* Selector de provincia (overlay modal) */}
      {picker && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={d.alerts.provincePickerTitle}
          className="fixed inset-0 z-50 flex flex-col bg-bg-base lg:mx-auto lg:max-w-2xl"
        >
          <div className="flex h-12 flex-none items-center gap-2 border-b px-screen">
            <span className="flex-1 text-[13px] font-bold text-fg">{d.alerts.provincePickerTitle}</span>
            <button
              type="button"
              onClick={() => setPicker(false)}
              className="min-h-[40px] px-2 text-[12px] font-semibold text-action-text"
            >
              {d.alerts.cancel}
            </button>
          </div>
          <div className="px-screen py-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={d.alerts.searchProvince}
              autoFocus
              className="w-full rounded-btn border border-strong bg-transparent px-3 py-2.5 text-[13px] text-fg-body outline-none focus-visible:ring-2 focus-visible:ring-[var(--action)]"
            />
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto px-screen pb-4">
            {filteredProvinces.map((p) => {
              const already = prefs.zones.some((z) => z.provinceSlug === p.slug);
              return (
                <li key={p.slug}>
                  <button
                    type="button"
                    disabled={already}
                    onClick={() => addProvinceZone(p.slug, p.name)}
                    className="flex min-h-[44px] w-full items-center gap-2 border-b border-subtle text-left text-[12.5px] text-fg-body disabled:opacity-40"
                  >
                    <span className="flex-1">
                      {p.name}
                      {p.region && <span className="ml-1.5 font-mono text-[10px] text-fg-mute">{p.region}</span>}
                    </span>
                    {already && <span className="font-mono text-[10px] text-ok-text">✓</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

/** Fila de tipo de alerta en «AVISARME CUANDO». Toda la fila es el interruptor. */
function TypeRow({
  icon,
  label,
  hint,
  note,
  warn,
  checked,
  onChange,
  locked,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  note?: string;
  warn?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  locked?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 border-t border-subtle py-1.5 first:border-t-0">
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] text-fg-body">
          {label}
          {note && <span className="ml-1.5 font-mono text-[9.5px] uppercase tracking-wide text-ok-text">{note}</span>}
        </span>
        {hint && <span className="block text-[10px] text-fg-mute">{hint}</span>}
        {warn && <span className="block text-[10px] text-warn">{warn}</span>}
      </span>
      <Toggle checked={checked} onChange={onChange} label={label} locked={locked} />
    </div>
  );
}
