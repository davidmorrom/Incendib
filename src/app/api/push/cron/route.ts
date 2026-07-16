import { NextResponse } from 'next/server';
import { getFires, getHotspots } from '@/lib/data';
import { sendPush, pushConfigured, type PushPayload } from '@/lib/push/server';
import {
  storeConfigured,
  listSubscriptions,
  deleteSubscription,
  getLastSeen,
  setLastSeen,
  getHotspotSeen,
  setHotspotSeen,
  type StoredSub,
} from '@/lib/push/store';
import {
  decideFireAlert,
  hotspotMatches,
  hotspotCellId,
  anyoneWantsHotspots,
  haversineKm,
  type FireEvent,
} from '@/lib/alerts/match';
import { recordFireHistory } from '@/lib/history/store';
import { STATE_RANK } from '@/lib/fires/derive';
import type { Fire, Hotspot } from '@/types/fire';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';
export const dynamic = 'force-dynamic';

/**
 * Cooldown de re-aviso por celda de foco satelital: evita re-notificar la misma
 * detección persistente en cada pasada. El cooldown es GLOBAL por celda (no por
 * suscriptor): con solaparse dos usuarios en la misma celda, el aviso se emite una
 * vez por celda cada ventana. Trade-off aceptado para una función opt-in y de nicho
 * (evita un estado por (suscriptor,celda) que crecería sin cota).
 */
const HOTSPOT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 h
/** Ventana de retención del registro de focos avisados (poda). */
const HOTSPOT_RETENTION_MS = 48 * 60 * 60 * 1000; // 48 h
const HOTSPOT_SEEN_CAP = 1000;
/** Un foco a ≤ esta distancia de un incendio confirmado ya está «explicado». */
const HOTSPOT_NEAR_FIRE_KM = 5;

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

function payloadFor(f: Fire, reason: string): PushPayload {
  const where = [f.municipality, f.province].filter((x) => x && x !== '—').join(', ');
  const body = f.evacuation ? `${where} · ${f.evacuation}` : where || f.region;
  return {
    title: f.name,
    body,
    url: `/f/${f.slug}`,
    tag: `fire-${f.slug}`,
    severity: reason === 'evacuation' ? 'evacuation' : 'info',
  };
}

/** Texto localizado del aviso de foco satelital (fallback a ES). */
const HOTSPOT_TEXT: Record<'es' | 'pt' | 'en', { title: string; body: string }> = {
  es: {
    title: 'Foco satelital sin confirmar',
    body: 'Detección térmica cerca de una de tus zonas. No es un incendio confirmado; puede ser quema agrícola o falso positivo.',
  },
  pt: {
    title: 'Foco de satélite não confirmado',
    body: 'Deteção térmica perto de uma das tuas zonas. Não é um incêndio confirmado; pode ser queima agrícola ou falso positivo.',
  },
  en: {
    title: 'Unconfirmed satellite hotspot',
    body: 'Thermal detection near one of your zones. Not a confirmed fire; may be an agricultural burn or false positive.',
  },
};

/** Payload de foco satelital: SIEMPRE con el caveat «sin confirmar» (CLAUDE.md). */
function hotspotPayload(h: Hotspot, locale: 'es' | 'pt' | 'en' | undefined): PushPayload {
  const t = HOTSPOT_TEXT[locale ?? 'es'] ?? HOTSPOT_TEXT.es;
  return {
    title: t.title,
    body: t.body,
    url: '/',
    tag: `hotspot-${hotspotCellId(h.coordinates)}`,
    severity: 'info',
  };
}

