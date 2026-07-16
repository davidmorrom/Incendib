'use client';

import { StateGlyph } from '@/components/ui/StateGlyph';
import { useDict } from '@/components/i18n/I18nProvider';
import { interpolate } from '@/lib/i18n';
import { STATE_LABEL_KEY, STATE_TEXT_CLASS } from '@/lib/fires/style';
import { formatHa } from '@/lib/utils/format';
import { mix, V } from '@/lib/design/color';
import { cn } from '@/lib/utils/cn';
import type { FireCoverage } from '@/lib/news/facets';

/**
 * Rail «Incendios con cobertura»: los incendios que rastreamos con prensa
 * enlazada. Seleccionar uno filtra el feed central a sus historias. El «N medios»
 * mide atención mediática, NO el tamaño ni el peligro del incendio (se rotula).
 */
export function CoverageRail({
  coverage,
  selectedSlug,
  onSelect,
}: {
  coverage: FireCoverage[];
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
}) {
  const d = useDict();

  return (
    <div className="p-2.5">
      {coverage.length === 0 ? (
        <p className="px-1 py-3 text-[11.5px] leading-relaxed text-fg-secondary">{d.news.coverageEmpty}</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-pressed={selectedSlug === null}
            className={cn(
              'mb-1.5 w-full rounded-btn border px-2.5 py-1.5 text-left text-[11.5px] font-semibold',
              selectedSlug === null ? 'text-action-text' : 'border-strong text-fg-secondary',
            )}
            style={selectedSlug === null ? { backgroundColor: mix(V.action, 14), borderColor: mix(V.action, 45) } : undefined}
          >
            {d.news.coverageAll}
          </button>
          <ul className="space-y-1">
            {coverage.map(({ fire, sources }) => {
              const on = selectedSlug === fire.slug;
              const place = fire.municipality && fire.municipality !== '—' ? fire.municipality : fire.region;
              return (
                <li key={fire.slug}>
                  <button
                    type="button"
                    onClick={() => onSelect(on ? null : fire.slug)}
                    aria-pressed={on}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-btn border px-2.5 py-2 text-left',
                      on ? 'border-transparent' : 'border-subtle',
                    )}
                    style={on ? { backgroundColor: mix(V[fire.state], 12), borderColor: mix(V[fire.state], 45) } : undefined}
                  >
                    <StateGlyph state={fire.state} size={13} className="mt-0.5 flex-none" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-fg">{place}</span>
                      <span className={cn('font-mono text-[9.5px]', STATE_TEXT_CLASS[fire.state])}>
                        {d.states[STATE_LABEL_KEY[fire.state]]}
                        {fire.hectares > 0 ? (
                          <span className="text-fg-mute">
                            {' · '}
                            {fire.hectaresApprox ? '~' : ''}
                            {formatHa(fire.hectares)}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="flex-none self-center rounded-chip border border-subtle px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-fg-body">
                      {sources === 1 ? d.news.mediaOne : interpolate(d.news.media, { n: sources })}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
