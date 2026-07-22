'use client';

import { memo } from 'react';
import { StateGlyph } from '@/components/ui/StateGlyph';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { formatNumber, timeAgo } from '@/lib/utils/format';
import { useNow } from '@/components/time/NowProvider';
import { cn } from '@/lib/utils/cn';
import { mix, V } from '@/lib/design/color';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { interpolate } from '@/lib/i18n';
import { STATE_LABEL_KEY } from '@/lib/fires/style';
import { PT_TEXT } from '@/lib/fires/labels';
import type { Fire } from '@/types/fire';

function subtitle(f: Fire): string {
  const region = f.region.replace(/\s*\(PT\)/, '');
  if (f.country === 'PT') {
    const st = f.ptState ? ` — ${PT_TEXT[f.ptState].toLowerCase()}` : '';
    return `${f.province} · ${region}${st}`;
  }
  return `${f.municipality} · ${f.province}`;
}

/**
 * Fila de incendio del sheet del mapa (2a). Toca → ficha.
 *
 * Memoizada: la home renderiza decenas de filas y `hoveredSlug` cambia con cada
 * movimiento del puntero sobre mapa/lista. Con `memo` y props estables (`fire`
 * mismo objeto, `onSelect`/`onHover` con `useCallback`, `highlighted` booleano),
 * solo re-renderizan las filas cuyo `highlighted` cambia, no todas — recorta el
 * coste de hit-test/reflow en interacción (v0.34.0). (El tic de reloj de 60 s
 * aún re-renderiza las filas vía `useNow`; extraer el `timeAgo` a un subnodo
 * queda como mejora futura.)
 */
export const FireRow = memo(function FireRow({
  fire,
  highlighted,
  onSelect,
  onHover,
}: {
  fire: Fire;
  highlighted?: boolean;
  onSelect: (f: Fire) => void;
  onHover?: (slug: string | null) => void;
}) {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);
  const now = useNow();
  const stateLabel = d.states[STATE_LABEL_KEY[fire.state]];

  return (
    <button
      type="button"
      onClick={() => onSelect(fire)}
      onMouseEnter={() => onHover?.(fire.slug)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        'flex w-full items-center gap-[10px] border-t border-subtle px-screen py-[9px] text-left',
        highlighted && 'border-l-2 border-l-action',
      )}
      style={highlighted ? { backgroundColor: mix(V.action, 7) } : undefined}
    >
      <StateGlyph state={fire.state} size={14} className="flex-none" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-row font-semibold text-fg">{fire.name}</span>
          {/* Estado en el nombre accesible: el glifo es aria-hidden (color+forma
              no llega a lectores de pantalla). */}
          <span className="sr-only">
            , {stateLabel}
            {fire.ptState && (
              <span lang="pt">
                {' '}
                ({PT_TEXT[fire.ptState]})
              </span>
            )}
          </span>
          <LevelBadge level={fire.level} country={fire.country} />
          {fire.satelliteConfirmed && (
            <span
              className="h-1.5 w-1.5 flex-none rounded-full bg-state-foco"
              style={{ boxShadow: '0 0 4px var(--state-foco)' }}
              title={interpolate(d.fire.satelliteConfirmed, { km: fire.hotspotKm ?? 0 })}
              aria-label={interpolate(d.fire.satelliteConfirmed, { km: fire.hotspotKm ?? 0 })}
            />
          )}
        </span>
        <span className="block truncate text-[10.5px] text-fg-mute">{subtitle(fire)}</span>
      </span>
      <span className="flex-none text-right">
        <span
          className="block font-mono text-[13px] font-semibold text-fg"
          title={!fire.hectares && fire.hotspotHectares ? d.fire.approxHotspot : undefined}
        >
          {fire.hectares > 0
            ? `${fire.hectaresApprox ? '~' : ''}${formatNumber(fire.hectares)} ha`
            : fire.hotspotHectares
              ? `≈${formatNumber(fire.hotspotHectares)} ha`
              : d.kpis.noData}
        </span>
        <span className="block font-mono text-[9.5px] text-fg-mute">
          {timeAgo(fire.updatedAt, now, locale)}
        </span>
      </span>
    </button>
  );
});
