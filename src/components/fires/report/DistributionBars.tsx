'use client';

import { cn } from '@/lib/utils/cn';

export interface BarRow {
  key: string;
  label: string;
  value: number;
  /** Texto de la cifra (ya formateado, p. ej. "3 200 ha"). */
  valueText: string;
  /** Color CSS que CODIFICA el dato (var de token o color-mix). */
  color: string;
  /** Glifo opcional a la izquierda (p. ej. estado). */
  glyph?: React.ReactNode;
}

/**
 * Gráfico de barras horizontal sobrio y accesible. Las cifras se muestran como
 * TEXTO real (las lee el lector de pantalla); la barra es un apoyo visual
 * (`aria-hidden`). El color codifica el dato. Sin animación gratuita.
 */
export function DistributionBars({
  title,
  rows,
  emptyLabel,
  labelWidth = 'w-[92px]',
  className,
}: {
  title: string;
  rows: BarRow[];
  emptyLabel: string;
  labelWidth?: string;
  className?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <figure className={cn('min-w-0', className)}>
      <figcaption className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-mute">
        {title}
      </figcaption>
      {rows.length === 0 ? (
        <p className="text-[11px] text-fg-mute">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center gap-2">
              <span className={cn('flex flex-none items-center gap-1 truncate text-[11px] text-fg-secondary', labelWidth)}>
                {r.glyph}
                <span className="truncate">{r.label}</span>
              </span>
              <span className="relative h-3 flex-1 overflow-hidden rounded-[2px] bg-bg-sunken" aria-hidden>
                <span
                  className="absolute inset-y-0 left-0 rounded-[2px]"
                  style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, backgroundColor: r.color }}
                />
              </span>
              <span className="w-[64px] flex-none text-right font-mono text-[11px] font-semibold tabular-nums text-fg">
                {r.valueText}
              </span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
