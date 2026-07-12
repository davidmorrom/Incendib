import { describe, it, expect } from 'vitest';
import { rankByProvince } from './ranking';
import type { Fire } from '@/types/fire';

function fire(p: Partial<Fire>): Fire {
  return {
    slug: p.slug ?? 'x',
    name: p.name ?? 'Incendio',
    municipality: p.municipality ?? '—',
    province: p.province ?? 'Almería',
    region: p.region ?? 'Andalucía',
    country: p.country ?? 'ES',
    state: p.state ?? 'activo',
    level: p.level ?? null,
    hectares: p.hectares ?? 0,
    hectaresApprox: p.hectaresApprox,
    coordinates: p.coordinates ?? [-2, 37],
    startedAt: p.startedAt ?? '2026-07-12T00:00:00Z',
    updatedAt: p.updatedAt ?? '2026-07-12T00:00:00Z',
    sources: p.sources ?? ['firms'],
  };
}

describe('rankByProvince', () => {
  it('agrupa por provincia y cuenta total y activos', () => {
    const rows = rankByProvince([
      fire({ province: 'Almería', state: 'activo' }),
      fire({ province: 'Almería', state: 'extinguido' }),
      fire({ province: 'León', region: 'Castilla y León', state: 'activo' }),
    ]);
    const alm = rows.find((r) => r.province === 'Almería')!;
    expect(alm.total).toBe(2);
    expect(alm.activos).toBe(1);
  });

  it('ordena por activos, luego total, luego superficie', () => {
    const rows = rankByProvince([
      fire({ province: 'A', state: 'activo' }),
      fire({ province: 'A', state: 'activo' }),
      fire({ province: 'B', state: 'activo' }),
      fire({ province: 'B', state: 'extinguido', hectares: 999 }),
    ]);
    expect(rows[0]!.province).toBe('A'); // 2 activos > 1 activo
  });

  it('suma superficie y marca aproximada; toma el nivel máximo', () => {
    const rows = rankByProvince([
      fire({ province: 'C', hectares: 100, level: 1 }),
      fire({ province: 'C', hectares: 50, hectaresApprox: true, level: 2 }),
    ]);
    expect(rows[0]!.hectares).toBe(150);
    expect(rows[0]!.hectaresApprox).toBe(true);
    expect(rows[0]!.maxLevel).toBe(2);
  });

  it('separa provincias homónimas de distinto país/región', () => {
    const rows = rankByProvince([
      fire({ province: 'Guarda', region: 'Guarda', country: 'PT' }),
      fire({ province: 'Almería', region: 'Andalucía', country: 'ES' }),
    ]);
    expect(rows).toHaveLength(2);
  });
});
