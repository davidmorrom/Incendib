/**
 * "Ahora" de referencia. En modo mock es un instante FIJO (el de los mocks,
 * 2026-07-10 14:32 CEST) para que los tiempos relativos coincidan con el diseño
 * y sean deterministas. En modo live usa el reloj real.
 *
 * IMPORTANTE: no llamar a `getNow()` durante el render de componentes cliente en
 * modo live (Date.now() difiere entre servidor y cliente → desajuste de
 * hidratación). El servidor lo calcula una vez y lo inyecta vía `NowProvider`;
 * los componentes leen el "ahora" con `useNow()` y formatean con
 * `timeAgo`/`elapsedShort`/`formatClock` (src/lib/utils/format.ts).
 *
 * Nota: se lee `NEXT_PUBLIC_DATA_MODE` directamente (no vía `@/lib/data`) para
 * no arrastrar la capa de datos (mock/adaptadores) al bundle de cliente a través
 * de NowProvider.
 */
export const MOCK_NOW = Date.parse('2026-07-10T14:32:00+02:00');

/** Semilla de "ahora" para el servidor (root layout → NowProvider). */
export function getNow(): number {
  return process.env.NEXT_PUBLIC_DATA_MODE === 'live' ? Date.now() : MOCK_NOW;
}
