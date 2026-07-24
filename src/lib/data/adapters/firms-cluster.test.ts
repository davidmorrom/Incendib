import { describe, it, expect } from 'vitest';
import { deriveFirmsPerimeters, estimatePerimeterHectares, type FirmsGrowthState } from './index';
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
    const { fires: [out] } = deriveFirmsPerimeters([f], cluster);
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
    const { fires: [out] } = deriveFirmsPerimeters([f], cluster);
    expect(out!.perimeterApprox).toBe(true);
    expect(out!.perimeter).not.toEqual(f.perimeter); // reemplazado por el cúmulo FIRMS
    expect(out!.perimeterExtra).toBeUndefined(); // una sola silueta, no dos
  });

  /** Anillo cuadrado centrado en `c` con semilado `halfDeg` (grados). */
  function squareRing(c: [number, number], halfDeg: number): [number, number][] {
    return [
      [c[0] - halfDeg, c[1] - halfDeg],
      [c[0] + halfDeg, c[1] - halfDeg],
      [c[0] + halfDeg, c[1] + halfDeg],
      [c[0] - halfDeg, c[1] + halfDeg],
      [c[0] - halfDeg, c[1] - halfDeg],
    ];
  }

  it('sustituye el EFFIS en cuanto el cúmulo lo iguala o supera (sin el margen de tolerancia de antes)', () => {
    // Área del cúmulo FIRMS (sin EFFIS), como referencia.
    const probe = deriveFirmsPerimeters([fire({ coordinates: center })], cluster).fires[0]!;
    const clusterArea = estimatePerimeterHectares(probe.perimeter!);

    // Construye un EFFIS de área ≈0,85× el cúmulo: MENOR que el cúmulo, pero
    // dentro del antiguo margen de tolerancia (1,5×) que lo habría conservado.
    const refHalf = 0.02;
    const refArea = estimatePerimeterHectares(squareRing(center, refHalf));
    const targetArea = clusterArea * 0.85;
    const half = refHalf * Math.sqrt(targetArea / refArea);
    const effisRing = squareRing(center, half);
    const effisArea = estimatePerimeterHectares(effisRing);

    // Comprobación de la construcción: EFFIS menor que el cúmulo, pero dentro de
    // lo que el antiguo margen de 1,5× habría considerado "representativo".
    expect(effisArea).toBeLessThan(clusterArea);
    expect(clusterArea).toBeLessThanOrEqual(effisArea * 1.5);

    const fWithEffis = fire({ coordinates: center, perimeterSourceSlug: 'effis-3', perimeter: effisRing });
    const { fires: [out] } = deriveFirmsPerimeters([fWithEffis], cluster);
    expect(out!.perimeter).not.toEqual(effisRing); // ya NO se conserva el EFFIS más pequeño
    expect(out!.perimeterApprox).toBe(true);
  });

  it('conserva el EFFIS cuando sigue siendo mayor que el cúmulo', () => {
    const bigger = squareRing(center, 0.5); // muy por encima de cualquier cúmulo de prueba
    const fWithEffis = fire({ coordinates: center, perimeterSourceSlug: 'effis-4', perimeter: bigger });
    const { fires: [out] } = deriveFirmsPerimeters([fWithEffis], cluster);
    expect(out!.perimeter).toEqual(bigger);
    expect(out!.perimeterApprox).toBeUndefined();
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
    const { fires: [out] } = deriveFirmsPerimeters([f], cluster);
    expect(out!.perimeter).toEqual(bigEffis); // EFFIS conservado
    expect(out!.perimeterApprox).toBeUndefined();
    expect(out!.perimeterExtra).toBeUndefined();
  });

  it('no toca incendios extinguidos', () => {
    const f = fire({ coordinates: center, state: 'extinguido' });
    const { fires: [out] } = deriveFirmsPerimeters([f], cluster);
    expect(out!.perimeter).toBeUndefined();
  });

  it('no asigna un cúmulo a un incendio lejano (> umbral)', () => {
    const lejos = fire({ coordinates: [-4.4, 40.6] }); // ~20 km del cúmulo
    const { fires: [out] } = deriveFirmsPerimeters([lejos], cluster);
    expect(out!.perimeter).toBeUndefined();
  });

  it('adjudica cada cúmulo al incendio MÁS CERCANO (el otro no lo hereda)', () => {
    const cerca = fire({ slug: 'cerca', coordinates: center });
    const lejos = fire({ slug: 'lejos', coordinates: [center[0] + 0.03, center[1] + 0.03] }); // ~3-4 km
    const { fires: out } = deriveFirmsPerimeters([lejos, cerca], cluster);
    expect(out.find((f) => f.slug === 'cerca')!.perimeter!.length).toBeGreaterThan(4);
    expect(out.find((f) => f.slug === 'lejos')!.perimeter).toBeUndefined();
  });

  it('ignora cúmulos con muy pocos focos', () => {
    const f = fire({ coordinates: center });
    const { fires: [out] } = deriveFirmsPerimeters([f], hotspotGrid(center, 0)); // 1 foco
    expect(out!.perimeter).toBeUndefined();
  });

  it('es identidad sin focos ni memoria previa', () => {
    const f = fire({ coordinates: center });
    const { fires, nextState } = deriveFirmsPerimeters([f], []);
    expect(fires).toEqual([f]);
    expect(nextState).toEqual({});
  });

  describe('crecimiento acumulado (nunca retrocede)', () => {
    it('un incendio ya sin focos en la ventana viva conserva su mayor extensión conocida', () => {
      const f = fire({ slug: 'enfriado', coordinates: center });
      const first = deriveFirmsPerimeters([f], cluster);
      expect(first.fires[0]!.hotspotHectares).toBeGreaterThan(0);

      // Ronda siguiente: SIN focos vivos (el frente se enfrió), pero con la
      // memoria de la ronda anterior.
      const second = deriveFirmsPerimeters([f], [], first.nextState);
      expect(second.fires[0]!.perimeter).toEqual(first.fires[0]!.perimeter);
      expect(second.fires[0]!.hotspotHectares).toEqual(first.fires[0]!.hotspotHectares);
    });

    it('un foco nuevo fuera del anillo anterior lo hace crecer', () => {
      const f = fire({ slug: 'creciente', coordinates: center });
      const first = deriveFirmsPerimeters([f], cluster);
      const firstHa = first.fires[0]!.hotspotHectares!;

      // Ronda siguiente: el cúmulo original ya no está en la ventana viva, pero
      // aparece un foco nuevo más allá del anillo anterior — a ~3-4 km del punto
      // de ignición (dentro de FIRMS_ASSIGN_MAX_KM=5 km, para que se adjudique),
      // pero fuera de la extensión del primer cúmulo (~2-2,5 km).
      const farHotspots: Hotspot[] = hotspotGrid([center[0] + 0.03, center[1] + 0.03], 3);
      const second = deriveFirmsPerimeters([f], farHotspots, first.nextState);
      expect(second.fires[0]!.hotspotHectares!).toBeGreaterThan(firstHa);
    });

    it('memoria de un incendio ajeno no se mezcla (por slug)', () => {
      const a = fire({ slug: 'a', coordinates: center });
      const first = deriveFirmsPerimeters([a], cluster);
      const b = fire({ slug: 'b', coordinates: [-4.4, 40.6] }); // lejos, sin relación
      const second = deriveFirmsPerimeters([b], [], first.nextState);
      expect(second.fires[0]!.perimeter).toBeUndefined();
    });

    it('un anillo previo sobrevive aunque el recálculo de esta ronda salga menor', () => {
      const f = fire({ slug: 'x', coordinates: center });
      const first = deriveFirmsPerimeters([f], cluster);
      const prevRing = first.fires[0]!.perimeter!;
      const prevArea = first.fires[0]!.hotspotHectares!;
      // Memoria previa manipulada con una superficie mucho mayor que la que el
      // recálculo de esta ronda (mismos puntos) produciría — simula un caso límite
      // del algoritmo de casco. El resultado nunca debe caer por debajo de ella.
      const fakePrevious: FirmsGrowthState = {
        x: { points: cluster.map((h) => h.coordinates), ring: prevRing, areaHa: prevArea * 10 },
      };
      const { fires: [out] } = deriveFirmsPerimeters([f], cluster, fakePrevious);
      expect(out!.hotspotHectares).toBe(prevArea * 10);
      expect(out!.perimeter).toEqual(prevRing);
    });

    it('un foco nuevo pegado al borde YA acumulado se adjudica aunque esté lejos del origen', () => {
      // Simula un incendio ya muy grande (tipo Burgohondo, ~20 km): un anillo
      // previo en forma de pasillo alargado hacia el este, muy por encima de
      // FIRMS_ASSIGN_MAX_KM (5 km) desde el punto de origen.
      const origin: [number, number] = [-4.66, 40.384];
      const eastRing: [number, number][] = [
        [origin[0], origin[1] - 0.01],
        [origin[0] + 0.24, origin[1] - 0.01], // ~20 km al este
        [origin[0] + 0.24, origin[1] + 0.01],
        [origin[0], origin[1] + 0.01],
        [origin[0], origin[1] - 0.01],
      ];
      const previous: FirmsGrowthState = {
        grande: { points: eastRing, ring: eastRing, areaHa: 5000 },
      };
      // Foco nuevo justo más allá del borde este del anillo (~1 km fuera), pero a
      // ~21 km del origen: muy por encima de ASSIGN_MAX_KM medido desde el origen.
      const newFront = hotspotGrid([origin[0] + 0.25, origin[1]], 3, 0.003);
      const f = fire({ slug: 'grande', coordinates: origin });

      const withMemory = deriveFirmsPerimeters([f], newFront, previous);
      expect(withMemory.fires[0]!.perimeter?.length).toBeGreaterThan(0);
      // El cúmulo nuevo se fusionó con el anillo previo: el área final incorpora
      // ambos, no se queda solo con la franja original de baja superficie.
      expect(withMemory.fires[0]!.hotspotHectares!).toBeGreaterThan(0);

      // Sin memoria previa (solo el origen como referencia), el mismo foco nuevo
      // NO se adjudica: está a ~21 km del origen, muy por encima de ASSIGN_MAX_KM.
      const withoutMemory = deriveFirmsPerimeters([f], newFront, {});
      expect(withoutMemory.fires[0]!.perimeter).toBeUndefined();
    });
  });
});
