import { describe, it, expect } from 'vitest';
import { fireIndex, fireLinker } from './link';
import { clusterNews } from './cluster';
import type { Fire } from '@/types/fire';
import type { NewsItem } from '@/lib/data/news';

function fire(p: Partial<Fire>): Fire {
  return {
    slug: p.slug ?? 'x',
    name: p.name ?? 'X',
    municipality: p.municipality ?? 'Barraco (el)',
    province: 'Ávila',
    region: 'Castilla y León',
    country: 'ES',
    state: p.state ?? 'activo',
    level: null,
    hectares: 0,
    coordinates: [-4.5, 40.4],
    startedAt: '2026-07-08T00:00:00Z',
    updatedAt: '2026-07-10T00:00:00Z',
    sources: ['jcyl'],
    ...p,
  };
}

let seq = 0;
function item(title: string): NewsItem {
  seq++;
  return { id: `n${seq}`, region: 'España', country: 'ES', tone: 'warn', at: '2026-07-10T12:00:00Z', source: 'M', title, url: 'https://x' };
}
const cluster = (title: string) => clusterNews([item(title)])[0]!;

describe('fireIndex', () => {
  it('omite incendios sin token distintivo', () => {
    const idx = fireIndex([fire({ municipality: 'La Guardia', name: 'La Guardia' })]);
    expect(idx).toHaveLength(0);
  });
  it('usa el municipio y, si no hay, el nombre', () => {
    const idx = fireIndex([fire({ slug: 'a', municipality: 'Ourense', name: 'X' })]);
    expect(idx[0]!.token).toBe('ourense');
  });
});

describe('fireLinker', () => {
  const fires = [
    fire({ slug: 'barraco', municipality: 'Barraco (el)', name: 'El Barraco', state: 'activo' }),
    fire({ slug: 'ourense', municipality: 'Ourense', name: 'Ourense', state: 'controlado' }),
  ];
  const link = fireLinker(fires);

  it('enlaza la historia con el incendio cuyo municipio menciona', () => {
    const out = link(cluster('La UME refuerza el operativo en El Barraco'));
    expect(out.map((f) => f.slug)).toEqual(['barraco']);
  });
  it('no enlaza municipios ambiguos (evita "Guardia Civil")', () => {
    const l = fireLinker([fire({ slug: 'g', municipality: 'La Guardia', name: 'La Guardia' })]);
    expect(l(cluster('La Guardia Civil investiga el incendio'))).toHaveLength(0);
  });
  it('sin incendios rastreados, no enlaza nada', () => {
    expect(fireLinker([])(cluster('Incendio en Ourense'))).toEqual([]);
  });

  it('prioriza los activos y acota a max', () => {
    const many = [
      fire({ slug: 'ext', municipality: 'Zamora', name: 'Zamora', state: 'extinguido' }),
      fire({ slug: 'act', municipality: 'Ourense', name: 'Ourense', state: 'activo' }),
      fire({ slug: 'ctr', municipality: 'Cáceres', name: 'Cáceres', state: 'controlado' }),
    ];
    const out = fireLinker(many, 2)(cluster('Incendios en Zamora, Ourense y Cáceres a la vez'));
    expect(out).toHaveLength(2);
    expect(out[0]!.slug).toBe('act'); // activo primero
  });

  it('detecta la mención en cualquier medio del grupo, no solo el líder', () => {
    // Dos titulares casi idénticos (se agrupan); solo el segundo nombra el paraje.
    const items: NewsItem[] = [
      { ...item('Los bomberos trabajan para frenar el rápido avance de las llamas hacia la comarca'), at: '2026-07-10T15:00:00Z' },
      { ...item('Los bomberos trabajan para frenar el rápido avance de las llamas hacia El Barraco'), at: '2026-07-10T14:00:00Z' },
    ];
    const c = clusterNews(items)[0]!;
    expect(c.items.length).toBe(2); // se agruparon
    expect(c.lead.title).toContain('comarca'); // el líder NO nombra el paraje
    expect(link(c).map((f) => f.slug)).toEqual(['barraco']);
  });
});
