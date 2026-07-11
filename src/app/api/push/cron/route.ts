import { NextResponse } from 'next/server';
import { getFires } from '@/lib/data';
import { sendPush, pushConfigured, type PushPayload } from '@/lib/push/server';
import {
  storeConfigured,
  listSubscriptions,
  deleteSubscription,
  getLastSeen,
  setLastSeen,
  type AlertPrefs,
  type StoredSub,
} from '@/lib/push/store';
import { STATE_RANK } from '@/lib/fires/derive';
import type { Fire } from '@/types/fire';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';
export const dynamic = 'force-dynamic';

/** Firma del estado de un incendio, para detectar cambios entre ejecuciones. */
function signature(f: Fire): string {
  return `${f.state}|${f.level ?? ''}|${f.evacuation ? '1' : '0'}`;
}

/** ¿El incendio ha empeorado respecto a su firma anterior? */
function escalated(prev: string, now: Fire): boolean {
  const [pState, pLevel, pEvac] = prev.split('|');
  if (pEvac !== '1' && now.evacuation) return true; // aparece evacuación
  if (Number(now.level ?? -1) > Number(pLevel || -1)) return true; // sube de nivel
  if (STATE_RANK[now.state] < STATE_RANK[(pState as Fire['state']) ?? 'extinguido']) return true; // estado peor
  return false;
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const la1 = (a[1] * Math.PI) / 180;
  const la2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** ¿Este incendio encaja con las preferencias del suscriptor? */
function matches(f: Fire, prefs: AlertPrefs): boolean {
  const level = f.level ?? 0;
  const critical = !!f.evacuation || level >= 2;
  // Zona: si hay zona fijada, exigir cercanía; si no, toda la península/islas.
  if (prefs.zone) {
    const km = haversineKm(f.coordinates, [prefs.zone.lon, prefs.zone.lat]);
    if (km > prefs.radiusKm) return false;
  }
  if (f.evacuation) return true; // las evacuaciones siempre suenan
  if (prefs.silence && !critical) return false;
  return level >= prefs.minLevel;
}

function payloadFor(f: Fire): PushPayload {
  const where = [f.municipality, f.province].filter((x) => x && x !== '—').join(', ');
  const body = f.evacuation ? `${where} · ${f.evacuation}` : where || f.region;
  return {
    title: `${f.name}`,
    body,
    url: `/f/${f.slug}`,
    tag: `fire-${f.slug}`,
    severity: f.evacuation ? 'evacuation' : 'info',
  };
}

/**
 * /api/push/cron — comprueba incendios nuevos/agravados y envía alertas Web Push
 * a los suscriptores según sus preferencias. Pensado para un scheduler (Vercel
 * Cron usa GET; Upstash QStash usa POST por defecto → aceptamos ambos).
 * Protegido con CRON_SECRET si está definido.
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'no autorizado' }, { status: 401 });
  }
  if (!storeConfigured() || !pushConfigured()) {
    return NextResponse.json({ ok: false, reason: 'push o almacén no configurado' });
  }

  const fires = await getFires();
  const seen = await getLastSeen();
  const firstRun = Object.keys(seen).length === 0;

  const alerts = fires.filter((f) => {
    const prev = seen[f.slug];
    if (prev === undefined) return f.state !== 'extinguido'; // nuevo (no si ya extinto)
    return escalated(prev, f);
  });

  // Actualiza la línea base SIEMPRE (así el próximo ciclo compara contra el actual).
  await setLastSeen(Object.fromEntries(fires.map((f) => [f.slug, signature(f)])));

  if (firstRun) return NextResponse.json({ ok: true, baseline: fires.length });
  if (!alerts.length) return NextResponse.json({ ok: true, alerts: 0, sent: 0 });

  const subs: StoredSub[] = await listSubscriptions();
  let sent = 0;
  for (const f of alerts) {
    const payload = payloadFor(f);
    for (const s of subs) {
      if (!matches(f, s.prefs)) continue;
      const res = await sendPush(s.subscription, payload);
      if (res.ok) sent++;
      else if (res.status === 404 || res.status === 410) await deleteSubscription(s.subscription.endpoint);
    }
  }
  return NextResponse.json({ ok: true, alerts: alerts.length, subs: subs.length, sent });
}

export const GET = handle;
export const POST = handle;
