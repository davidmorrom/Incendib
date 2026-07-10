import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils/cn';

/** Cabecera de pantalla reutilizable (Informe, Fuentes, Noticias): logo +
 * título + slot derecho opcional. Oculta en desktop (`lg:`), donde manda la
 * barra superior. La home (Mapa) usa AppHeader (con acciones). */
export function ScreenHeader({
  title,
  right,
  className,
}: {
  title: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex h-11 flex-none items-center gap-[9px] border-b px-screen lg:hidden', className)}>
      <Logo size={22} />
      <h1 className="truncate text-[15px] font-bold text-fg">{title}</h1>
      <div className="flex-1" />
      {right}
    </header>
  );
}
