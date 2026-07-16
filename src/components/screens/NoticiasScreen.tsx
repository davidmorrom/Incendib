'use client';

import { useMemo, useState } from 'react';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { LangButton } from '@/components/layout/LangButton';
import { LiveEmbed } from '@/components/news/LiveEmbed';
import { StoryCard } from '@/components/news/StoryCard';
import { NewsFilterBar } from '@/components/news/NewsFilterBar';
import { CoverageRail } from '@/components/news/CoverageRail';
import { ExternalIcon } from '@/components/news/icons';
import { useDict } from '@/components/i18n/I18nProvider';
import { useUIStore } from '@/lib/store';
import { useNow } from '@/components/time/NowProvider';
import { timeAgo } from '@/lib/utils/format';
import { interpolate } from '@/lib/i18n';
import { clusterNews } from '@/lib/news/cluster';
import { fireLinker } from '@/lib/news/link';
import {
  regionFacets,
  coverageByFire,
  applyNewsFilters,
  groupByRecency,
  DEFAULT_NEWS_FILTERS,
  type NewsFilters,
  type FacetCluster,
} from '@/lib/news/facets';
import { MOCK_ACCOUNTS, type NewsItem } from '@/lib/data/news';
import type { Fire } from '@/types/fire';

const SECTION = 'font-mono text-label font-semibold uppercase tracking-[0.12em] text-fg-mute';

/** Indicador de frescura: es ISR (~15 min), no directo; se dice explícitamente. */
function Freshness({ at }: { at: string }) {
  const d = useDict();
  const locale = useUIStore((s) => s.locale);
  const now = useNow();
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[10px] text-fg-mute">
        {interpolate(d.news.freshness, { when: timeAgo(at, now, locale) })}
      </span>
      <span className="text-[10px] leading-relaxed text-fg-mute">{d.news.sourceNote}</span>
    </div>
  );
}

/** Directorio honesto de cuentas oficiales (enlaces salientes, NO feed en vivo). */
function Accounts() {
  const d = useDict();
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className={SECTION}>{d.news.accounts}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MOCK_ACCOUNTS.map((a) => (
          <a
            key={a.handle}
            href={a.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-strong px-[9px] py-[5px] text-[11px] font-semibold text-fg-body"
          >
            {a.handle}
            <ExternalIcon size={10} className="text-fg-mute" />
            <span className="sr-only"> {d.news.externalHint}</span>
          </a>
        ))}
      </div>
      <p className="mt-1.5 text-[10px] leading-relaxed text-fg-mute">{d.news.accountsNote}</p>
    </div>
  );
}

/** Aviso 112 (mismo patrón que el resto de pantallas). */
function Disclaimer112({ className }: { className?: string }) {
  const d = useDict();
  return (
    <p className={className}>
      {d.disclaimer.short.split('112')[0]}
      <span className="font-mono font-semibold text-state-activo-text">112</span>
    </p>
  );
}

/** Feed de historias agrupado en bandas de recencia. */
function Feed({ groups, emptyLabel }: { groups: ReturnType<typeof groupByRecency>; emptyLabel: string }) {
  const d = useDict();
  if (!groups.length) {
    return <p className="px-screen py-8 text-center text-[12.5px] text-fg-secondary">{emptyLabel}</p>;
  }
  return (
    <div className="px-screen">
      {groups.map((g) => (
        <section key={g.bucket} aria-label={d.news.recency[g.bucket]}>
          <h2 className="sticky top-0 z-[1] flex items-baseline gap-2 bg-bg-base pb-1 pt-3.5">
            <span className={SECTION}>{d.news.recency[g.bucket]}</span>
            <span className="font-mono text-[9.5px] text-fg-mute">{g.clusters.length}</span>
          </h2>
          {g.clusters.map((c) => (
            <StoryCard key={c.id} cluster={c} />
          ))}
        </section>
      ))}
    </div>
  );
}

/**
 * Noticias y directos (3a móvil / 6a desktop). De lista plana a consola de
 * situational awareness: historias agrupadas por suceso («N medios»), enlazadas a
 * los incendios que rastreamos, con facetas/búsqueda cliente, bandas de recencia y
 * un rail «Incendios con cobertura». Titulares reales de Google News (ES+PT).
 */
