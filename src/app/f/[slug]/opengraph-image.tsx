import { ImageResponse } from 'next/og';
import { resolveFire } from '@/lib/fires/resolve';
import { dark } from '@/lib/design/tokens';
import { formatNumber } from '@/lib/utils/format';

// Imagen OG por incendio: estado + superficie + hora estampados en servidor.
// Paleta oscura de la marca (misma que la UI). Se regenera con cada request.
export const alt = 'Ficha de incendio · Incendib';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const STATE_COLOR: Record<string, string> = {
  activo: dark.state.activo.base,
  controlado: dark.state.controlado.base,
  estabilizado: dark.state.estabilizado.base,
  extinguido: dark.state.extinguido.base,
};

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await resolveFire(slug);
  const fire = resolved?.fire ?? null;
  const historical = Boolean(resolved && resolved.origin !== 'live');

  // Superficie con el mismo criterio que la ficha: cifra oficial/EFFIS si la hay;
  // si no, la estimación por focos FIRMS (`hotspotHectares`), marcada «~»; si
  // tampoco, «sin dato». (Antes se estampaba `hectares` a secas → «0 ha».)
  const surfaceHa = fire ? (fire.hectares > 0 ? fire.hectares : (fire.hotspotHectares ?? 0)) : 0;
  const surfaceApprox = Boolean(
    fire && (fire.hectaresApprox || (fire.hectares === 0 && fire.hotspotHectares)),
  );

  const stamped = new Date().toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: dark.bg.base,
          color: dark.text.primary,
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: dark.state.activo.base,
              borderRadius: 14,
            }}
          />
          <span style={{ fontSize: 34, fontWeight: 700 }}>Incendib</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span style={{ fontSize: 30, color: dark.text.secondary }}>
            {fire
              ? [fire.municipality, fire.province].filter((x) => x && x !== '—').join(' · ') ||
                fire.region.replace(/\s*\(PT\)/, '')
              : 'Incendio'}
          </span>
          <span style={{ fontSize: 72, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {fire ? `Incendio de ${fire.name}` : 'No encontrado'}
          </span>
          {fire && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 12 }}>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  fontSize: 34,
                  fontWeight: 600,
                  // Histórico: color neutro (no rojo) para no leerse como activo en vivo.
                  color: historical ? dark.text.mute : (STATE_COLOR[fire.state] ?? dark.text.primary),
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: historical ? dark.text.mute : (STATE_COLOR[fire.state] ?? dark.text.primary),
                  }}
                />
                {fire.state.toUpperCase()}
              </span>
              <span style={{ fontSize: 34, color: dark.text.body }}>
                {surfaceHa > 0 ? `${surfaceApprox ? '~' : ''}${formatNumber(surfaceHa)} ha` : 'sin dato'}
              </span>
            </div>
          )}
        </div>

        <span style={{ fontSize: 24, color: dark.text.mute }}>
          {historical ? 'Histórico' : `Estado a las ${stamped}`} · No sustituye al 112
        </span>
      </div>
    ),
    { ...size },
  );
}
