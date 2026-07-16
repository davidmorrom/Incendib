import { describe, it, expect } from 'vitest';
import {
  regionFacets,
  applyNewsFilters,
  activeNewsFilterCount,
  recencyBucket,
  groupByRecency,
  coverageByFire,
  DEFAULT_NEWS_FILTERS,
  type FacetCluster,
  type NewsFilters,
} from './facets';
import type { NewsItem } from '@/lib/data/news';
import type { Fire } from '@/types/fire';

let seq = 0;
function lead(title: string, o: Partial<NewsItem> = {}): NewsItem {
  seq++;
  return {
    id: o.id ?? `n${seq}`,
    region: o.region ?? 'España',
    country: o.country ?? 'ES',
    tone: o.tone ?? 'warn',
    at: o.at ?? '2026-07-10T12:00:00Z',
    source: o.source ?? 'Medio',
    title,
    url: 'https://x',
  };
}

interface FcOpts {
  id?: string;
  title?: string;
  lead?: Partial<NewsItem>;
  items?: NewsItem[];
  sources?: string[];
  regions?: string[];
  latestAt?: string;
  tone?: 'warn' | 'action';
  fires?: Fire[];
}

function fc(o: FcOpts = {}): FacetCluster {
  const l = lead(o.title ?? 'Titular', o.lead);
  return {
    id: o.id ?? l.id,
    lead: l,
    items: o.items ?? [l],
    sources: o.sources ?? [l.source],
    regions: o.regions ?? [l.region],
    latestAt: o.latestAt ?? l.at,
    tone: o.tone ?? l.tone,
    fires: o.fires ?? [],
  };
}

const filters = (p: Partial<NewsFilters>): NewsFilters => ({ ...DEFAULT_NEWS_FILTERS, ...p });

describe('regionFacets', () => {
  it('cuenta historias por región y ordena de más a menos', () => {
    const facets = regionFacets([
      fc({ lead: { region: 'Aragón' } }),
      fc({ lead: { region: 'Aragón' } }),
      fc({ lead: { region: 'Galicia' } }),
    ]);
    expect(facets).toEqual([
      { region: 'Aragón', count: 2 },
      { region: 'Galicia', count: 1 },
    ]);
  });
});

describe('applyNewsFilters', () => {
  const clusters = [
    fc({ id: 'es-crit', lead: { country: 'ES', region: 'Aragón', tone: 'action' }, tone: 'action', title: 'Evacuados en Orés' }),
    fc({ id: 'pt', lead: { country: 'PT', region: 'Algarve' }, title: 'Incêndio em Monchique' }),
    fc({ id: 'es-link', lead: { country: 'ES', region: 'Galicia' }, title: 'Incendio en Ourense', fires: [{ slug: 'o' } as Fire] }),
  ];

  it('filtra por país', () => {
    expect(applyNewsFilters(clusters, filters({ country: 'pt' })).map((c) => c.id)).toEqual(['pt']);
  });
  it('filtra por críticos', () => {
    expect(applyNewsFilters(clusters, filters({ critical: true })).map((c) => c.id)).toEqual(['es-crit']);
  });
  it('filtra por vinculados a incendio', () => {
    expect(applyNewsFilters(clusters, filters({ linkedOnly: true })).map((c) => c.id)).toEqual(['es-link']);
  });
  it('filtra por región', () => {
    expect(applyNewsFilters(clusters, filters({ regions: ['Algarve'] })).map((c) => c.id)).toEqual(['pt']);
  });
  it('busca por texto con todas las palabras (AND) e ignora acentos', () => {
    expect(applyNewsFilters(clusters, filters({ query: 'monchique' })).map((c) => c.id)).toEqual(['pt']);
    expect(applyNewsFilters(clusters, filters({ query: 'evacuados ores' })).map((c) => c.id)).toEqual(['es-crit']);
    expect(applyNewsFilters(clusters, filters({ query: 'inexistente' }))).toHaveLength(0);
  });
  it('busca también dentro del incendio vinculado', () => {
    const c = fc({ id: 'z', title: 'Un gran incendio avanza', fires: [{ name: 'Sierra', municipality: 'Tejeda', province: 'Las Palmas' } as Fire] });
    expect(applyNewsFilters([c], filters({ query: 'tejeda' }))).toHaveLength(1);
  });
});

describe('activeNewsFilterCount', () => {
  it('cuenta grupos activos', () => {
    expect(activeNewsFilterCount(DEFAULT_NEWS_FILTERS)).toBe(0);
    expect(activeNewsFilterCount(filters({ query: ' foo ', country: 'es', critical: true }))).toBe(3);
  });
});

describe('recencyBucket', () => {
  const now = Date.parse('2026-07-16T12:00:00Z'); // 14:00 en Madrid (día 16)
  it('menos de 2 h → última hora', () => {
    expect(recencyBucket('2026-07-16T11:00:00Z', now)).toBe('ultimaHora');
  });
  it('mismo día natural de Madrid → hoy', () => {
    expect(recencyBucket('2026-07-16T06:00:00Z', now)).toBe('hoy');
    // 01:00 Madrid del día 16 (madrugada) sigue siendo hoy
    expect(recencyBucket('2026-07-15T23:30:00Z', now)).toBe('hoy');
  });
  it('día anterior → ayer', () => {
    expect(recencyBucket('2026-07-15T10:00:00Z', now)).toBe('ayer');
  });
  it('más atrás → anteriores', () => {
    expect(recencyBucket('2026-07-13T10:00:00Z', now)).toBe('anteriores');
  });
});

describe('coverageByFire', () => {
  const activo = { slug: 'a', state: 'activo', name: 'A' } as Fire;
  const ext = { slug: 'e', state: 'extinguido', name: 'E' } as Fire;

  it('invierte el enlace y ordena activos primero, luego por cobertura', () => {
    const cov = coverageByFire([
      fc({ id: 'c1', sources: ['RTVE'], fires: [ext] }),
      fc({ id: 'c2', sources: ['EFE'], fires: [activo] }),
      fc({ id: 'c3', sources: ['La Voz'], fires: [activo] }),
    ]);
    expect(cov.map((x) => x.fire.slug)).toEqual(['a', 'e']); // activo primero
    expect(cov[0]!.clusters).toHaveLength(2);
    expect(cov[0]!.sources).toBe(2); // EFE + La Voz
  });

  it('omite las historias sin incendio enlazado', () => {
    expect(coverageByFire([fc({ fires: [] })])).toEqual([]);
  });
});

describe('groupByRecency', () => {
  const now = Date.parse('2026-07-16T12:00:00Z');
  it('agrupa en orden fijo y omite cubos vacíos', () => {
    const groups = groupByRecency(
      [
        fc({ id: 'a', latestAt: '2026-07-13T10:00:00Z' }), // anteriores
        fc({ id: 'b', latestAt: '2026-07-16T11:30:00Z' }), // ultimaHora
        fc({ id: 'c', latestAt: '2026-07-16T07:00:00Z' }), // hoy
      ],
      now,
    );
    expect(groups.map((g) => g.bucket)).toEqual(['ultimaHora', 'hoy', 'anteriores']);
    expect(groups[0]!.clusters[0]!.id).toBe('b');
  });
});
