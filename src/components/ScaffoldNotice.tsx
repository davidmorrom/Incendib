import { DISCLAIMER_112 } from '@/lib/data/sources';

/**
 * Placeholder on-brand para las rutas aún no implementadas. Sirve para
 * verificar que el sistema de tokens (fondos, tipografía sans/mono, colores
 * de estado) está correctamente cableado. Se sustituirá por cada pantalla real.
 */
export function ScaffoldNotice({
  screen,
  canonicalId,
}: {
  screen: string;
  canonicalId?: string;
}) {
  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-bg-base px-screen text-center">

      <div className="grid h-11 w-11 place-items-center rounded-[10px] bg-state-activo">
        <span
          className="h-3 w-3 bg-bg-base"
          style={{ borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)' }}
          aria-hidden
        />
      </div>
      <div>
        <h1 className="font-sans text-title font-bold text-fg">Incendib</h1>
        <p className="mt-1 font-mono text-meta text-fg-mute">estructura lista · en construcción</p>
      </div>
      <div className="rounded-card border border-subtle bg-bg-raised px-4 py-3">
        <p className="font-sans text-body text-fg-secondary">
          Pantalla: <span className="font-semibold text-fg">{screen}</span>
        </p>
        {canonicalId && (
          <p className="mt-1 font-mono text-meta text-fg-mute">
            id canónico en mocks: {canonicalId}
          </p>
        )}
      </div>
      <p className="max-w-xs font-mono text-meta text-fg-mute">{DISCLAIMER_112}</p>
    </main>
  );
}
