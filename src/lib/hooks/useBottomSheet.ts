'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';

const isBrowser = typeof window !== 'undefined';
// useLayoutEffect avisa en SSR; en servidor no hay medición que hacer.
const useIsoLayoutEffect = isBrowser ? useLayoutEffect : useEffect;

/** Devuelve las alturas de anclaje (px), ascendentes, según la altura disponible. */
export type SnapResolver = (containerHeight: number) => number[];

export interface UseBottomSheetOptions {
  /** Resuelve los anclajes (px, ascendentes) a partir de la altura del contenedor. */
  getSnaps: SnapResolver;
  /** Índice de anclaje inicial (por defecto 0 = el más pequeño). */
  initialSnap?: number;
  /**
   * Si es `false` (p. ej. en escritorio, donde manda la rejilla), el hook no
   * toca estilos y limpia cualquier altura en línea que hubiera fijado.
   */
  enabled?: boolean;
}

/** Props que se reparten sobre el tirador (botón) de la hoja. */
export interface SheetGrabberProps {
  role: 'slider';
  tabIndex: 0;
  'aria-orientation': 'vertical';
  'aria-valuemin': number;
  'aria-valuemax': number;
  'aria-valuenow': number;
  onPointerDown: (e: PointerEvent) => void;
  onPointerMove: (e: PointerEvent) => void;
  onPointerUp: (e: PointerEvent) => void;
  onPointerCancel: (e: PointerEvent) => void;
  onKeyDown: (e: KeyboardEvent) => void;
  onDoubleClick: () => void;
  style: CSSProperties;
}

export interface UseBottomSheetReturn<C extends HTMLElement, S extends HTMLElement> {
  /** Ref del contenedor cuya altura define los anclajes (mapa + hoja). */
  containerRef: RefObject<C | null>;
  /** Ref del elemento de la hoja cuya altura controlamos. */
  sheetRef: RefObject<S | null>;
  /** Props a repartir sobre el tirador (ver SheetGrabber). */
  grabberProps: SheetGrabberProps;
  /** Índice de anclaje actual (0 = más pequeño). */
  snapIndex: number;
  /** Nº de anclajes disponibles. */
  snapCount: number;
}

/**
 * Hoja inferior arrastrable con anclajes. Pensada para el patrón mapa + hoja de
 * móvil: la hoja es `flex-none` con altura controlada y el mapa `flex-1`, de modo
 * que al encoger la hoja el mapa crece (y a la inversa) por puro CSS, sin re-render.
 *
 * El arrastre se hace de forma IMPERATIVA (se escribe `style.height` directamente
 * en cada `pointermove`), sin estado de React por frame: así el mapa —pesado— no
 * se vuelve a renderizar mientras se arrastra; solo se actualiza el estado al
 * soltar (para el anclaje y la semántica de teclado). Respeta
 * `prefers-reduced-motion` y es accesible por teclado (rol slider).
 */
export function useBottomSheet<
  C extends HTMLElement = HTMLDivElement,
  S extends HTMLElement = HTMLElement,
