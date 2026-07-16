import { describe, it, expect } from 'vitest';
import { clusterNews } from './cluster';
import type { NewsItem } from '@/lib/data/news';

let seq = 0;
function n(title: string, opts: Partial<NewsItem> = {}): NewsItem {
  seq++;
  return {
    id: opts.id ?? `n${seq}`,
    region: opts.region ?? 'España',
    country: opts.country ?? 'ES',
    tone: opts.tone ?? 'warn',
    at: opts.at ?? '2026-07-10T12:00:00Z',
    source: opts.source ?? 'Medio',
    title,
    url: opts.url ?? 'https://x',
  };
}

describe('clusterNews', () => {
  it('agrupa titulares casi idénticos de medios distintos en una historia', () => {
    const items = [
      n('La UME refuerza el operativo en Las Hurdes por el cambio de viento', { source: 'RTVE', at: '2026-07-10T14:14:00Z' }),
      n('La UME refuerza su despliegue en Las Hurdes por el giro del viento', { source: 'EFE', at: '2026-07-10T14:02:00Z' }),
    ];
    const clusters = clusterNews(items);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.sources.sort()).toEqual(['EFE', 'RTVE']);
    expect(clusters[0]!.items).toHaveLength(2);
  });

  it('NO fusiona incendios de zonas distintas aunque compartan estructura', () => {
    const items = [
      n('Estabilizado el incendio de Zamora tras arrasar la sierra'),
      n('Estabilizado el incendio de Ourense tras arrasar el monte'),
    ];
    expect(clusterNews(items)).toHaveLength(2);
  });

  it('el líder del grupo es el titular más reciente', () => {
    const items = [
      n('Evacuados cinco pueblos en Zaragoza por el avance del fuego', { at: '2026-07-10T10:00:00Z', id: 'viejo' }),
      n('Evacuados cinco pueblos en Zaragoza por el avance de las llamas', { at: '2026-07-10T15:00:00Z', id: 'nuevo' }),
    ];
    const [c] = clusterNews(items);
    expect(c!.id).toBe('nuevo');
    expect(c!.latestAt).toBe('2026-07-10T15:00:00Z');
  });

  it('marca tono action si algún titular del grupo es crítico', () => {
    const items = [
      n('Refuerzan el operativo terrestre contra el avance del fuego en Orés', { tone: 'warn', at: '2026-07-10T09:00:00Z' }),
      n('Refuerzan el operativo terrestre contra el avance del fuego en Orés tras evacuar', { tone: 'action', at: '2026-07-10T11:00:00Z' }),
    ];
    const clusters = clusterNews(items);
    expect(clusters).toHaveLength(1); // se agruparon
    expect(clusters[0]!.tone).toBe('action'); // el tono crítico se propaga
  });

  it('conserva regiones y medios únicos deduplicados', () => {
    const items = [
      n('La UME actúa en Las Hurdes ante el viento adverso', { source: 'RTVE', region: 'Extremadura' }),
      n('La UME actúa en Las Hurdes por el viento adverso', { source: 'RTVE', region: 'Extremadura' }),
    ];
    const [c] = clusterNews(items);
    expect(c!.sources).toEqual(['RTVE']);
    expect(c!.regions).toEqual(['Extremadura']);
  });

  it('lista vacía → sin grupos', () => {
    expect(clusterNews([])).toEqual([]);
  });
});
