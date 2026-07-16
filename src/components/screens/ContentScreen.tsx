'use client';

import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { LangButton } from '@/components/layout/LangButton';
import { useUIStore } from '@/lib/store';
import { mix, V } from '@/lib/design/color';
import type { Locale } from '@/lib/i18n/config';
import type { PageContent } from '@/lib/pages';

/**
 * Pantalla de contenido informativo localizado (Acerca del proyecto, Metodología).
 * Presentación visual y escaneable: intro, aviso de estado del proyecto, secciones
 * en tarjetas numeradas y un bloque de contacto destacado. Si falta el locale, cae a ES.
 */
export function ContentScreen({ content }: { content: Record<Locale, PageContent> }) {
  const locale = useUIStore((s) => s.locale);
  const c = content[locale] ?? content.es;
  const [pre, post] = c.disclaimer.split('112');

  return (
    <>
      <ScreenHeader title={c.title} right={<LangButton />} />

      <div className="min-h-0 flex-1 overflow-y-auto px-screen pb-6 lg:mx-auto lg:w-full lg:max-w-2xl lg:border-x">
        {/* Introducción destacada */}
        <p className="pt-3 text-[13.5px] font-medium leading-relaxed text-fg-body">{c.intro}</p>

        {/* Estado del proyecto: en desarrollo continuo · puede contener fallos */}
        <div
          className="mt-3 flex items-start gap-2.5 rounded-[12px] border border-default p-3"
          style={{ background: mix(V.foco, 8), borderColor: mix(V.foco, 32) }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--state-foco-text)"
            strokeWidth="1.6"
            className="mt-px flex-none"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8h.01M11 11.5h1V16h1" />
          </svg>
          <p className="text-[11.5px] leading-snug text-fg-secondary">{c.status}</p>
        </div>

        {/* Secciones en tarjetas numeradas (escaneables) */}
        <div className="mt-4 space-y-2.5">
          {c.sections.map((s, i) => (
            <section key={s.heading} className="rounded-[12px] border border-subtle bg-bg-card p-3.5">
              <div className="flex items-center gap-2">
                <span
                  className="grid h-5 w-5 flex-none place-items-center rounded-full font-mono text-[10px] font-bold text-action-text"
                  style={{ background: mix(V.action, 14) }}
                >
                  {i + 1}
                </span>
                <h2 className="text-[13px] font-bold tracking-[-0.01em] text-fg">{s.heading}</h2>
              </div>
              {s.paragraphs.map((p, j) => (
                <p key={j} className="mt-1.5 text-[12px] leading-relaxed text-fg-secondary">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        {/* Contacto destacado (solo «Acerca») */}
        {c.contact && (
          <div
            className="mt-4 rounded-[14px] border p-4"
            style={{ background: mix(V.action, 8), borderColor: mix(V.action, 40) }}
          >
            <div className="font-mono text-label font-semibold uppercase tracking-[0.12em] text-fg-mute">
              {c.contact.heading}
            </div>
            <a
              href={`mailto:${c.contact.email}`}
              className="mt-2 inline-flex items-center gap-2 text-[15px] font-bold text-action-text"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
              {c.contact.email}
            </a>
            <p className="mt-2 text-[11.5px] leading-snug text-fg-secondary">{c.contact.note}</p>
            <p className="mt-1.5 font-mono text-[10px] text-fg-mute">
              {c.contact.ownerLabel}: {c.contact.owner}
            </p>
          </div>
        )}

        <p className="mt-4 font-mono text-[9.5px] text-fg-mute">{c.updated}</p>

        <p className="mt-3 border-t pt-2.5 text-[10px] text-fg-mute">
          {pre}
          <span className="font-mono font-semibold text-state-activo-text">112</span>
          {post}
        </p>
      </div>
    </>
  );
}
