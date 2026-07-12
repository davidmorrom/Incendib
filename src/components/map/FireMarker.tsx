'use client';

import { StateGlyph } from '@/components/ui/StateGlyph';
import { useDict } from '@/components/i18n/I18nProvider';
import { formatNumber } from '@/lib/utils/format';
import { STATE_LABEL_KEY } from '@/lib/fires/style';
import { mix, V } from '@/lib/design/color';
import { cn } from '@/lib/utils/cn';
import type { Fire } from '@/types/fire';

/**
 * Contenido interactivo de un marcador del mapa. Color + forma (StateGlyph) con
 * borde blanco en tema claro; anillo de pulso para activos de nivel ≥ 2 (se
 * vuelve estático con prefers-reduced-motion). Es un <button> con label
 * completo para teclado y lectores de pantalla.
 */
export function FireMarker({
  fire,
  outline,
  highlighted,
  onSelect,
  onHover,
}: {
  fire: Fire;
  outline: boolean;
  highlighted?: boolean;
  onSelect: (fire: Fire) => void;
  onHover?: (slug: string | null) => void;
}) {
  const d = useDict();
  const pulsing = fire.state === 'activo' && (fire.level ?? 0) >= 2;
  const stateLabel = d.states[STATE_LABEL_KEY[fire.state]];
  const label =
    `${fire.name} · ${stateLabel}` +
    (fire.level != null ? ` · nivel ${fire.level}` : '') +
    (fire.hectares > 0 ? ` · ${fire.hectaresApprox ? '~' : ''}${formatNumber(fire.hectares)} ha` : '');

  return (
    <button
      type="button"
      aria-label={label}
      title={fire.name}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(fire);
      }}
      onMouseEnter={() => onHover?.(fire.slug)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        'relative grid h-7 w-7 place-items-center rounded-full',
        highlighted && 'ring-2 ring-action-text ring-offset-0',
      )}
    >
      {pulsing && (
        <span
          aria-hidden
          className="absolute h-[16px] w-[16px] rounded-full animate-firepulse motion-reduce:animate-none motion-reduce:opacity-40"
          style={{ backgroundColor: mix(V.activo, 45) }}
        />
      )}
      <StateGlyph state={fire.state} size={highlighted ? 20 : 17} outline={outline} />
    </button>
  );
}
