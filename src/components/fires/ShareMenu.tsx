'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useDict } from '@/components/i18n/I18nProvider';
import { interpolate } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import type { Fire } from '@/types/fire';

/**
 * Menú de compartir de la ficha. Un popover sobrio (monocromo, sin gradiente de
 * marca ni acentos de color: «el color codifica dato, nunca decora») con tres
 * salidas:
 *  1. Historia de Instagram → genera la imagen vertical (/f/[slug]/story) y la
 *     comparte como fichero (Web Share API nivel 2); en escritorio la descarga.
 *  2. Compartir enlace… (Web Share nivel 1) — solo si el dispositivo lo soporta.
 *  3. Copiar enlace (portapapeles).
 *
 * Se usa en los dos disparadores de la ficha: el icono de la cabecera
 * (`variant="icon"`, abre hacia abajo) y el botón de la barra de acciones
 * (`variant="button"`, abre hacia arriba). El padre le pasa `key={fire.slug}`
 * para remontarlo al cambiar de incendio (así la imagen precargada nunca es la
 * del incendio anterior).
 *
 * No es un `role="menu"` APG (sin navegación por flechas): es un popover de
 * botones normales navegables con Tab, con foco inicial, cierre por Escape/clic
 * fuera y retorno de foco al disparador.
 */
export function ShareMenu({
  fire,
  variant,
  className,
}: {
  fire: Fire;
  variant: 'icon' | 'button';
  className?: string;
}) {
  const d = useDict();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [nativeShare, setNativeShare] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Cache de la imagen de story: se precarga al abrir el menú para no perder la
  // «user activation» de iOS por un `await fetch` largo antes de `navigator.share`.
  const storyRef = useRef<Promise<Blob> | null>(null);
  const hintId = useId();

  useEffect(() => {
    setNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const title = interpolate(d.fire.incidentOf, { name: fire.name });
  const currentUrl = () => (typeof window !== 'undefined' ? window.location.href : '');

  const loadStory = () => {
    if (!storyRef.current) {
      storyRef.current = fetch(`/f/${fire.slug}/story`).then((r) => {
        if (!r.ok) throw new Error('story');
        return r.blob();
      });
    }
    return storyRef.current;
  };

  const openMenu = () => {
    setOpen(true);
    // Precarga optimista; el error real se maneja al pulsar (loadStory reintenta).
    loadStory().catch(() => {
      storyRef.current = null;
    });
  };

  const closeMenu = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Enfoca el primer botón al abrir (accesibilidad del popover).
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [open]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closeMenu();
    }
  };

  /** Web Share nivel 1 (enlace) con degradado a portapapeles. Devuelve true si copió. */
  const shareLink = async () => {
    const url = currentUrl();
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav?.share) {
      try {
        await nav.share({ title, url });
      } catch {
        /* cancelado */
      }
      return false;
    }
    try {
      await nav?.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      return true;
    } catch {
      return false;
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  };

  /** Web Share nivel 2 (fichero) → historias; en escritorio, descarga. */
  const shareStory = async () => {
    setBusy(true);
    let blob: Blob | null = null;
    try {
      blob = await loadStory();
    } catch {
      storyRef.current = null;
    }
    setBusy(false);
    if (!blob) {
      // Sin imagen → al menos compartir/copiar el enlace. Si acabó copiando,
      // dejamos el menú abierto para que se vea el «✓ Copiado».
      const justCopied = await shareLink();
      if (!justCopied) closeMenu();
      return;
    }

    const file = new File([blob], `incendib-${fire.slug}.png`, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
    if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title });
      } catch {
        /* cancelado por el usuario */
      }
      closeMenu();
      return;
    }

    // Escritorio / navegador sin compartir de ficheros → descarga.
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `incendib-${fire.slug}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setDownloaded(true);
    setTimeout(() => {
      setDownloaded(false);
      URL.revokeObjectURL(href); // diferido: Safari cancela la descarga si se revoca al instante
      closeMenu();
    }, 1600);
  };

  const item =
    'flex w-full items-center gap-2.5 rounded-btn px-2.5 py-2 text-left text-[12.5px] text-fg-secondary hover:bg-bg-sunken focus-visible:bg-bg-sunken disabled:opacity-60';

  const storyLabel = busy
    ? d.fire.shareStoryPreparing
    : downloaded
      ? d.fire.shareImageDownloaded
      : d.fire.shareStory;

  return (
    <div className={cn('relative', className)}>
      {variant === 'icon' ? (
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="true"
          aria-expanded={open}
          aria-label={d.fire.share}
          onClick={() => (open ? closeMenu() : openMenu())}
          className="text-action-text"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <circle cx="8" cy="3" r="1.6" />
            <circle cx="3" cy="9" r="1.6" />
            <circle cx="13" cy="9" r="1.6" />
            <path d="M8 4.5 L3.8 7.7 M8 4.5 L12.2 7.7" />
          </svg>
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="true"
          aria-expanded={open}
          onClick={() => (open ? closeMenu() : openMenu())}
          className="flex h-10 w-full items-center justify-center rounded-btn border border-strong text-[12.5px] font-semibold text-fg-secondary"
        >
          {d.fire.shareCta}
        </button>
      )}

      {open && (
        <>
          {/* Backdrop: cierra al tocar fuera sin robar el foco. */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={closeMenu}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            ref={menuRef}
            aria-label={d.fire.share}
            onKeyDown={onKeyDown}
            className={cn(
              'absolute right-0 z-50 w-60 rounded-card border bg-bg-raised p-1.5 shadow-lg',
              variant === 'button' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
            )}
          >
            <button type="button" onClick={shareStory} disabled={busy} aria-describedby={hintId} className={item}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-none"
                aria-hidden
              >
                <rect x="2.4" y="2.4" width="11.2" height="11.2" rx="3.4" />
                <circle cx="8" cy="8" r="2.9" />
                <circle cx="11.5" cy="4.5" r="0.85" fill="currentColor" stroke="none" />
              </svg>
              <span className="flex-1 truncate">{storyLabel}</span>
            </button>
            <p id={hintId} className="px-2.5 pb-1.5 pt-0.5 text-[10px] leading-snug text-fg-secondary">
              {d.fire.shareStoryHint}
            </p>

            <div className="my-1 border-t border-subtle" aria-hidden />

            {nativeShare && (
              <button
                type="button"
                onClick={async () => {
                  await shareLink();
                  closeMenu();
                }}
                className={item}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  className="flex-none"
                  aria-hidden
                >
                  <circle cx="8" cy="3" r="1.6" />
                  <circle cx="3" cy="9" r="1.6" />
                  <circle cx="13" cy="9" r="1.6" />
                  <path d="M8 4.5 L3.8 7.7 M8 4.5 L12.2 7.7" />
                </svg>
                <span className="flex-1">{d.fire.shareCta}</span>
              </button>
            )}

            <button type="button" onClick={copyLink} className={item}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-none"
                aria-hidden
              >
                <path d="M6.5 9.5a2.6 2.6 0 0 0 3.7 0l2-2a2.6 2.6 0 0 0-3.7-3.7l-1 1" />
                <path d="M9.5 6.5a2.6 2.6 0 0 0-3.7 0l-2 2a2.6 2.6 0 0 0 3.7 3.7l1-1" />
              </svg>
              <span className="flex-1">{copied ? d.fire.copied : d.fire.shareLinkOption}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