/**
 * /api/push/cron — comprueba incendios nuevos/agravados (y focos satelitales para
 * quien los pide) y envía alertas Web Push a los suscriptores según sus
 * preferencias. Pensado para un scheduler (Vercel Cron usa GET; Upstash QStash usa
 * POST → aceptamos ambos). Protegido con CRON_SECRET si está definido.
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
  // Registra el histórico de cambios (nivel, medios) para el timeline de la ficha.
  await recordFireHistory(fires, new Date().toISOString());
  const seen = await getLastSeen();
  const firstRun = Object.keys(seen).length === 0;

  // Cada alerta lleva su tipo de evento para cruzarlo con los toggles del suscriptor.
  const alerts: { fire: Fire; event: FireEvent }[] = [];
  for (const f of fires) {
    const prev = seen[f.slug];
    if (prev === undefined) {
      if (f.state !== 'extinguido') alerts.push({ fire: f, event: 'new' }); // nuevo (no si ya extinto)
    } else if (escalated(prev, f)) {
      alerts.push({ fire: f, event: 'escalated' });
    }
  }

  // Actualiza la línea base SIEMPRE (así el próximo ciclo compara contra el actual).
  await setLastSeen(Object.fromEntries(fires.map((f) => [f.slug, signature(f)])));

  if (firstRun) return NextResponse.json({ ok: true, baseline: fires.length });

  const subs: StoredSub[] = await listSubscriptions();
  const now = new Date();
  let sent = 0;

  // ── Incendios ────────────────────────────────────────────────────────────────
  for (const { fire, event } of alerts) {
    for (const s of subs) {
      let decision: { send: boolean; reason: string | null };
      try {
        decision = decideFireAlert(event, fire, s.prefs, now);
      } catch {
        continue; // una pref corrupta no debe tumbar el ciclo para el resto
      }
      if (!decision.send) continue;
      const res = await sendPush(s.subscription, payloadFor(fire, decision.reason ?? 'info'));
      if (res.ok) sent++;
      else if (res.status === 404 || res.status === 410) await deleteSubscription(s.subscription.endpoint);
    }
  }

  // ── Focos satelitales (opt-in, coste acotado) ─────────────────────────────────
  let hotspotsSent = 0;
  if (anyoneWantsHotspots(subs.map((s) => s.prefs))) {
    try {
      const hotspots = await getHotspots();
      const hseen = await getHotspotSeen();
      const next: Record<string, number> = {};
      // Conserva el histórico reciente (poda por retención) para respetar el cooldown.
      for (const [cell, ts] of Object.entries(hseen)) {
        if (now.getTime() - ts < HOTSPOT_RETENTION_MS) next[cell] = ts;
      }
      for (const h of hotspots) {
        const cell = hotspotCellId(h.coordinates);
        // Ya avisado hace poco → cooldown.
        if (next[cell] && now.getTime() - next[cell] < HOTSPOT_COOLDOWN_MS) continue;
        // Explicado por un incendio confirmado cercano → no dupliques el fenómeno.
        if (fires.some((f) => haversineKm(h.coordinates, f.coordinates) <= HOTSPOT_NEAR_FIRE_KM)) continue;

        let matchedAny = false;
        for (const s of subs) {
          let ok = false;
          try {
            ok = hotspotMatches(h, s.prefs, now);
          } catch {
            ok = false;
          }
          if (!ok) continue;
          matchedAny = true;
          const res = await sendPush(s.subscription, hotspotPayload(h, s.prefs.locale));
          if (res.ok) hotspotsSent++;
          else if (res.status === 404 || res.status === 410) await deleteSubscription(s.subscription.endpoint);
        }
        if (matchedAny) next[cell] = now.getTime();
      }
      // Acota el tamaño del registro por si se dispara el volumen (defensivo).
      const capped = Object.entries(next)
        .sort((a, b) => b[1] - a[1])
        .slice(0, HOTSPOT_SEEN_CAP);
      await setHotspotSeen(Object.fromEntries(capped));
    } catch {
      /* un fallo del feed satelital no debe afectar a las alertas de incendio */
    }
  }

  return NextResponse.json({
    ok: true,
    alerts: alerts.length,
    subs: subs.length,
    sent,
    hotspotsSent,
  });
}

export const GET = handle;
export const POST = handle;
