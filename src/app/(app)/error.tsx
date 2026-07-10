'use client';

import { useEffect } from 'react';
import { useDict } from '@/components/i18n/I18nProvider';

/** Estado de error con marca (4c): si una pantalla del shell falla, se muestra
 * esto con opción de reintentar (en vez del error crudo). */
export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  const d = useDict();

  useEffect(() => {
    console.warn('[incendib] error de pantalla:', error);
  }, [error]);

  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-bg-base px-screen text-center">
      <div
        className="grid h-12 w-12 place-items-center rounded-full"
        style={{ backgroundColor: 'color-mix(in srgb, var(--state-activo) 12%, transparent)' }}
      >
        <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="var(--state-activo-text)" strokeWidth="1.4">
          <path d="M9 1.5 L16.5 15 H1.5 Z" />
          <path d="M9 6.5 V10" />
          <circle cx="9" cy="12.6" r=".5" fill="var(--state-activo-text)" />
        </svg>
      </div>
      <div>
        <h1 className="text-title font-bold text-fg">{d.status.errorTitle}</h1>
        <p className="mt-1 max-w-xs text-body text-fg-secondary">{d.status.errorBody}</p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-btn px-4 py-2 text-body font-semibold text-white"
        style={{ backgroundColor: 'var(--action)' }}
      >
        {d.status.retry}
      </button>
      <p className="max-w-xs font-mono text-meta text-fg-mute">{d.disclaimer.short}</p>
    </main>
  );
}
