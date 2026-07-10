'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useDict } from '@/components/i18n/I18nProvider';

type IconProps = { className?: string };

const MapaIcon = ({ className }: IconProps) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
    <path d="M2 4 L6 2.5 L10 4 L14 2.5 V12 L10 13.5 L6 12 L2 13.5 Z" />
    <path d="M6 2.5 V12 M10 4 V13.5" />
  </svg>
);
const InformeIcon = ({ className }: IconProps) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
    <path d="M3 13.5 V8.5 M8 13.5 V3 M13 13.5 V6.5" />
  </svg>
);
const NoticiasIcon = ({ className }: IconProps) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
    <path d="M4.5 5.5 H11.5 M4.5 8 H11.5 M4.5 10.5 H8.5" />
  </svg>
);
const FuentesIcon = ({ className }: IconProps) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" className={className}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 7 V11.2" />
    <circle cx="8" cy="4.8" r=".5" fill="currentColor" stroke="none" />
  </svg>
);

const ITEMS = [
  { href: '/', key: 'mapa', Icon: MapaIcon },
  { href: '/informe', key: 'informe', Icon: InformeIcon },
  { href: '/noticias', key: 'noticias', Icon: NoticiasIcon },
  { href: '/fuentes', key: 'fuentes', Icon: FuentesIcon },
] as const;

export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const d = useDict();

  return (
    <nav
      aria-label="Navegación principal"
      className={cn('flex h-14 flex-none border-t bg-bg-raised', className)}
    >
      {ITEMS.map(({ href, key, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mt-px flex flex-1 flex-col items-center justify-center gap-[3px] border-t-2',
              active ? 'border-action text-action-text' : 'border-transparent text-fg-mute',
            )}
          >
            <Icon />
            <span className={cn('text-[9.5px]', active ? 'font-semibold' : 'font-medium')}>
              {d.tabs[key]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
