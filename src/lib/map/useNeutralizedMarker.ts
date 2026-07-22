'use client';

import { useEffect, useRef } from 'react';

/**
 * MapLibre marca el `<div>` contenedor de cada marcador (react-map-gl) con
 * `role="button"` + `aria-label="Map marker"` + `tabindex` genéricos, en su
 * método `addTo()` (con guarda `hasAttribute() || setAttribute()`). Como nuestro
 * contenido YA es un `<button>` con su propio label, ese envoltorio es un botón
 * anidado redundante: el lector de pantalla anuncia "Map marker, botón" antes de
 * cada marcador, y con las burbujas de cúmulo (texto visible "3") dispara además
 * `label-content-name-mismatch` (WCAG 2.5.3).
 *
 * Devuelve un ref para el elemento raíz del contenido del marcador. Observa el
 * ancestro `.maplibregl-marker` y retira esos atributos siempre que aparezcan
 * (robusto ante el orden de efectos y ante cualquier re-aplicación de MapLibre).
 * El observador se desconecta al desmontar. El `<button>` interno queda como
 * único control accesible.
 */
export function useNeutralizedMarker<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const wrapper = ref.current?.closest('.maplibregl-marker');
    if (!(wrapper instanceof HTMLElement)) return;

    const strip = () => {
      for (const attr of ['role', 'aria-label', 'tabindex']) {
        if (wrapper.hasAttribute(attr)) wrapper.removeAttribute(attr);
      }
    };

    strip();
    const observer = new MutationObserver(strip);
    observer.observe(wrapper, {
      attributes: true,
      attributeFilter: ['role', 'aria-label', 'tabindex'],
    });
    return () => observer.disconnect();
  }, []);

  return ref;
}
