import { Logo } from '@/components/ui/Logo';

/** Cabecera de pantalla reutilizable (Informe, Fuentes, Noticias): logo +
 * título + slot derecho opcional. La home (Mapa) usa AppHeader (con acciones). */
export function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <header className="flex h-11 flex-none items-center gap-[9px] border-b px-screen">
      <Logo size={22} />
      <h1 className="truncate text-[15px] font-bold text-fg">{title}</h1>
      <div className="flex-1" />
      {right}
    </header>
  );
}
