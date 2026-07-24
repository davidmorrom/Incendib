'use client';

import { useDict } from '@/components/i18n/I18nProvider';
import { cn } from '@/lib/utils/cn';
import type { SheetGrabberProps } from '@/lib/hooks/useBottomSheet';

/**
 * Tirador de una hoja inferior arrastrable. Es un botón real (foco y teclado),
 * con área de toque ≥ 28 px (WCAG 2.5.8) alrededor de la barrita visible. Las
 * props de interacción y ARIA las provee `useBottomSheet` (`grabberProps`).
 *
 * Como el valor del slider es un índice de anclaje sin unidad, añadimos un
 * `aria-valuetext` localizado (asomo/medio/desplegado) para que los lectores de
 * pantalla anuncien el estado real de la hoja, no un entero abstracto.
 */
export function SheetGrabber({
  label,
  className,
  ...props
}: SheetGrabberProps & { label: string; className?: string }) {
  const d = useDict();
  const now = props['aria-valuenow'];
  const max = props['aria-valuemax'];
  const valueText =
    max <= 0
      ? undefined
      : now <= 0
        ? d.map.sheetHeightMin
        : now >= max
          ? d.map.sheetHeightMax
          : d.map.sheetHeightMid;

  // aria-valuetext se pasa dentro del spread (junto a role="slider" y el resto de
  // aria del slider) para que la semántica sea coherente: el rol real en runtime
  // es slider, no el botón implícito.
  const sliderProps = { ...props, 'aria-valuetext': valueText };

  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'group mx-auto flex h-7 w-full max-w-[128px] flex-none select-none items-center justify-center',
        className,
      )}
      {...sliderProps}
    >
      <span
        className="h-1 w-9 rounded-full transition-[width,background-color] group-hover:w-11 group-active:w-11"
        style={{ background: 'var(--border-strong)' }}
        aria-hidden
      />
    </button>
  );
}
