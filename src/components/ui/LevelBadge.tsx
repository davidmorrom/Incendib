import { cn } from '@/lib/utils/cn';
import { mix, V } from '@/lib/design/color';
import type { Country, SeverityLevel } from '@/types/fire';

/**
 * Badge de nivel de gravedad (ES) o indicador PT. N≥2 en ámbar; N1/PT neutro.
 * Nivel 0 o ausente sin badge (5c · filas de incendio).
 */
export function LevelBadge({
  level,
  country,
  className,
}: {
  level: SeverityLevel;
  country: Country;
  className?: string;
}) {
  const label = level && level >= 1 ? `N${level}` : country === 'PT' ? 'PT' : null;
  if (!label) return null;

  const amber = level != null && level >= 2;
  const base =
    'inline-flex items-center rounded-[3px] border px-[5px] py-[1.5px] font-mono text-[9px] font-semibold leading-none';

  if (amber) {
    return (
      <span
        className={cn(base, 'text-state-controlado-text', className)}
        style={{ backgroundColor: mix(V.controlado, 12), borderColor: mix(V.controlado, 45) }}
      >
        {label}
      </span>
    );
  }
  return <span className={cn(base, 'border-strong text-fg-secondary', className)}>{label}</span>;
}
