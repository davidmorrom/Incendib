'use client';

import { useEffect, useState } from 'react';
import { useUIStore } from '@/lib/store';
import { mix, V } from '@/lib/design/color';
import {
  bannerDismissKey,
  bannerText,
  shouldShowBanner,
  sortBanners,
  type SiteBanner as SiteBannerData,
} from '@/lib/overrides/store';

/**
 * Pila de banners globales que el panel privado publica en Upstash (nivel + i18n +
 * vigencia). Cada banda va en el flujo (empuja el contenido, no lo tapa), con `aria-live`.
 * El color codifica el nivel (info/aviso/crítico), no decora. Se apilan por gravedad
 * (crítico arriba). Cada banner es descartable por separado (recordado por su `id`+`updatedAt`,
 * de modo que un banner nuevo o editado reaparece). Nunca sustituyen ni ocultan el disclaimer
 * 112. Si no hay ningún banner activo/visible, no renderiza nada.
 */
const LEVEL_COLOR: Record<SiteBannerData['level'], string> = {
  info: V.action,
  warn: V.warn,
  critical: V.activo,
};

export function SiteBanner({ banners }: { banners: SiteBannerData[] }) {
  const locale = useUIStore((s) => s.locale);
  // Mapa id → valor descartado. Vacío en SSR y en el primer render de cliente (coincide con el
  // servidor: se muestran los activos); tras montar se lee el descarte de localStorage.
  const [dismissed, setDismissed] = useState<Record<string, string | null>>({});

  useEffect(() => {
    try {
      const map: Record<string, string | null> = {};
      for (const b of banners) map[b.id] = localStorage.getItem(bannerDismissKey(b.id));
      setDismissed(map);
    } catch {
      /* almacenamiento no disponible */
    }
  }, [banners]);

  const visible = sortBanners(banners.filter((b) => shouldShowBanner(b, dismissed[b.id] ?? null)));
  if (!visible.length) return null;

  const dismiss = (b: SiteBannerData) => {
    try {
      localStorage.setItem(bannerDismissKey(b.id), String(b.updatedAt));
    } catch {
      /* noop */
    }
    setDismissed((d) => ({ ...d, [b.id]: String(b.updatedAt) }));
  };

  return (
    <div role="status" aria-live="polite" className="print:hidden">
      {visible.map((b) => {
        const color = LEVEL_COLOR[b.level];
        const text = bannerText(b, locale);
        return (
          <div
            key={b.id}
            className="flex items-center gap-2 px-screen py-2 text-[12.5px] text-fg"
            style={{ backgroundColor: mix(color, 14), borderBottom: `1px solid ${mix(color, 40)}` }}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            {b.href ? (
              <a
                href={b.href}
                className="min-w-0 flex-1 font-medium underline-offset-2 hover:underline"
              >
                {text}
              </a>
            ) : (
              <span className="min-w-0 flex-1 font-medium">{text}</span>
            )}
            {b.dismissible && (
              <button
                type="button"
                onClick={() => dismiss(b)}
                aria-label="Descartar aviso"
                className="shrink-0 rounded px-1.5 text-fg-secondary hover:text-fg"
              >
                <span aria-hidden>×</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
