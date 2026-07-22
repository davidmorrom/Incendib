import { describe, it, expect } from 'vitest';
import { attachPerimeters } from './index';
import type { Fire } from '@/types/fire';

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
    coordinates: [0, 0],
    startedAt: '2026-07-10T00:00:00Z',
    updatedAt: '2026-07-10T00:00:00Z',
    sources: ['jcyl'],
    ...p,
  };
}

/** Área quemada EFFIS (con perímetro) centrada en `coords`. */
function area(coords: [number, number], hectares: number): Fire {
  const [lon, lat] = coords;
  const ring: [number, number][] = [
    [lon - 0.01, lat - 0.01],
    [lon + 0.01, lat - 0.01],
    [lon + 0.01, lat + 0.01],
    [lon - 0.01, lat + 0.01],
    [lon - 0.01, lat - 0.01],
  ];
  return fire({ slug: 'effis', state: 'extinguido', hectares, coordinates: [lon, lat], sources: ['effis'], perimeter: ring });
}

describe('attachPerimeters', () => {
  const perims = [area([-4.505, 40.405], 15), area([-6.003, 42.001], 50)];

  it('NO sobrescribe la superficie oficial (caso El Barraco: 140 vs EFFIS 15)', () => {
    const official = fire({ slug: 'off', coordinates: [-4.5, 40.4], hectares: 140 });
    const [out] = attachPerimeters([official], perims);
    expect(out?.hectares).toBe(140);
    expect(out?.hectaresApprox).toBeFalsy();
    expect(out?.perimeter).toBeDefined(); // sí recibe forma
  });

  it('rellena superficie estimada (approx) cuando no hay cifra oficial', () => {
    const noData = fire({ slug: 'nd', coordinates: [-6.0, 42.0], hectares: 0 });
    const [out] = attachPerimeters([noData], perims);
    expect(out?.hectares).toBe(50);
    expect(out?.hectaresApprox).toBe(true);
    expect(out?.perimeter).toBeDefined();
  });

  it('no adjunta nada si el área quemada está lejos (>12 km)', () => {
    const far = fire({ slug: 'far', coordinates: [0, 41], hectares: 0 });
    const [out] = attachPerimeters([far], perims);
    expect(out?.perimeter).toBeUndefined();
    expect(out?.hectares).toBe(0);
    expect(out?.hectaresApprox).toBeFalsy();
  });

  it('respeta un perímetro ya presente (no lo pisa)', () => {
    const own: [number, number][] = [
      [1, 1],
      [2, 1],
      [2, 2],
      [1, 1],
    ];
    const withPerim = fire({ slug: 'wp', coordinates: [-4.5, 40.4], perimeter: own });
    const [out] = attachPerimeters([withPerim], perims);
    expect(out?.perimeter).toEqual(own);
  });

  it('sin perímetros de entrada, devuelve los incendios tal cual', () => {
    const f = fire({ slug: 'a', hectares: 0 });
    expect(attachPerimeters([f], [])).toEqual([f]);
  });

  it('engancha un GRAN incendio por el borde aunque el centroide quede a >12 km (caso La Mierla)', () => {
    // Polígono alargado ~40 km hacia el noreste: centroide a ~20 km del marcador.
    const ring: [number, number][] = [
      [-3.25, 40.93],
      [-2.91, 40.93],
      [-2.91, 41.24],
      [-3.25, 41.24],
      [-3.25, 40.93],
    ];
    const big = fire({
      slug: 'effis-big',
      state: 'extinguido',
      hectares: 35268,
      coordinates: [-3.08, 41.09], // centroide
      sources: ['effis'],
      perimeter: ring,
      startedAt: '2026-07-16T12:08:00Z',
    });
    // Marcador oficial en el punto de ignición, justo fuera del anillo (~0.4 km).
    const official = fire({
      slug: 'and-guadalajara',
      coordinates: [-3.2555, 40.94],
      hectares: 0,
      startedAt: '2026-07-16T11:55:00Z',
    });
    const [out] = attachPerimeters([official], [big]);
    expect(out?.perimeter).toEqual(ring);
    expect(out?.hectares).toBe(35268);
    expect(out?.hectaresApprox).toBe(true);
  });

  it('adjudica un área quemada a UN solo incendio (1:1), aunque dos caigan dentro', () => {
    // Dos incidentes distintos DENTRO del mismo polígono: solo uno lo hereda (no se
    // duplica la superficie), sin depender del orden de las fuentes.
    const scar = area([-3.0, 41.0], 35268);
    const a = fire({ slug: 'a', coordinates: [-3.003, 41.003], hectares: 0 }); // dentro
    const b = fire({ slug: 'b', coordinates: [-2.997, 40.997], hectares: 0 }); // dentro
    const out = attachPerimeters([a, b], [scar]);
    const withPerim = out.filter((f) => f.perimeter);
    const withApprox = out.filter((f) => f.hectaresApprox);
    expect(withPerim).toHaveLength(1); // exactamente uno hereda la forma
    expect(withApprox).toHaveLength(1); // …y la superficie (no doble cómputo)
    expect(withPerim[0]!.hectares).toBe(35268);
  });

  it('un incendio LEJANO no hereda la superficie enorme de la cicatriz de otro fuego', () => {
    // Cicatriz grande con vértices densos en el borde oeste (como EFFIS real).
    const bigRing: [number, number][] = [
      [-3.1, 41.0],
      [-2.9, 41.0],
      [-2.9, 41.2],
      [-3.1, 41.2],
      [-3.1, 41.1], // vértice intermedio en el borde oeste (~250 m en EFFIS real)
      [-3.1, 41.0],
    ];
    const big = fire({
      slug: 'effis-big',
      state: 'extinguido',
      hectares: 20000,
      coordinates: [-3.0, 41.1],
      sources: ['effis'],
      perimeter: bigRing,
      startedAt: '2026-07-16T00:00:00Z',
    });
    // Fuego distinto a ~7 km del borde oeste: no debe heredar 20 000 ha (dato falso).
    const distant = fire({
      slug: 'distant',
      coordinates: [-3.18, 41.1],
      hectares: 0,
      startedAt: '2026-07-18T00:00:00Z',
    });
    const [out] = attachPerimeters([distant], [big]);
    expect(out?.perimeter).toBeUndefined();
    expect(out?.hectares).toBe(0);
    expect(out?.hectaresApprox).toBeFalsy();
  });

  it('dos áreas distintas se reparten entre dos incendios (una cada uno)', () => {
    const a1 = area([-3.0, 41.0], 100);
    const a2 = area([-6.0, 42.0], 200);
    const f1 = fire({ slug: 'f1', coordinates: [-3.0, 41.0], hectares: 0 });
    const f2 = fire({ slug: 'f2', coordinates: [-6.0, 42.0], hectares: 0 });
    const out = attachPerimeters([f1, f2], [a1, a2]);
    const bySlug = Object.fromEntries(out.map((f) => [f.slug, f]));
    expect(bySlug.f1!.hectares).toBe(100);
    expect(bySlug.f2!.hectares).toBe(200);
  });

  it('NO hereda una cicatriz detectada mucho antes del inicio (reactivación)', () => {
    const scar = { ...area([-4.505, 40.405], 140), startedAt: '2026-06-15T00:00:00Z' };
    const nuevo = fire({
      slug: 'nuevo',
      coordinates: [-4.5, 40.4],
      hectares: 0,
      startedAt: '2026-07-10T00:00:00Z', // 25 días después de la cicatriz
    });
    const [out] = attachPerimeters([nuevo], [scar]);
    expect(out?.perimeter).toBeUndefined();
    expect(out?.hectares).toBe(0);
    expect(out?.hectaresApprox).toBeFalsy();
  });
});
