import { ImageResponse } from 'next/og';
import { getBoletin } from '@/lib/boletin/store';
import { dark } from '@/lib/design/tokens';
import { formatNumber } from '@/lib/utils/format';
import { formatPeriod } from '@/lib/boletin/format';

// Tarjeta OG de una edición del boletín: sirve de vista previa social y de
// descarga PNG. Paleta oscura de la marca. `store` lee del sistema de ficheros
// → runtime Node.
export const runtime = 'nodejs';
export const alt = 'Boletín semanal de incendios · Incendib';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function Kpi({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 58, fontWeight: 700, letterSpacing: '-0.02em' }}>{value}</span>
        {unit && <span style={{ fontSize: 26, color: dark.text.mute }}>{unit}</span>}
      </div>
      <span style={{ fontSize: 22, color: dark.text.secondary }}>{label}</span>
    </div>
  );
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = getBoletin(id);

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
        {/* Cabecera: marca + etiqueta */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 56, height: 56, background: dark.state.activo.base, borderRadius: 14 }} />
            <span style={{ fontSize: 34, fontWeight: 700 }}>Incendib</span>
          </div>
          <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '0.08em', color: dark.text.mute }}>
            BOLETÍN SEMANAL
          </span>
        </div>

        {/* Título de la edición */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 68, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {b ? `Semana ${b.isoWeek} · ${b.year}` : 'Boletín'}
          </span>
          <span style={{ fontSize: 30, color: dark.text.secondary }}>
            {b ? `España y Portugal · ${formatPeriod(b.periodStart, b.periodEnd, 'es')}` : 'No encontrado'}
          </span>
        </div>

        {/* KPIs de la semana */}
        {b && (
          <div style={{ display: 'flex', gap: 64 }}>
            <Kpi value={formatNumber(b.kpi.firmsWeek)} label="Detecciones FIRMS" />
            <Kpi value={formatNumber(b.kpi.activeFires)} label="En seguimiento" />
            <Kpi value={formatNumber(b.kpi.hectares)} unit="ha" label="Superficie" />
            <Kpi value={formatNumber(b.kpi.perimeters)} label="Perímetros EFFIS" />
          </div>
        )}

        {/* Pie: disclaimer */}
        <span style={{ fontSize: 22, color: dark.text.mute }}>
          Detección satelital ≠ incendio confirmado · No sustituye al 112
        </span>
      </div>
    ),
    { ...size },
  );
}
