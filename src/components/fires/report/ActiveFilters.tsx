'use client';

import { useDict } from '@/components/i18n/I18nProvider';
import { interpolate } from '@/lib/i18n';
import { STATE_LABEL_KEY } from '@/lib/fires/style';
import { HA_MAX, type FireFilters, type MediaKey } from '@/lib/fires/filters';
import { formatNumber } from '@/lib/utils/format';
import { mix, V } from '@/lib/design/color';
import type { FireType, SourceId } from '@/types/fire';

interface Pill {
  key: string;
  label: string;
  onRemove: () => void;
}

/**
 * Fila de filtros activos como chips eliminables + «limpiar». Da visibilidad de
 * qué está filtrado (sobre todo en móvil, donde el panel vive en un sheet) y
 * permite quitar cada criterio sin abrir el panel.
 */
export function ActiveFilters({
  filters,
  onChange,
  onReset,
}: {
  filters: FireFilters;
  onChange: (patch: Partial<FireFilters>) => void;
  onReset: () => void;
}) {
  const d = useDict();

  const typeLabel: Record<FireType, string> = {
    forestal: d.panel.typeForestal,
    agricola: d.panel.typeAgricola,
    'urbano-forestal': d.panel.typeUrbano,
  };
  const mediaLabel: Record<MediaKey, string> = {
    aereos: d.panel.mediaAereos,
    terrestres: d.panel.mediaTerrestres,
    internacional: d.panel.mediaInternacional,
    evacuacion: d.panel.mediaEvacuacion,
  };

  const remove = <T,>(list: T[], v: T): T[] => list.filter((x) => x !== v);
  const pills: Pill[] = [];

  if (filters.query.trim())
    pills.push({ key: 'q', label: `"${filters.query.trim()}"`, onRemove: () => onChange({ query: '' }) });
  for (const s of filters.states)
    pills.push({ key: `st-${s}`, label: d.states[STATE_LABEL_KEY[s]], onRemove: () => onChange({ states: remove(filters.states, s) }) });
  if (filters.country !== 'todos')
    pills.push({
      key: 'pais',
      label: filters.country === 'es' ? d.report.spain : d.report.portugal,
      onRemove: () => onChange({ country: 'todos' }),
    });
  for (const r of filters.regions)
    pills.push({ key: `r-${r}`, label: r, onRemove: () => onChange({ regions: remove(filters.regions, r) }) });
  for (const p of filters.provinces)
    pills.push({ key: `p-${p}`, label: p, onRemove: () => onChange({ provinces: remove(filters.provinces, p) }) });
  for (const l of filters.levels)
    pills.push({ key: `lv-${l}`, label: interpolate(d.panel.levelN, { n: l }), onRemove: () => onChange({ levels: remove(filters.levels, l) }) });
  for (const t of filters.types)
    pills.push({ key: `ty-${t}`, label: typeLabel[t], onRemove: () => onChange({ types: remove(filters.types, t) }) });
  for (const m of filters.medios)
    pills.push({ key: `md-${m}`, label: mediaLabel[m], onRemove: () => onChange({ medios: remove(filters.medios, m) }) });
  if (filters.growing)
    pills.push({ key: 'crece', label: d.panel.growing, onRemove: () => onChange({ growing: false }) });
  if (filters.minPersonnel > 0)
    pills.push({ key: 'pers', label: `≥${filters.minPersonnel} ${d.panel.kpiPersonnel.toLowerCase()}`, onRemove: () => onChange({ minPersonnel: 0 }) });
  if (filters.minHa > 0 || filters.maxHa < HA_MAX) {
    const parts: string[] = [];
    if (filters.minHa > 0) parts.push(`≥${formatNumber(filters.minHa)}`);
    if (filters.maxHa < HA_MAX) parts.push(`≤${formatNumber(filters.maxHa)}`);
    pills.push({ key: 'ha', label: `${parts.join(' ')} ha`, onRemove: () => onChange({ minHa: 0, maxHa: HA_MAX }) });
  }
  if (filters.period !== 'todos')
    pills.push({ key: 'per', label: filters.period.replace('h', ' h').replace('d', ' d'), onRemove: () => onChange({ period: 'todos' }) });
  if (filters.satellite !== 'todos')
    pills.push({
      key: 'sat',
      label: filters.satellite === 'si' ? d.panel.satelliteYes : d.panel.satelliteNo,
      onRemove: () => onChange({ satellite: 'todos' }),
    });
  for (const s of filters.sources)
    pills.push({
      key: `src-${s}`,
      label: d.panel.sourceNames[s as SourceId] ?? s,
      onRemove: () => onChange({ sources: remove(filters.sources, s) }),
    });

  if (pills.length === 0) return null;

  return (
    <div className="flex flex-none items-center gap-1.5 overflow-x-auto px-screen py-2" aria-label={d.panel.activeFilters}>
      {pills.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={p.onRemove}
          aria-label={interpolate(d.panel.removeFilter, { name: p.label })}
          className="inline-flex flex-none items-center gap-1 rounded-chip border py-1 pl-2 pr-1.5 text-[11px] font-semibold text-action-text"
          style={{ backgroundColor: mix(V.action, 10), borderColor: mix(V.action, 40) }}
        >
          <span className="max-w-[140px] truncate">{p.label}</span>
          <svg width="9" height="9" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.4" aria-hidden>
            <path d="M1 1 L9 9 M9 1 L1 9" />
          </svg>
        </button>
      ))}
      <button
        type="button"
        onClick={onReset}
        className="flex-none whitespace-nowrap px-1.5 text-[11px] font-semibold text-fg-mute underline underline-offset-2"
      >
        {d.panel.clear}
      </button>
    </div>
  );
}
