'use client';

import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { locales } from '@/lib/i18n/config';
import { cn } from '@/lib/utils/cn';

/** Selector de idioma que cicla ES→PT→EN (compartido por las cabeceras). */
export function LangButton({ className }: { className?: string }) {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);
  const cycle = () => setLocale(locales[(locales.indexOf(locale) + 1) % locales.length]!);

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={d.map.langAria}
      className={cn(
        'grid h-7 flex-none place-items-center rounded-[6px] border border-default px-2 font-mono text-[10.5px] font-semibold text-fg-secondary',
        className,
      )}
    >
      {locale.toUpperCase()}
    </button>
  );
}
