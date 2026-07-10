import { cn } from '@/lib/utils/cn';

/**
 * Logotipo tipográfico: "Incend" + "IB" resaltado (guiño a Iberia). El nombre
 * accesible sigue siendo "Incendib". El acento "IB" usa el rojo de marca para
 * atar con el logo.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span aria-label="Incendib" className={cn('font-bold tracking-[-0.01em] text-fg', className)}>
      Incend<span className="text-state-activo">IB</span>
    </span>
  );
}
