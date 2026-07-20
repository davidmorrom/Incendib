import { describe, it, expect } from 'vitest';
import { deriveSatelliteFires } from './index';
import type { Fire, Hotspot } from '@/types/fire';

const NOW = Date.parse('2026-07-20T12:00:00Z');

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
    startedAt: '2026-07-18T00:00:00Z',
    updatedAt: '2026-07-20T00:00:00Z',
    sources: ['jcyl'],
    ...p,
  };
}

let hid = 0;
function hotspot(coords: [number, number], frp = 15): Hotspot {
  return {
    id: `h-${hid++}-${coords.join()}`,
    coordinates: coords,
    frp,
    confidence: 'nominal',
    sensor: 'VIIRS',
    acquiredAt: '2026-07-20T11:00:00Z',
  };
}

/** Genera n focos apretados alrededor de un centro (~0.3 km de paso). */
function clusterAround([lon, lat]: [number, number], n: number): Hotspot[] {
  return Array.from({ length: n }, (_, i) => hotspot([lon + i * 0.003, lat + i * 0.003]));
}

describe('deriveSatelliteFires', () => {
  it('promueve un clúster de focos en zona sin fuente oficial (≥ minCluster)', () => {
    // Cerca de Guadalajara, sin incendio oficial cerca.
    const hs = clusterAround([-2.9, 40.7], 5);
    const out = deriveSatelliteFires([], hs, [], { now: NOW });
    expect(out).toHaveLength(1);
    expect(out[0]?.satelliteOnly).toBe(true);
    expect(out[0]?.state).toBe('activo');
    expect(out[0]?.sources).toEqual(['firms']);
    expect(out[0]?.hectares).toBe(0); // sin EFFIS no inventa superficie
  });

  it('NO promueve un foco aislado sin respaldo de EFFIS (evita ruido)', () => {
    const out = deriveSatelliteFires([], [hotspot([-2.9, 40.7])], [], { now: NOW });
    expect(out).toHaveLength(0);
  });

  it('promueve un foco aislado SI hay un área quemada EFFIS cercana', () => {
    const perimeter: Fire = fire({
      slug: 'effis-123',
      name: 'Área quemada',
      municipality: 'Molina de Aragón',
      province: 'Guadalajara',
      region: 'EFFIS',
      hectares: 1200,
      coordinates: [-2.9, 40.7],
      perimeter: [
        [-2.91, 40.69],
        [-2.89, 40.69],
        [-2.89, 40.71],
        [-2.91, 40.71],
        [-2.91, 40.69],
      ],
      sources: ['effis'],
      state: 'extinguido',
    });
    const out = deriveSatelliteFires([], [hotspot([-2.9, 40.7])], [perimeter], { now: NOW });
    expect(out).toHaveLength(1);
    const f = out[0]!;
    expect(f.satelliteOnly).toBe(true);
    expect(f.municipality).toBe('Molina de Aragón');
    expect(f.province).toBe('Guadalajara');
    expect(f.hectares).toBe(1200);
    expect(f.hectaresApprox).toBe(true); // superficie EFFIS = estimación «~»
    expect(f.perimeter).toBeDefined();
    expect(f.sources).toEqual(['effis', 'firms']);
  });

  it('ignora los focos ya representados por un incendio oficial cercano', () => {
    const official = [fire({ slug: 'cyl-1', coordinates: [-2.9, 40.7] })];
    const hs = clusterAround([-2.9, 40.7], 5); // justo encima del oficial
    const out = deriveSatelliteFires(official, hs, [], { now: NOW });
    expect(out).toHaveLength(0);
  });

  it('separa clústeres lejanos en incidentes distintos', () => {
    const hs = [...clusterAround([-2.9, 40.7], 4), ...clusterAround([-3.8, 40.3], 4)];
    const out = deriveSatelliteFires([], hs, [], { now: NOW });
    expect(out).toHaveLength(2);
  });

  it('no reutiliza el mismo perímetro EFFIS para dos clústeres', () => {
    const perimeter = fire({
      slug: 'effis-9',
      name: 'Área quemada',
      region: 'EFFIS',
      hectares: 500,
      coordinates: [-2.9, 40.7],
      sources: ['effis'],
    });
    const hs = [...clusterAround([-2.9, 40.7], 1), ...clusterAround([-3.8, 40.3], 4)];
    const out = deriveSatelliteFires([], hs, [perimeter], { now: NOW });
    // El clúster cercano al perímetro lo consume; el lejano se promueve por tamaño (4 focos).
    const withPerim = out.filter((f) => f.perimeter || f.hectares > 0);
    expect(withPerim).toHaveLength(1);
    expect(out).toHaveLength(2);
  });

  it('sin focos devuelve []', () => {
    expect(deriveSatelliteFires([fire({})], [], [], { now: NOW })).toEqual([]);
  });
});
