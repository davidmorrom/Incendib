'use client';

import { useEffect, useState } from 'react';
import { useUIStore } from '@/lib/store';
import { mix, V } from '@/lib/design/color';
import { bannerText, shouldShowBanner, type SiteBanner as SiteBannerData } from '@/lib/overrides/store';

/**
 * Banner global de aviso que el panel privado publica en Upstash (nivel + i18n +
 * vigencia). Banda en el flujo (empuja el contenido, no lo tapa), con `aria-live`.
 * El color codifica el nivel (info/aviso/crítico), no decora. Descartable por el
 * usuario (recordado por `updatedAt`, de modo que un banner nuevo reaparece). Nunca
 * sustituye ni oculta el disclaimer 112. Si no hay banner activo, no renderiza nada.
 */
const LEVEL_COLOR: Record<SiteBannerData['level'], string> = {
  info: V.action,
  warn: V.warn,
  critical: V.activo,
};

const DISMISS_KEY = 'incendib-banner-dismissed';

export function SiteBanner({ banner }: { banner: SiteBannerData | null }) {
  const locale = useUIStore((s) => s.locale);
  // null en SSR y en el primer render de cliente (coincide con el servidor: se muestra
  // si está activo); tras montar se lee el descarte de localStorage y puede ocultarse.
  const [dismissedValue, setDismissedValue] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDismissedValue(localStorage.getItem(DISMISS_KEY));
    } catch {
      /* almacenamiento no disponible */
    }
  }, []);

  if (!shouldShowBanner(banner, dismissedValue)) return null;
  const b = banner!;
  const color = LEVEL_COLOR[b.level];
  const text = bannerText(b, locale);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(b.updatedAt));
    } catch {
      /* noop */
    }
    setDismissedValue(String(b.updatedAt));
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 px-screen py-2 text-[12.5px] text-fg print:hidden"
      style={{ backgroundColor: mix(color, 14), borderBottom: `1px solid ${mix(color, 40)}` }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {b.href ? (
        <a href={b.href} className="min-w-0 flex-1 font-medium underline-offset-2 hover:underline">
          {text}
        </a>
      ) : (
        <span className="min-w-0 flex-1 font-medium">{text}</span>
      )}
      {b.dismissible && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Descartar aviso"
          className="shrink-0 rounded px-1.5 text-fg-secondary hover:text-fg"
        >
          <span aria-hidden>×</span>
        </button>
      )}
    </div>
  );
}
