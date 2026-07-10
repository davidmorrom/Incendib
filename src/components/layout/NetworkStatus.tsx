'use client';

import { useEffect, useState } from 'react';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { mix, V } from '@/lib/design/color';

/**
 * Estado de red global (4d/5b): banda de "sin conexión" (ámbar, datos en caché)
 * y toast de reconexión (verde). Usa aria-live para anunciarlo. La caída de red
 * nunca rompe la UI: se sigue mostrando el contenido cacheado.
 */
export function NetworkStatus() {
  const d = useDict();
  const setNetwork = useUIStore((s) => s.setNetwork);
  const [state, setState] = useState<'ok' | 'offline' | 'reconnected'>('ok');

  useEffect(() => {
    const offline = () => {
      setState('offline');
      setNetwork('offline');
    };
    const online = () => {
      setState((s) => (s === 'offline' ? 'reconnected' : s));
      setNetwork('ok');
    };
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    if (typeof navigator !== 'undefined' && !navigator.onLine) offline();
    return () => {
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, [setNetwork]);

  useEffect(() => {
    if (state !== 'reconnected') return;
    const t = setTimeout(() => setState('ok'), 3000);
    return () => clearTimeout(t);
  }, [state]);

  if (state === 'offline') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 px-screen py-1.5 text-[11px] font-semibold text-warn"
        style={{ backgroundColor: mix(V.warn, 16), borderBottom: `1px solid ${mix(V.warn, 40)}` }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-warn" aria-hidden />
        {d.status.offline}
      </div>
    );
  }

  if (state === 'reconnected') {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-[64px] z-50 flex justify-center px-screen">
        <div
          role="status"
          aria-live="polite"
          className="if-overlay flex items-center gap-2 rounded-full px-3.5 py-2 text-[11.5px] font-semibold text-ok-text"
          style={{ borderColor: mix(V.ok, 45) }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden />
          {d.status.online}
        </div>
      </div>
    );
  }

  return null;
}
