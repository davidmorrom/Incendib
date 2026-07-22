'use client';

import { useNeutralizedMarker } from '@/lib/map/useNeutralizedMarker';

/**
 * Burbuja de cúmulo de incendios (varios incendios próximos colapsados). Es un
 * <button> accesible (≥32 px, cumple WCAG 2.5.8) que muestra el recuento y, al
 * pulsarlo, amplía para separarlos. El borde codifica la mayor gravedad presente
 * en el grupo (color = dato); el recuento va en mono. Ver useFireClusters.
 */
export function FireClusterMarker({
  count,
  color,
  label,
  onClick,
}: {
  count: number;
  /** Color (del token de estado) de la mayor gravedad del grupo. */
  color: string;
  label: string;
  onClick: () => void;
}) {
  const ref = useNeutralizedMarker<HTMLButtonElement>();
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="grid h-8 min-w-8 place-items-center rounded-full border-2 px-1.5 font-mono text-[11px] font-semibold text-fg"
      style={{
        borderColor: color,
        background: 'color-mix(in srgb, var(--bg-card) 92%, transparent)',
        boxShadow: '0 1px 5px rgba(0,0,0,0.22)',
      }}
    >
      {count}
    </button>
  );
}
