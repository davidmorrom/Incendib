import { describe, it, expect } from 'vitest';
import { upgradeExtraFromFirms } from './index';
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
    coordinates: [-4.66, 40.384],
    startedAt: '2026-07-22T00:00:00Z',
    updatedAt: '2026-07-22T00:00:00Z',
    sources: ['jcyl'],
    ...p,
  };
}

/** Rejilla densa de focos (~0,5 km de paso → conexos) alrededor de un centro. */
function hotspotGrid(center: [number, number], n: number, stepDeg = 0.006): Hotspot[] {
  const out: Hotspot[] = [];
  const half = Math.floor(n / 2);
  for (let i = -half; i <= half; i++) {
    for (let j = -half; j <= half; j++) {
      out.push({
        id: `h-${i}-${j}`,
        coordinates: [center[0] + i * stepDeg, center[1] + j * stepDeg],
        frp: 10,
        confidence: 'nominal',
        sensor: 'VIIRS',
        acquiredAt: '2026-07-24T00:00:00Z',
      });
    }
  }
  return out;
}

describe('upgradeExtraFromFirms', () => {
  const center: [number, number] = [-4.66, 40.384];
  const cluster = hotspotGrid(center, 6); // 7×7 = 49 focos conexos

  it('sustituye la extensión editorial por la envolvente del cúmulo FIRMS y actualiza la superficie', () => {
    const f = fire({
      coordinates: center,
      hectares: 50,
      perimeterExtra: [
        [-4.67, 40.38],
        [-4.65, 40.38],
        [-4.65, 40.39],
        [-4.67, 40.39],
      ],
    });
    const [out] = upgradeExtraFromFirms([f], cluster);
    // La extensión cambia (proviene del cúmulo, no del trazo editorial de 4 puntos).
    expect(out!.perimeterExtra!.length).toBeGreaterThan(4);
    // La superficie se actualiza (envolvente > cifra vigente) y queda aproximada.
    expect(out!.hectares).toBeGreaterThan(50);
    expect(out!.hectaresApprox).toBe(true);
  });

  it('no toca fichas sin extensión (perimeterExtra ausente)', () => {
    const f = fire({ coordinates: center, hectares: 50 });
    const [out] = upgradeExtraFromFirms([f], cluster);
    expect(out).toEqual(f);
  });

  it('conserva la extensión editorial si hay pocos focos', () => {
    const extra: [number, number][] = [
      [-4.67, 40.38],
      [-4.65, 40.38],
      [-4.66, 40.39],
    ];
    const f = fire({ coordinates: center, hectares: 50, perimeterExtra: extra });
    const [out] = upgradeExtraFromFirms([f], hotspotGrid(center, 1).slice(0, 3)); // 3 focos < 12
    expect(out!.perimeterExtra).toEqual(extra);
    expect(out!.hectares).toBe(50);
  });

  it('nunca REBAJA una superficie mayor ya presente', () => {
    const f = fire({
      coordinates: center,
      hectares: 999999,
      perimeterExtra: [
        [-4.67, 40.38],
        [-4.65, 40.38],
        [-4.66, 40.39],
      ],
    });
    const [out] = upgradeExtraFromFirms([f], cluster);
    expect(out!.hectares).toBe(999999); // envolvente << cifra vigente → no la pisa
  });

  it('es identidad sin focos', () => {
    const f = fire({ perimeterExtra: [[-4.67, 40.38], [-4.65, 40.38], [-4.66, 40.39]] });
    expect(upgradeExtraFromFirms([f], [])).toEqual([f]);
  });
});
