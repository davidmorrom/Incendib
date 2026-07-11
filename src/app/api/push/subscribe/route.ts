import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * POST /api/push/subscribe — registra una suscripción Web Push y sus preferencias.
 *
 * De momento valida y confirma. La persistencia de suscripciones (para enviar
 * alertas automáticas cuando aparece un incendio en la zona del usuario) requiere
 * un almacén (KV/Redis o Blob) + un cron; es el siguiente paso de esta feature.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { subscription?: { endpoint?: string } };
    if (!body?.subscription?.endpoint) {
      return NextResponse.json({ ok: false, error: 'suscripción no válida' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
