import { ImageResponse } from 'next/og';
import { listBoletines } from '@/lib/boletin/store';
import { dark } from '@/lib/design/tokens';
import { formatNumber } from '@/lib/utils/format';

// Tarjeta OG del índice de boletines (archivo). `store` lee del FS → runtime Node.
export const runtime = 'nodejs';
export const alt = 'Boletines semanales de incendios · Incendib';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  const editions = listBoletines();
  const latest = editions[0];

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
          <div style={{ width: 56, height: 56, background: dark.state.activo.base, borderRadius: 14 }} />
          <span style={{ fontSize: 34, fontWeight: 700 }}>Incendib</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontSize: 72, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Boletines semanales
          </span>
          <span style={{ fontSize: 30, color: dark.text.secondary }}>
            Situación de incendios en España y Portugal · archivo consultable y citable
          </span>
          {latest && (
            <span style={{ fontSize: 26, color: dark.text.mute, marginTop: 8 }}>
              {formatNumber(editions.length)}{' '}
              {editions.length === 1 ? 'edición publicada' : 'ediciones publicadas'} · última: semana{' '}
              {latest.isoWeek} de {latest.year}
            </span>
          )}
        </div>

        <span style={{ fontSize: 22, color: dark.text.mute }}>
          Detección satelital ≠ incendio confirmado · No sustituye al 112
        </span>
      </div>
    ),
    { ...size },
  );
}
