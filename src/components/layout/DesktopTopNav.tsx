'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Wordmark } from '@/components/ui/Wordmark';
import { LangButton } from '@/components/layout/LangButton';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { useEffectiveTheme } from '@/lib/hooks/useTheme';
import { formatClock } from '@/lib/utils/format';
import { useNow } from '@/components/time/NowProvider';
import { interpolate } from '@/lib/i18n';
import { mix, V } from '@/lib/design/color';
import { cn } from '@/lib/utils/cn';

const TABS = [
  { href: '/', key: 'mapa' },
  { href: '/informe', key: 'informe' },
  { href: '/boletines', key: 'boletines' },
  { href: '/noticias', key: 'noticias' },
  { href: '/fuentes', key: 'fuentes' },
] as const;

/** Barra superior del panel desktop: marca, pestañas, idioma y tema.
 * Solo visible en `lg:`; en móvil manda la barra inferior. */
export function DesktopTopNav({ className }: { className?: string }) {
  const d = useDict();
  const pathname = usePathname();
  const now = useNow();
  const setTheme = useUIStore((s) => s.setTheme);
  const effective = useEffectiveTheme();

  return (
    <header className={cn('h-[52px] flex-none items-center gap-4 border-b px-4 print:hidden', className)}>
      <Link href="/" className="flex flex-none items-center gap-2.5">
        <Logo size={24} />
        <Wordmark className="text-title" />
      </Link>

      <nav className="flex items-center gap-0.5 rounded-btn border border-subtle bg-bg-raised p-0.5">
        {TABS.map((t) => {
          const on = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'rounded-[5px] px-3.5 py-1.5 text-[12px] font-semibold',
                on ? 'text-action-text' : 'text-fg-mute',
              )}
              style={on ? { backgroundColor: mix(V.action, 18) } : undefined}
            >
              {d.tabs[t.key]}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />
      <span className="hidden font-mono text-[11px] text-fg-mute xl:inline">
        {interpolate(d.map.updated, { time: formatClock(now) })}
      </span>
      <Link
        href="/alertas"
        aria-label={d.alerts.aria}
        className="grid h-8 w-8 flex-none place-items-center rounded-[6px] border border-default text-fg-secondary"
      >
        <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 2.5a4 4 0 0 0-4 4c0 3.2-1.4 4.8-1.4 4.8h10.8S14 9.7 14 6.5a4 4 0 0 0-4-4Z" />
          <path d="M7.4 14a1.6 1.6 0 0 0 3.2 0" />
        </svg>
      </Link>
      <LangButton />
      <button
        type="button"
        onClick={() => setTheme(effective === 'dark' ? 'light' : 'dark')}
        aria-label={d.map.themeAria}
        className="grid h-8 w-8 flex-none place-items-center rounded-[6px] border border-default text-fg-secondary"
      >
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