export function NoticiasScreen({
  fires,
  news = [],
  fetchedAt,
}: {
  fires: Fire[];
  news?: NewsItem[];
  fetchedAt: string;
}) {
  const d = useDict();
  const now = useNow();
  const [filters, setFilters] = useState<NewsFilters>(DEFAULT_NEWS_FILTERS);
  // Selección desde el rail de cobertura (desktop): filtra el feed a un incendio.
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // Núcleo: agrupar historias, enlazarlas con los incendios y derivar facetas.
  const enriched = useMemo<FacetCluster[]>(() => {
    const link = fireLinker(fires);
    return clusterNews(news).map((c) => ({ ...c, fires: link(c) }));
  }, [fires, news]);

  const regions = useMemo(() => regionFacets(enriched), [enriched]);
  const coverage = useMemo(() => coverageByFire(enriched), [enriched]);
  const selectedFire = useMemo(
    () => (selectedSlug ? fires.find((f) => f.slug === selectedSlug) ?? null : null),
    [selectedSlug, fires],
  );

  const filtered = useMemo(() => {
    const bySelection = selectedSlug
      ? enriched.filter((c) => c.fires.some((f) => f.slug === selectedSlug))
      : enriched;
    return applyNewsFilters(bySelection, filters);
  }, [enriched, filters, selectedSlug]);

  const groups = useMemo(() => groupByRecency(filtered, now), [filtered, now]);

  const patch = (p: Partial<NewsFilters>) => setFilters((f) => ({ ...f, ...p }));
  const reset = () => setFilters(DEFAULT_NEWS_FILTERS);
  const emptyLabel = news.length ? d.news.noResults : d.news.empty;

  const selectionBanner = selectedFire && (
    <div className="flex items-center justify-between gap-2 border-b bg-bg-raised px-screen py-2">
      <span className="truncate text-[11.5px] font-semibold text-fg">
        {interpolate(d.news.coverageOf, { name: selectedFire.municipality || selectedFire.name })}
      </span>
      <button
        type="button"
        onClick={() => setSelectedSlug(null)}
        className="flex-none text-[11px] font-semibold text-action-text"
      >
        {d.news.coverageAll}
      </button>
    </div>
  );

  return (
    <>
      <ScreenHeader title={d.news.title} right={<LangButton />} />

      {/* Móvil (3a): pila */}
      <div className="min-h-0 flex-1 overflow-y-auto lg:hidden">
        <div className="border-b px-screen py-2.5">
          <Freshness at={fetchedAt} />
        </div>
        <div className="sticky top-0 z-[2] border-b bg-bg-base px-screen py-2.5">
          <NewsFilterBar
            filters={filters}
            onChange={patch}
            onReset={reset}
            regions={regions}
            resultsCount={filtered.length}
          />
        </div>
        {selectionBanner}
        <Feed groups={groups} emptyLabel={emptyLabel} />

        <div className="mt-2 space-y-5 border-t px-screen pt-4">
          <LiveEmbed />
          <Accounts />
        </div>
        <Disclaimer112 className="mt-3 border-t px-screen py-[9px] text-[10px] text-fg-mute" />
      </div>

      {/* Desktop (6a): 3 columnas — facetas · feed · cobertura+directo */}
      <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-[300px_1fr_320px] lg:grid-rows-1">
        {/* Facetas */}
        <div className="min-h-0 overflow-y-auto border-r p-3.5">
          <NewsFilterBar
            filters={filters}
            onChange={patch}
            onReset={reset}
            regions={regions}
            resultsCount={filtered.length}
          />
        </div>

        {/* Feed */}
        <div className="flex min-h-0 flex-col">
          <div className="flex-none border-b px-screen py-2.5">
            <Freshness at={fetchedAt} />
          </div>
          {selectionBanner}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Feed groups={groups} emptyLabel={emptyLabel} />
          </div>
          <Disclaimer112 className="flex-none border-t px-screen py-[7px] text-[10px] text-fg-mute" />
        </div>

        {/* Cobertura + directo + cuentas */}
        <div className="min-h-0 overflow-y-auto border-l">
          <div className="sticky top-0 z-[1] border-b bg-bg-base px-3 py-2.5">
            <span className={SECTION}>{d.news.coverage}</span>
          </div>
          <CoverageRail coverage={coverage} selectedSlug={selectedSlug} onSelect={setSelectedSlug} />
          <p className="px-3 pb-2 text-[10px] leading-relaxed text-fg-mute">{d.news.coverageNote}</p>
          <div className="space-y-5 border-t p-3">
            <LiveEmbed />
            <Accounts />
          </div>
        </div>
      </div>
    </>
  );
}
