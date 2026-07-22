'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Fila de tarjetas deslizable (scroll-snap nativo, sin JS ni dependencia).
 * `role="region"` + `tabIndex` para que sea alcanzable por teclado: con foco,
 * las flechas izquierda/derecha desplazan el contenido de forma nativa del
 * navegador (comportamiento estándar de un contenedor con overflow y foco,
 * sin necesidad de manejar las teclas a mano). El asomo de la siguiente
 * tarjeta en el borde (padding en vez de recorte exacto) es la pista visual
 * de que hay más contenido a los lados.
 */
export function ScrollCarousel({
  children,
  ariaLabel,
  className,
}: {
  children: ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      className={cn('no-scrollbar flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-0.5', className)}
    >
      {children}
    </div>
  );
}
