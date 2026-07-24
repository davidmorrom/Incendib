'use client';

import { useEffect, useLayoutEffect, useState } from 'react';

const isBrowser = typeof window !== 'undefined';
// useLayoutEffect avisa en SSR; en servidor no hay media query que resolver.
const useIsoLayoutEffect = isBrowser ? useLayoutEffect : useEffect;

/**
 * Devuelve si una media query se cumple, reactiva a los cambios de tamaño.
 * En SSR/primer render devuelve `false` (no hay `window`): así el HTML del
 * servidor y el primer render de cliente coinciden y no hay desajuste de
 * hidratación. El valor real se resuelve en un layout-effect (antes del primer
 * paint tras montar), de modo que quien dependa de él —p. ej. la altura de una
 * hoja arrastrable— se ajuste sin un salto de layout visible.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useIsoLayoutEffect(() => {
    if (!isBrowser || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
