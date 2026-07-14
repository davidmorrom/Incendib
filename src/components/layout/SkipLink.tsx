'use client';

import { useDict } from '@/components/i18n/I18nProvider';

/**
 * Enlace «saltar al contenido» (WCAG 2.4.1, Bypass Blocks). Es el primer elemento
 * tabulable de la página: oculto salvo cuando recibe foco de teclado, momento en
 * que aparece arriba a la izquierda. Lleva al landmark principal `#contenido`
 * (que es focusable con `tabIndex={-1}`), de modo que el usuario de teclado o
 * lector de pantalla puede saltarse la navegación repetida.
 */
export function SkipLink() {
  const d = useDict();
  return (
    <a
      href="#contenido"
      className="sr-only rounded-btn border border-default bg-bg-raised px-3 py-2 text-sm font-semibold text-fg focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50"
    >
      {d.a11y.skipToContent}
    </a>
  );
}
