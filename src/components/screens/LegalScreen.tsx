'use client';

import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { LangButton } from '@/components/layout/LangButton';
import { useUIStore } from '@/lib/store';
import { LEGAL } from '@/lib/legal';

/** Pantalla de aviso legal y privacidad (contenido localizado en src/lib/legal). */
export function LegalScreen() {
  const locale = useUIStore((s) => s.locale);
  const c = LEGAL[locale] ?? LEGAL.es;
  const [pre, post] = c.disclaimer.split('112');

  return (
    <>
      <ScreenHeader title={c.title} right={<LangButton />} />

      <div className="min-h-0 flex-1 overflow-y-auto pb-6 lg:mx-auto lg:w-full lg:max-w-2xl lg:border-x">
        <div className="px-screen pt-3">
          <p className="text-[12.5px] leading-relaxed text-fg-body">{c.intro}</p>
          <p className="mt-1.5 font-mono text-[9.5px] text-fg-mute">{c.updated}</p>
        </div>

        {c.sections.map((s) => (
          <section key={s.heading} className="px-screen pt-4">
            <h2 className="font-mono text-label font-semibold uppercase tracking-[0.12em] text-fg-mute">
              {s.heading}
            </h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="mt-1.5 text-[12px] leading-relaxed text-fg-body">
                {p}
              </p>
            ))}
          </section>
        ))}

        <p className="mx-screen mt-5 border-t pt-2.5 text-[10px] text-fg-mute">
          {pre}
          <span className="font-mono font-semibold text-state-activo-text">112</span>
          {post}
        </p>
      </div>
    </>
  );
}
