import { cn } from '@/lib/utils/cn';
import { STATE_BASE_CLASS, type GlyphState } from '@/lib/fires/style';

/**
 * Glifo canónico de estado (5c): color + FORMA, nunca solo color.
 *   activo → círculo doble · controlado → rombo · estabilizado → cuadrado ·
 *   extinguido → anillo · foco → punto con glow (VIIRS/MODIS).
 * El color viene por `currentColor` (clase text-state-*). `outline` añade borde
 * blanco a las formas rellenas (marcadores sobre mapa claro).
 */
export function StateGlyph({
  state,
  size = 14,
  outline = false,
  glow = false,
  className,
}: {
  state: GlyphState;
  size?: number;
  outline?: boolean;
  glow?: boolean;
  className?: string;
}) {
  const ow = outline ? 1.3 : 0;
  const stroke = outline ? '#fff' : 'none';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      className={cn(STATE_BASE_CLASS[state], className)}
      style={glow ? { filter: 'drop-shadow(0 0 3px var(--state-foco))' } : undefined}
      aria-hidden
    >
      {state === 'activo' && (
        <>
          <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="7" cy="7" r="3" fill="currentColor" stroke={stroke} strokeWidth={ow} />
        </>
      )}
      {state === 'controlado' && (
        <rect
          x="3.2"
          y="3.2"
          width="7.6"
          height="7.6"
          transform="rotate(45 7 7)"
          fill="currentColor"
          stroke={stroke}
          strokeWidth={ow}
        />
      )}
      {state === 'estabilizado' && (
        <rect x="3" y="3" width="8" height="8" fill="currentColor" stroke={stroke} strokeWidth={ow} />
      )}
      {state === 'extinguido' && (
        <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
      )}
      {state === 'foco' && <circle cx="7" cy="7" r="4" fill="currentColor" />}
    </svg>
  );
}
