'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { Wordmark } from '@/components/ui/Wordmark';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { useEffectiveTheme } from '@/lib/hooks/useTheme';
import { locales } from '@/lib/i18n/config';

const btn =
  'grid h-8 w-8 flex-none place-items-center rounded-[6px] border border-default text-fg-secondary';

/**
 * Cabecera del mapa (2a): marca + alertas + selector de idioma + tema.
 * El idioma cicla ES→PT→EN; el tema alterna claro/oscuro (persistido).
 */
export function AppHeader() {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);
  const setTheme = useUIStore((s) => s.setTheme);
  const effective = useEffectiveTheme();

  const cycleLocale = () => {
    const i = locales.indexOf(locale);
    setLocale(locales[(i + 1) % locales.length]!);
  };
  const toggleTheme = () => setTheme(effective === 'dark' ? 'light' : 'dark');

  return (
    <header className="flex h-[50px] flex-none items-center gap-[10px] border-b px-screen">
      <Logo size={24} />
      <Wordmark className="text-title" />
      <div className="flex-1" />

      <Link href="/alertas" className={btn} aria-label={d.alerts.aria}>
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 2.5a4 4 0 0 0-4 4c0 3.2-1.4 4.8-1.4 4.8h10.8S14 9.7 14 6.5a4 4 0 0 0-4-4Z" />
          <path d="M7.4 14a1.6 1.6 0 0 0 3.2 0" />
        </svg>
      </Link>

      <button
        type="button"
        onClick={cycleLocale}
        aria-label={d.map.langAria}
        className="grid h-8 flex-none place-items-center rounded-[6px] border border-default px-[9px] font-mono text-[11px] font-semibold text-fg-secondary"
      >
        {locale.toUpperCase()}
      </button>

      <button type="button" onClick={toggleTheme} className={btn} aria-label={d.map.themeAria}>
        {effective === 'dark' ? (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="8" cy="8" r="3.2" />
            <path d="M8 1.5 V3.2 M8 12.8 V14.5 M1.5 8 H3.2 M12.8 8 H14.5 M3.4 3.4 L4.6 4.6 M11.4 11.4 L12.6 12.6 M3.4 12.6 L4.6 11.4 M11.4 4.6 L12.6 3.4" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M13.2 9.2 A5.2 5.2 0 1 1 6.8 2.8 A4.1 4.1 0 0 0 13.2 9.2 Z" />
          </svg>
        )}
      </button>
    </header>
  );
}
