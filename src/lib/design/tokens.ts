/**
 * Incendib — Design tokens (fuente única de verdad)
 * ---------------------------------------------------
 * Valores literales tomados del handoff hifi (docs/HANDOFF.md). Estos hex se usan
 * en JS/canvas/mapa (marcadores MapLibre, imágenes OG, leyenda). El CSS
 * (globals.css) los refleja como variables para el theming en runtime y
 * Tailwind los expone como utilidades. NO duplicar valores: si cambia un
 * color, cambia aquí y en globals.css a la vez.
 *
 * Regla de oro del proyecto: el color SIEMPRE codifica un dato. Nunca es
 * decorativo. Los marcadores se distinguen por color + forma (nunca solo
 * color) para daltonismo y WCAG 2.2 AA.
 */

/** Estado operativo canónico de un incendio. */
export type FireState = 'activo' | 'controlado' | 'estabilizado' | 'extinguido';

/** Tema visual. Claro por defecto; oscuro (sala de control) opt-in del usuario. */
export type Theme = 'dark' | 'light';

// ── Paleta modo OSCURO (sala de control, opt-in) ─────────────────────────────
export const dark = {
  bg: {
    base: '#0C1117',
    raised: '#0F151C',
    sunken: '#0A0F14',
    card: '#121922',
  },
  text: {
    primary: '#E8EDF2',
    secondary: '#9AAAB8',
    /** Solo a ≥12px por contraste. */
    mute: '#66727E',
    body: '#C7D0D9',
  },
  state: {
    activo: { base: '#E5484D', text: '#FF8B8E' },
    controlado: { base: '#E8912D', text: '#F0B269' },
    estabilizado: { base: '#E5C337', text: '#E5C337' },
    extinguido: { base: '#6E7B87', text: '#9AAAB8' },
    /** Detección satelital, NO incendio confirmado. */
    focoSatelital: { base: '#FF6A3D', text: '#FFB59A' },
  },
  ui: {
    action: '#3D7DD8',
    actionText: '#7FA9E8',
    ok: '#3DBE7A',
    okText: '#5FD494',
    errorText: '#F09197',
    warn: '#E8B36B',
  },
  border: {
    subtle: 'rgba(255,255,255,0.07)',
    default: 'rgba(255,255,255,0.10)',
    strong: 'rgba(255,255,255,0.14)',
  },
} as const;

// ── Paleta modo CLARO (por defecto) ──────────────────────────────────────────
// Estados oscurecidos para contraste sobre fondo claro; marcadores con borde
// blanco 1.5px en el mapa.
//
// REGLA WCAG 2.2 AA (obligatoria): en cada estado, `base` es el color del
// marcador/gráfico (exige ≥3:1) y `text` es la variante LEGIBLE como texto, que
// DEBE mantener ≥4.5:1 sobre las superficies claras (raised #FFFFFF, base
// #F4F2EC y sunken/map #EAE7DD). No dejar `text` = `base` sin verificar el ratio
// (bug corregido en v0.34.0: foco/controlado/estabilizado/extinguido-text y warn
// se habían quedado iguales al marcador y fallaban AA). Hay un test que lo
// comprueba: src/lib/design/__tests__/contrast.test.ts.
export const light = {
  bg: {
    base: '#F4F2EC',
    raised: '#FFFFFF',
    sunken: '#EAE7DD',
    card: '#FFFFFF',
    map: '#EAE7DD',
  },
  text: {
    primary: '#1C222A',
    // #5C6470: contraste AA (≥4.5:1) sobre fondos claros (base #F4F2EC 5.34:1,
    // sunken/map #EAE7DD 4.83:1). Antes #6B7480 (4.23:1) no cumplía.
    secondary: '#5C6470',
    mute: '#5C6470',
    body: '#1C222A',
  },
  state: {
    activo: { base: '#C1272D', text: '#C1272D' }, // text 5.84:1 sobre blanco (AA)
    controlado: { base: '#C4761B', text: '#925609' }, // text 4.77:1 sobre sunken (AA)
    estabilizado: { base: '#A98F12', text: '#776608' }, // text 4.60:1 sobre sunken (AA)
    extinguido: { base: '#6E7B87', text: '#5F6874' }, // text 4.56:1 sobre sunken (AA)
    focoSatelital: { base: '#D9531E', text: '#B23F0E' }, // text 4.70:1 sobre sunken (AA)
  },
  ui: {
    action: '#2A5FA8',
    actionText: '#2A5FA8',
    ok: '#2C9A61',
    okText: '#1F7245', // 4.78:1 sobre sunken (AA); base #2C9A61 solo para puntos/gráficos
    errorText: '#C1272D',
    warn: '#8A5A12', // 4.78:1 sobre sunken (AA); usado como texto y como tinte mix()
  },
  border: {
    subtle: 'rgba(0,0,0,0.08)',
    default: 'rgba(0,0,0,0.12)',
    strong: 'rgba(0,0,0,0.18)',
  },
  /** Borde blanco de marcadores sobre el mapa claro. */
  markerOutline: '1.5px solid #FFFFFF',
} as const;

/**
 * Especificación de forma del marcador por estado.
 * color + forma → nunca solo color. Usado por el mapa, la leyenda y las filas.
 */
export const markerShape: Record<FireState, {
  shape: 'circle' | 'diamond' | 'square' | 'ring';
  radius: string;
  transform: string;
  glow: boolean;
}> = {
  activo: { shape: 'circle', radius: '50%', transform: 'none', glow: true },
  controlado: { shape: 'diamond', radius: '0', transform: 'rotate(45deg)', glow: false },
  estabilizado: { shape: 'square', radius: '0', transform: 'none', glow: false },
  extinguido: { shape: 'ring', radius: '50%', transform: 'none', glow: false },
};

// ── Tipografía ───────────────────────────────────────────────────────────────
export const typography = {
  // Familias resueltas por next/font como variables CSS (ver layout.tsx).
  sans: 'var(--font-sans)', // IBM Plex Sans — UI
  mono: 'var(--font-mono)', // IBM Plex Mono — cifras, timestamps, coordenadas
  scale: {
    kpi: { size: 28, weight: 600, family: 'mono' },
    title: { size: 16, weight: 700, family: 'sans' }, // 15–17
    row: { size: 12.5, weight: 600, family: 'sans' },
    body: { size: 12.5, weight: 400, family: 'sans' }, // 12–12.5
    sectionLabel: { size: 9.5, weight: 600, family: 'mono', tracking: '0.12em', upper: true },
    meta: { size: 10, weight: 500, family: 'mono' },
  },
} as const;

// ── Espaciado y forma ─────────────────────────────────────────────────────────
export const spacing = {
  base: 4,
  screenPadding: 14,
  radius: {
    chip: 4,
    card: 8, // 6–9
    button: 8,
  },
  /** Mínimo táctil accesible. */
  hitTarget: 44,
} as const;

// ── Animación ──────────────────────────────────────────────────────────────────
// Todas se desactivan con prefers-reduced-motion (ver globals.css).
export const motion = {
  pulse: 'ifPulse 1.8s ease-out infinite', // scale 1→2.4, opacity .55→0
  shimmer: 'ifShimmer 1.5s ease-in-out infinite', // 1.4–1.6s
  spin: 'ifSpin 0.8s linear infinite',
} as const;

/** Devuelve la paleta de estados según el tema (para el mapa y la leyenda). */
export function statePalette(theme: Theme) {
  return theme === 'light' ? light.state : dark.state;
}
