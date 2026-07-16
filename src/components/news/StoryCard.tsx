'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StateGlyph } from '@/components/ui/StateGlyph';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { useNow } from '@/components/time/NowProvider';
import { timeAgo, formatDateTime, formatHa } from '@/lib/utils/format';
import { interpolate } from '@/lib/i18n';
import { STATE_LABEL_KEY, STATE_TEXT_CLASS } from '@/lib/fires/style';
import { mix, V } from '@/lib/design/color';
import { cn } from '@/lib/utils/cn';
import { ExternalIcon, WarnIcon, ChevronIcon } from './icons';
import type { FacetCluster } from '@/lib/news/facets';
import type { NewsItem } from '@/lib/data/news';
import type { Fire } from '@/types/fire';

const langOf = (c: NewsItem['country']) => (c === 'PT' ? 'pt' : 'es');

/** Marca de tiempo accesible: relativa a la vista, ISO a máquina, absoluta en tooltip. */
function When({ item }: { item: NewsItem }) {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);
  const now = useNow();
  if (item.undated) return <span className="text-fg-mute">{d.news.undated}</span>;
  return (
    <time dateTime={item.at} title={formatDateTime(item.at, locale)} className="text-fg-mute">
      {timeAgo(item.at, now, locale)}
    </time>
  );
}

/** Chip enlazado a la ficha del incendio: estado real (color + FORMA) + lugar. */
function FireChip({ fire }: { fire: Fire }) {
  const d = useDict();
  const place = fire.municipality && fire.municipality !== '—' ? fire.municipality : fire.region;
  return (
    <Link
      href={`/f/${fire.slug}`}
      aria-label={`${d.news.viewFire}: ${fire.name}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-chip border px-2 py-1 text-[11px] font-semibold',
        STATE_TEXT_CLASS[fire.state],
      )}
      style={{ backgroundColor: mix(V[fire.state], 12), borderColor: mix(V[fire.state], 45) }}
    >
      <StateGlyph state={fire.state} size={12} className="flex-none" />
      <span className="truncate max-w-[13rem]">{place}</span>
      <span className="font-mono text-[9.5px] text-fg-mute">
        {d.states[STATE_LABEL_KEY[fire.state]]}
        {fire.hectares > 0 ? ` · ${fire.hectaresApprox ? '~' : ''}${formatHa(fire.hectares)}` : ''}
      </span>
    </Link>
  );
}

/** Enlace externo a un artículo, con aviso accesible de pestaña nueva. */
function HeadlineLink({ item, className }: { item: NewsItem; className?: string }) {
  const d = useDict();
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      lang={langOf(item.country)}
      className={cn('group/link inline', className)}
    >
      {item.title}
      <ExternalIcon size={11} className="ml-1 inline-block align-baseline text-fg-mute" />
      <span className="sr-only"> {d.news.externalHint}</span>
    </a>
  );
}

/**
 * Tarjeta de historia: un grupo de titulares casi idénticos sobre el mismo suceso.
 * Muestra el titular representativo, «N medios» desplegable con todos los enlaces,
 * el/los incendio(s) rastreado(s) que menciona (chip a la ficha) y, si procede, un
 * marcador ETIQUETADO de que el titular menciona evacuación/descontrol.
 */
export function StoryCard({ cluster }: { cluster: FacetCluster }) {
  const d = useDict();
  const [open, setOpen] = useState(false);
  const multi = cluster.sources.length > 1;

  return (
    <article className="border-t border-subtle py-3">
      {/* Meta: zona (neutra) · cuándo · medio */}
      <div className="mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[10px] text-fg-mute">
        <span className="font-semibold uppercase tracking-[0.04em] text-fg-secondary" title={d.news.regionApprox}>
          {cluster.lead.region}
        </span>
        <span aria-hidden>·</span>
        <When item={cluster.lead} />
        {!multi && (
          <>
            <span aria-hidden>·</span>
            <span className="truncate">{cluster.lead.source}</span>
          </>
        )}
      </div>

      {/* Titular representativo (real, atribuido; nunca resumen generado) */}
      <h3 className="text-[13.5px] font-semibold leading-snug text-fg">
        <HeadlineLink item={cluster.lead} />
      </h3>

      {/* Marcador etiquetado de criticidad (según el titular, NO estado oficial) */}
      {cluster.tone === 'action' && (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-warn">
          <WarnIcon size={12} className="flex-none" />
          <span>
            {d.news.mentionsCritical}
            <span className="ml-1 font-normal text-fg-mute">· {d.news.perTitle}</span>
          </span>
        </p>
      )}

      {/* Incendio(s) rastreado(s) que menciona */}
      {cluster.fires.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {cluster.fires.map((f) => (
            <FireChip key={f.slug} fire={f} />
          ))}
        </div>
      )}

      {/* Cobertura: nº de medios distintos + despliegue de todos los enlaces */}
      {multi && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex items-center gap-1.5 rounded-chip border border-strong px-2 py-[3px] text-[10.5px] font-semibold text-fg-body"
          >
            <span className="font-mono">{interpolate(d.news.media, { n: cluster.sources.length })}</span>
            <span className="text-fg-mute">· {open ? d.news.sourcesHide : d.news.sourcesToggle}</span>
            <ChevronIcon open={open} size={11} className="text-fg-mute" />
          </button>
          {open && (
            <ul className="mt-1.5 space-y-1.5 border-l border-subtle pl-2.5">
              {cluster.items.map((it) => (
                <li key={it.id} className="text-[11.5px] leading-snug">
                  <span className="mr-1.5 font-mono text-[9.5px] font-semibold text-fg-secondary">{it.source}</span>
                  <span className="mr-1.5 font-mono text-[9.5px] text-fg-mute">
                    <When item={it} />
                  </span>
                  <HeadlineLink item={it} className="text-fg-body" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}
