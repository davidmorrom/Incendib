import { describe, it, expect } from 'vitest';
import { deriveFirmsPerimeters } from './index';
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
function hotspotGrid(center: [number, number], half: number, stepDeg = 0.006): Hotspot[] {
  const out: Hotspot[] = [];
  for (let i = -half; i <= half; i++) {
    for (let j = -half; j <= half; j++) {
      out.push({
        id: `h-${center[0]}-${i}-${j}`,
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

describe('deriveFirmsPerimeters', () => {
  const center: [number, number] = [-4.66, 40.384];
  const cluster = hotspotGrid(center, 3); // 7×7 = 49 focos conexos

  it('dibuja el perímetro del cúmulo de focos en un incendio sin perímetro', () => {
    const f = fire({ coordinates: center });
    const [out] = deriveFirmsPerimeters([f], cluster);
    expect(out!.perimeter!.length).toBeGreaterThan(4);
    expect(out!.perimeterApprox).toBe(true);
    expect(out!.hotspotHectares).toBeGreaterThan(0);
  });

  it('sustituye el perímetro EFFIS pequeño por el cúmulo FIRMS si el fuego ha crecido mucho', () => {
    const f = fire({
      coordinates: center,
      hectares: 100,
      hectaresApprox: true,
      perimeterSourceSlug: 'effis-1',
      perimeter: [
        [-4.662, 40.383],
        [-4.658, 40.383],
        [-4.658, 40.385],
        [-4.662, 40.385],
        [-4.662, 40.383],
      ], // cicatriz pequeña (~pocas ha) frente a un cúmulo grande
    });
    const [out] = deriveFirmsPerimeters([f], cluster);
    expect(out!.perimeterApprox).toBe(true);
    expect(out!.perimeter).not.toEqual(f.perimeter); // reemplazado por el cúmulo FIRMS
    expect(out!.perimeterExtra).toBeUndefined(); // una sola silueta, no dos
  });

  it('conserva el perímetro EFFIS si es representativo (no lo duplica)', () => {
    const bigEffis: [number, number][] = [
      [-4.685, 40.365],
      [-4.635, 40.365],
      [-4.635, 40.405],
      [-4.685, 40.405],
      [-4.685, 40.365],
    ]; // área grande que ya cubre el cúmulo
    const f = fire({
      coordinates: center,
      hectares: 5000,
      perimeterSourceSlug: 'effis-2',
      perimeter: bigEffis,
    });
    const [out] = deriveFirmsPerimeters([f], cluster);
    expect(out!.perimeter).toEqual(bigEffis); // EFFIS conservado
    expect(out!.perimeterApprox).toBeUndefined();
    expect(out!.perimeterExtra).toBeUndefined();
  });

  it('no toca incendios extinguidos', () => {
    const f = fire({ coordinates: center, state: 'extinguido' });
    const [out] = deriveFirmsPerimeters([f], cluster);
    expect(out!.perimeter).toBeUndefined();
  });

  it('no asigna un cúmulo a un incendio lejano (> umbral)', () => {
    const lejos = fire({ coordinates: [-4.4, 40.6] }); // ~20 km del cúmulo
    const [out] = deriveFirmsPerimeters([lejos], cluster);
    expect(out!.perimeter).toBeUndefined();
  });

  it('adjudica cada cúmulo al incendio MÁS CERCANO (el otro no lo hereda)', () => {
    const cerca = fire({ slug: 'cerca', coordinates: center });
    const lejos = fire({ slug: 'lejos', coordinates: [center[0] + 0.03, center[1] + 0.03] }); // ~3-4 km
    const out = deriveFirmsPerimeters([lejos, cerca], cluster);
    expect(out.find((f) => f.slug === 'cerca')!.perimeter!.length).toBeGreaterThan(4);
    expect(out.find((f) => f.slug === 'lejos')!.perimeter).toBeUndefined();
  });

  it('ignora cúmulos con muy pocos focos', () => {
    const f = fire({ coordinates: center });
    const [out] = deriveFirmsPerimeters([f], hotspotGrid(center, 0)); // 1 foco
    expect(out!.perimeter).toBeUndefined();
  });

  it('es identidad sin focos', () => {
    const f = fire({ coordinates: center });
    expect(deriveFirmsPerimeters([f], [])).toEqual([f]);
  });
});
