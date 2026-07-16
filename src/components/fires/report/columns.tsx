'use client';

import { hasForeignAid } from '@/lib/fires/filters';
import { cn } from '@/lib/utils/cn';
import type { Fire } from '@/types/fire';

/** Columnas opcionales de la tabla del Informe (Incendio/Estado/HA/Act. son fijas). */
export type ColKey = 'provincia' | 'ccaa' | 'nivel' | 'tipo' | 'delta' | 'medios' | 'personal' | 'fuente' | 'inicio';

export const OPTIONAL_COLS: ColKey[] = [
  'provincia',
  'ccaa',
  'nivel',
  'tipo',
  'delta',
  'medios',
  'personal',
  'fuente',
  'inicio',
];

export const DEFAULT_COLS: ColKey[] = ['provincia', 'nivel', 'delta', 'medios'];

// ── Glifos de medios (line icons, coherentes con el sistema) ─────────────────

export function IconPlane({ className }: { className?: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden className={className}>
      <path d="M15 9.5 9.5 8.2V4.1a1.1 1.1 0 0 0-2.2 0v3.6L1.8 6.4v1.4l5.5 2v3.1L5 13.6v1l3-.8 3 .8v-1l-2.3-.7v-3.1l5.5-1.6z" />
    </svg>
  );
}
export function IconTruck({ className }: { className?: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden className={className}>
      <rect x="1.5" y="4.5" width="8" height="6" rx="0.6" />
      <path d="M9.5 6.5h3l2 2.2v1.8h-5z" />
      <circle cx="4.5" cy="11.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="11.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function IconPerson({ className }: { className?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden className={className}>
      <circle cx="8" cy="4" r="2.6" />
      <path d="M2.5 14c0-3 2.4-5 5.5-5s5.5 2 5.5 5z" />
    </svg>
  );
}

/** Celda de medios compacta: aéreos ✈ · terrestres 🚒 · personal 👤 + intl/evac. */
export function MediosCell({ fire, title }: { fire: Fire; title: string }) {
  const r = fire.resources;
  const aerial = r?.aerial ?? 0;
  const ground = r?.ground ?? 0;
  const personnel = r?.personnel ?? 0;
  const intl = hasForeignAid(fire);
  if (!r || (aerial === 0 && ground === 0 && personnel === 0 && !intl)) {
    return <span className="text-fg-mute">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-fg-secondary" title={title}>
      {aerial > 0 && (
        <span className="inline-flex items-center gap-0.5">
          <IconPlane className="text-fg-mute" />
          {aerial}
        </span>
      )}
      {ground > 0 && (
        <span className="inline-flex items-center gap-0.5">
          <IconTruck className="text-fg-mute" />
          {ground}
        </span>
      )}
      {personnel > 0 && (
        <span className="inline-flex items-center gap-0.5">
          <IconPerson className="text-fg-mute" />
          {personnel}
        </span>
      )}
      {intl && (
        <span
          className="inline-flex h-[13px] items-center rounded-[3px] border border-strong px-1 text-[8px] font-bold text-fg-mute"
          title="rescEU / MPCU"
        >
          INT
        </span>
      )}
    </span>
  );
}

/** Δ24h con signo + forma (no solo color). Positivo = crece. */
export function DeltaCell({ delta }: { delta?: number }) {
  if (delta == null) return <span className="text-fg-mute">—</span>;
  if (delta === 0) return <span className="font-mono text-[10.5px] text-fg-mute" aria-label="sin avance">— 0</span>;
  const up = delta > 0;
  return (
    <span
      className={cn('font-mono text-[10.5px] font-semibold tabular-nums', up ? 'text-state-activo-text' : 'text-state-extinguido-text')}
    >
      <span aria-hidden>{up ? '▲' : '▼'}</span> {up ? '+' : ''}
      {Math.round(delta)}
    </span>
  );
}
