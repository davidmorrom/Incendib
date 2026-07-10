/**
 * Helpers de color translúcido para estilos inline.
 *
 * Los tokens de Tailwind son `var(--…)` completos, por lo que el modificador de
 * opacidad de Tailwind (`bg-x/50`) NO funciona sobre ellos. Para derivar
 * variantes translúcidas usamos `color-mix`, que además sigue el tema (la var
 * cambia con claro/oscuro) sin duplicar tokens.
 */

/** Referencias a las variables CSS de tema (ver globals.css). */
export const V = {
  activo: 'var(--state-activo)',
  controlado: 'var(--state-controlado)',
  estabilizado: 'var(--state-estabilizado)',
  extinguido: 'var(--state-extinguido)',
  foco: 'var(--state-foco)',
  action: 'var(--action)',
  actionText: 'var(--action-text)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  error: 'var(--error-text)',
} as const;

/** `mix('var(--action)', 14)` → 14 % del color sobre transparente. */
export function mix(cssColor: string, pct: number): string {
  return `color-mix(in srgb, ${cssColor} ${pct}%, transparent)`;
}
