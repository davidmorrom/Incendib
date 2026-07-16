'use client';

import { useMemo, useState } from 'react';
import { normalizeText } from '@/lib/fires/filters';
import { useDict } from '@/components/i18n/I18nProvider';
import { formatNumber } from '@/lib/utils/format';
import { interpolate } from '@/lib/i18n';
import { mix, V } from '@/lib/design/color';
import { cn } from '@/lib/utils/cn';

export interface FacetOption {
  value: string;
  label: string;
  count: number;
  /** Segunda línea opcional (p. ej. CCAA bajo una provincia). */
  sub?: string;
}

/**
 * Lista multi-selección accesible con recuentos: base de los filtros de CCAA,
 * provincia y fuente. Búsqueda opcional (insensible a acentos) y «ver más» para
 * listas largas. Cada opción es un `button aria-pressed` dentro de un grupo
 * etiquetado. El color codifica selección, nunca decora.
 */
export function FacetChecklist({
  groupLabel,
  options,
  selected,
  onToggle,
  searchable = false,
  maxVisible = 6,
}: {
  groupLabel: string;
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
  searchable?: boolean;
  maxVisible?: number;
}) {
  const d = useDict();
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const nq = normalizeText(q);
    if (!nq) return options;
    return options.filter((o) => normalizeText(`${o.label} ${o.sub ?? ''}`).includes(nq));
  }, [options, q]);

  const shown = expanded || q ? filtered : filtered.slice(0, maxVisible);
  const hiddenCount = filtered.length - shown.length;

  return (
    <div role="group" aria-label={groupLabel}>
      {searchable && options.length > maxVisible && (
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={d.panel.territorySearch}
          aria-label={d.panel.territorySearch}
          className="mb-1.5 w-full rounded-btn border border-subtle bg-bg-sunken px-2 py-1.5 text-[11.5px] text-fg placeholder:text-fg-mute focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--action)]"
        />
      )}
      {shown.length === 0 ? (
        <p className="px-1 py-1 text-[10.5px] text-fg-mute">{d.panel.noOptions}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {shown.map((o) => {
            const on = selected.includes(o.value);
            return (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => onToggle(o.value)}
                  aria-pressed={on}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-chip border px-2 py-1.5 text-left text-[11.5px]',
                    on ? 'font-semibold text-action-text' : 'border-strong text-fg-secondary',
                  )}
                  style={on ? { backgroundColor: mix(V.action, 12), borderColor: mix(V.action, 50) } : undefined}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'flex h-3.5 w-3.5 flex-none items-center justify-center rounded-[3px] border',
                      on ? 'text-action-text' : 'border-strong',
                    )}
                    style={on ? { borderColor: mix(V.action, 60), backgroundColor: mix(V.action, 18) } : undefined}
                  >
                    {on && (
                      <svg width="9" height="9" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.8" fill="none">
                        <path d="M1.5 5.2 L4 7.5 L8.5 2.5" />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{o.label}</span>
                    {o.sub && <span className="block truncate text-[9.5px] font-normal text-fg-mute">{o.sub}</span>}
                  </span>
                  <span className="flex-none font-mono text-[9.5px] text-fg-mute">{formatNumber(o.count)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {!q && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1.5 text-[10.5px] font-semibold text-action-text"
        >
          {interpolate(d.panel.showMore, { n: hiddenCount })}
        </button>
      )}
      {!q && expanded && filtered.length > maxVisible && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-1.5 text-[10.5px] font-semibold text-action-text"
        >
          {d.panel.showLess}
        </button>
      )}
    </div>
  );
}
