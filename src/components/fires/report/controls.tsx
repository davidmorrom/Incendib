'use client';

import { mix, V } from '@/lib/design/color';
import { cn } from '@/lib/utils/cn';

/** Estilo compartido de encabezado de grupo y etiqueta mono. */
export const GROUP_LABEL = 'text-[11.5px] font-bold text-fg';
export const MONO_HEAD = 'font-mono text-[10px] font-semibold uppercase tracking-[0.13em] text-fg-mute';

/** Chip de activación (multi u opción). El color codifica selección. */
export function ToggleChip({
  label,
  active,
  onClick,
  count,
  accentColor = V.action,
  className,
  ariaLabel,
}: {
  label: React.ReactNode;
  active: boolean;
  onClick: () => void;
  count?: number;
  accentColor?: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-chip border px-2.5 py-1.5 text-[11px] font-semibold',
        active ? 'text-action-text' : 'border-strong text-fg-secondary',
        className,
      )}
      style={active ? { backgroundColor: mix(accentColor, 13), borderColor: mix(accentColor, 50), color: `color-mix(in srgb, ${accentColor} 78%, var(--fg))` } : undefined}
    >
      {label}
      {count != null && <span className="font-mono text-[9.5px] opacity-70">{count}</span>}
    </button>
  );
}

/** Control segmentado (selección única): país, satélite, densidad, agrupar. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: { value: T; label: React.ReactNode; title?: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('flex gap-0.5 rounded-btn border border-subtle bg-bg-sunken p-0.5', className)}
    >
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            title={o.title}
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            className={cn(
              'flex-1 whitespace-nowrap rounded-[4px] px-2 py-1.5 text-[10.5px] font-semibold',
              on ? 'text-action-text' : 'text-fg-mute',
            )}
            style={on ? { backgroundColor: mix(V.action, 18) } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Grupo colapsable de filtros. Usa `<details>`/`<summary>` (accesible sin JS,
 * respetuoso con reduced-motion). Muestra un contador cuando hay selección.
 */
export function FilterGroup({
  title,
  count = 0,
  note,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  note?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="border-b border-subtle py-2.5 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action)]">
        <span className={GROUP_LABEL}>{title}</span>
        {count > 0 && (
          <span
            className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[9px] font-bold text-action-text"
            style={{ backgroundColor: mix(V.action, 16) }}
          >
            {count}
          </span>
        )}
        <span className="ml-auto text-fg-mute transition-transform [details[open]_&]:rotate-180" aria-hidden>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2.5 4.5 L6 8 L9.5 4.5" />
          </svg>
        </span>
      </summary>
      <div className="pt-2.5">{children}</div>
      {note && <p className="mt-2 text-[9.5px] leading-relaxed text-fg-mute">{note}</p>}
    </details>
  );
}