>({ getSnaps, initialSnap = 0, enabled = true }: UseBottomSheetOptions): UseBottomSheetReturn<C, S> {
  const containerRef = useRef<C | null>(null);
  const sheetRef = useRef<S | null>(null);
  const [containerH, setContainerH] = useState(0);
  const [snapIndex, setSnapIndex] = useState(initialSnap);
  // Sesión de arrastre en curso (imperativa). Se declara aquí arriba porque el
  // efecto de geometría también la consulta para no reposicionar a mitad de gesto.
  const drag = useRef<{ startY: number; startH: number } | null>(null);

  const snaps = useMemo(
    () => (containerH > 0 ? getSnaps(containerH) : []),
    [containerH, getSnaps],
  );
  const snapCount = snaps.length;
  const clampIndex = useCallback(
    (i: number) => Math.max(0, Math.min(i, Math.max(0, snapCount - 1))),
    [snapCount],
  );

  // Reconcilia el índice si el nº de anclajes se reduce (p. ej. rotación) para
  // que el teclado no "pierda" la primera pulsación (aria-valuenow ya se clampa).
  useEffect(() => {
    setSnapIndex((i) => Math.max(0, Math.min(i, Math.max(0, snapCount - 1))));
  }, [snapCount]);

  // ── Medición del contenedor disponible ────────────────────────────────────
  useIsoLayoutEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    // Medición SÍNCRONA inicial (en el propio layout-effect, antes del primer
    // paint): fija containerH ya en este commit para evitar un salto de altura
    // al montar. El observer solo cubre cambios posteriores (rotación, teclado…).
    const h0 = el.clientHeight;
    if (h0 > 0) setContainerH((prev) => (Math.abs(prev - h0) > 0.5 ? h0 : prev));
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height ?? 0;
      if (h > 0) setContainerH((prev) => (Math.abs(prev - h) > 0.5 ? h : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [enabled]);

  const prefersReduced = () =>
    isBrowser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const applyHeight = useCallback((px: number, animate: boolean) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition =
      animate && !prefersReduced() ? 'height 300ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    el.style.height = `${Math.round(px)}px`;
  }, []);

  const goToSnap = useCallback(
    (i: number, animate = true) => {
      if (!enabled || !snapCount) return;
      const idx = clampIndex(i);
      applyHeight(snaps[idx]!, animate);
      setSnapIndex(idx);
    },
    [enabled, snapCount, snaps, clampIndex, applyHeight],
  );

  // Al medir o cambiar el contenedor (rotación, teclado virtual…), fija sin
  // animar la altura del anclaje actual. En escritorio (o al deshabilitar) se
  // limpia la altura en línea para devolver el control a las clases CSS (`lg:`).
  useIsoLayoutEffect(() => {
    const el = sheetRef.current;
    if (!enabled) {
      if (el) {
        el.style.height = '';
        el.style.transition = '';
      }
      return;
    }
    if (!snapCount) return;
    // No reposicionar a mitad de un arrastre: un resize externo durante el gesto
    // (rotación, split-view, aviso del sistema) no debe apartar la hoja del dedo.
    if (drag.current) return;
    applyHeight(snaps[clampIndex(snapIndex)]!, false);
    // Solo depende de la geometría medida; snapIndex se aplica en sus handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, containerH, snapCount]);

  // ── Arrastre imperativo ────────────────────────────────────────────────────
  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (!enabled || !snapCount) return;
      const el = sheetRef.current;
      if (!el) return;
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      drag.current = { startY: e.clientY, startH: el.getBoundingClientRect().height };
      el.style.transition = 'none';
    },
    [enabled, snapCount],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const st = drag.current;
      const el = sheetRef.current;
      if (!st || !el || !snapCount) return;
      const min = snaps[0]!;
      const max = snaps[snapCount - 1]!;
      // Arrastrar hacia arriba (clientY menor) agranda la hoja.
      const next = Math.max(min, Math.min(max, st.startH + (st.startY - e.clientY)));
      el.style.height = `${Math.round(next)}px`;
    },
    [snaps, snapCount],
  );

  const endDrag = useCallback(
    (e: PointerEvent) => {
      const st = drag.current;
      const el = sheetRef.current;
      drag.current = null;
      if (!st || !el || !snapCount) return;
      (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
      const h = el.getBoundingClientRect().height;
      let nearest = 0;
      let best = Infinity;
      for (let i = 0; i < snapCount; i++) {
        const dist = Math.abs(snaps[i]! - h);
        if (dist < best) {
          best = dist;
          nearest = i;
        }
      }
      goToSnap(nearest, true);
    },
    [snaps, snapCount, goToSnap],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || !snapCount) return;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          goToSnap(snapIndex + 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          goToSnap(snapIndex - 1);
          break;
        case 'Home':
          // Contrato de slider (WAI-ARIA APG): Home = valor mínimo (hoja más
          // pequeña, index 0); End = valor máximo (hoja más grande).
          e.preventDefault();
          goToSnap(0);
          break;
        case 'End':
          e.preventDefault();
          goToSnap(snapCount - 1);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          goToSnap(snapIndex >= snapCount - 1 ? 0 : snapIndex + 1);
          break;
      }
    },
    [enabled, snapCount, snapIndex, goToSnap],
  );

  const onDoubleClick = useCallback(() => {
    if (!enabled || !snapCount) return;
    goToSnap(snapIndex >= snapCount - 1 ? 0 : snapIndex + 1);
  }, [enabled, snapCount, snapIndex, goToSnap]);

  const grabberProps: SheetGrabberProps = {
    role: 'slider',
    tabIndex: 0,
    'aria-orientation': 'vertical',
    'aria-valuemin': 0,
    'aria-valuemax': Math.max(0, snapCount - 1),
    'aria-valuenow': clampIndex(snapIndex),
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onKeyDown,
    onDoubleClick,
    style: { touchAction: 'none', cursor: 'ns-resize' },
  };

  return {
    containerRef,
    sheetRef,
    grabberProps,
    snapIndex: clampIndex(snapIndex),
    snapCount,
  };
}

/**
 * Normaliza una lista de anclajes propuestos (px) al contenedor disponible:
 * los recorta a `[min, containerH - minMap]`, los ordena de forma implícita
 * (se asume ascendente) y descarta los que quedan demasiado juntos, para que
 * siempre haya al menos un anclaje válido incluso en pantallas diminutas.
 */
export function sanitizeSnaps(
  values: number[],
  containerH: number,
  opts?: { min?: number; minMap?: number; gap?: number },
): number[] {
  const min = opts?.min ?? 112;
  const minMap = opts?.minMap ?? 72;
  const gap = opts?.gap ?? 40;
  const hi = Math.max(min, containerH - minMap);
  const out: number[] = [];
  for (const v of values) {
    const clamped = Math.max(min, Math.min(v, hi));
    const prev = out[out.length - 1];
    if (prev === undefined || clamped - prev > gap) out.push(clamped);
  }
  if (out.length === 0) out.push(Math.max(min, Math.min(Math.round(containerH * 0.5), hi)));
  return out;
}
