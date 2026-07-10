/**
 * Logo de marca: gota de retardante (no llama) en negativo sobre cuadrado rojo.
 * Radio 21 % del lado, gota ~⅓ central. Se adapta al tema (la gota usa el fondo
 * base). Ver especificación 12a.
 */
export function Logo({ size = 24 }: { size?: number }) {
  const drop = Math.round((size / 3) * 10) / 10;
  const radius = Math.round(size * 0.21 * 10) / 10;
  return (
    <div
      className="grid flex-none place-items-center bg-state-activo"
      style={{ width: size, height: size, borderRadius: radius }}
      aria-hidden
    >
      <div
        className="bg-bg-base"
        style={{ width: drop, height: drop, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)' }}
      />
    </div>
  );
}
