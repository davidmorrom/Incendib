import { describe, it, expect } from 'vitest';
import { confirmWithHotspots, gateByHotspots } from './index';
import type { Fire, Hotspot } from '@/types/fire';

function fire(p: Partial<Fire>): Fire {
  return {
    slug: 'x',
    name: 'X',
    municipality: '—',
    province: '—',
    region: 'R',
    country: 'ES',
    state: 'activo',
    level: null,
    hectares: 0,
    coordinates: [-4.5, 40.4],
    startedAt: '2026-07-12T00:00:00Z',
    updatedAt: '2026-07-12T00:00:00Z',
    sources: ['jcyl'],
    ...p,
  };
}

function hotspot(coords: [number, number]): Hotspot {
  return { id: `h-${coords.join()}`, coordinates: coords, frp: 12, confidence: 'nominal', sensor: 'VIIRS', acquiredAt: '2026-07-12T00:00:00Z' };
}

const near = hotspot([-4.505, 40.404]); // ~1 km de [-4.5, 40.4]
const far = hotspot([2.0, 41.5]); // muy lejos

describe('confirmWithHotspots', () => {
  it('confirma un incendio con foco FIRMS cercano (≤6 km) y guarda la distancia', () => {
    const [f] = confirmWithHotspots([fire({})], [near, far]);
    expect(f?.satelliteConfirmed).toBe(true);
    expect(typeof f?.hotspotKm).toBe('number');
    expect(f?.hotspotKm).toBeLessThan(6);
  });

  it('NO confirma si el foco más cercano está lejos (>6 km)', () => {
    const [f] = confirmWithHotspots([fire({})], [far]);
    expect(f?.satelliteConfirmed).toBeUndefined();
    expect(f?.hotspotKm).toBeUndefined();
  });

  it('sin focos devuelve los incendios sin tocar (no descarta ninguno)', () => {
    const input = [fire({})];
    expect(confirmWithHotspots(input, [])).toEqual(input);
  });
});

describe('gateByHotspots', () => {
  it('deja solo los incendios confirmados por satélite', () => {
    const fires = [fire({ slug: 'a', coordinates: [-4.5, 40.4] }), fire({ slug: 'b', coordinates: [2.0, 41.5] })];
    const out = gateByHotspots(fires, [near]);
    expect(out).toHaveLength(1);
    expect(out[0]?.slug).toBe('a');
  });
});
