import { describe, it, expect } from 'vitest';
import { keyToken, relatedNews } from './news-match';
import type { Fire } from '@/types/fire';
import type { NewsItem } from '@/lib/data/news';

function fire(p: Partial<Fire>): Fire {
  return {
    slug: 'x',
    name: 'X',
    municipality: 'Barraco (el)',
    province: 'Ávila',
    region: 'Castilla y León',
    country: 'ES',
    state: 'activo',
    level: null,
    hectares: 0,
    coordinates: [-4.5, 40.4],
    startedAt: '2026-07-08T00:00:00Z',
    updatedAt: '2026-07-10T00:00:00Z',
    sources: ['jcyl'],
    ...p,
  };
}

function news(title: string, at = '2026-07-10T10:00:00Z'): NewsItem {
  return { id: title, region: 'X', tone: 'warn', at, source: 'RTVE', title, url: `https://news/${encodeURIComponent(title)}` };
}

describe('keyToken', () => {
  it('toma el token distintivo (≥5) del topónimo', () => {
    expect(keyToken('Barraco (el)')).toBe('barraco');
    expect(keyToken('Ourense')).toBe('ourense');
  });
  it('descarta artículos y palabras ambiguas → null si no queda token seguro', () => {
    expect(keyToken('La Guardia')).toBeNull(); // "guardia" es ambigua
    expect(keyToken('El Real')).toBeNull();
    expect(keyToken('Urda')).toBeNull(); // 4 chars < 5
  });
});

describe('relatedNews', () => {
  const f = fire({});
  it('empareja titulares que mencionan el municipio (palabra completa) con fuente y enlace', () => {
    const items = [news('La UME refuerza el operativo en El Barraco'), news('Incendio en Cáceres')];
    const out = relatedNews(f, items);
    expect(out).toHaveLength(1);
    expect(out[0]?.url).toContain('http');
    expect(out[0]?.source).toBe('RTVE');
  });
  it('NO empareja municipios ambiguos (evita "Guardia Civil")', () => {
    const g = fire({ municipality: 'La Guardia', name: 'La Guardia' });
    expect(relatedNews(g, [news('La Guardia Civil investiga el incendio')])).toHaveLength(0);
  });
  it('descarta noticias muy anteriores al inicio del incendio', () => {
    expect(relatedNews(f, [news('Gran incendio en El Barraco', '2026-06-01T00:00:00Z')])).toHaveLength(0);
  });
  it('exige palabra completa (no casa dentro de otra palabra)', () => {
    expect(relatedNews(f, [news('Algo sobre Barracox sin relación')])).toHaveLength(0);
  });
});
