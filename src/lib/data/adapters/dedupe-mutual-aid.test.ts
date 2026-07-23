import { describe, it, expect } from 'vitest';
import { dedupeMutualAidFires } from './index';
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

describe('dedupeMutualAidFires', () => {
  it('fusiona el caso real La Mierla/Guadalajara (INFORCYL + INFOCA, ~120 m)', () => {
    const mierla = fire({
      slug: 'cyl-mierla-la-42-106-26',
      name: 'Mierla (la)',
      coordinates: [-3.2374264589583754, 40.940111142687826],
      hectares: 0,
      sources: ['jcyl'],
    });
    const guadalajara = fire({
      slug: 'and-guadalajara-1088',
      name: 'Guadalajara',
      coordinates: [-3.236446192240136, 40.94092872093864],
      hectares: 35268,
      perimeterSourceSlug: 'effis-561620',
      sources: ['infoca'],
    });
    const out = dedupeMutualAidFires([mierla, guadalajara]);
    expect(out).toHaveLength(1);
    // Se conserva el más informativo (mayor superficie ya adjudicada).
    expect(out[0]?.slug).toBe('and-guadalajara-1088');
    expect(out[0]?.hectares).toBe(35268);
    // Ambas fuentes quedan anotadas (transparencia, no se oculta que hay dos partes).
    expect(out[0]?.sources).toEqual(expect.arrayContaining(['infoca', 'jcyl']));
  });

  it('NO fusiona incendios distintos de la misma fuente, por cerca que estén', () => {
    const a = fire({ slug: 'a', coordinates: [0, 0], sources: ['jcyl'] });
    const b = fire({ slug: 'b', coordinates: [0.0001, 0.0001], sources: ['jcyl'] });
    const out = dedupeMutualAidFires([a, b]);
    expect(out).toHaveLength(2);
  });

  it('NO fusiona fuentes distintas si están lejos (>1 km) y sin topónimo común', () => {
    const a = fire({ slug: 'a', coordinates: [-3.2, 40.9], sources: ['jcyl'] });
    const b = fire({ slug: 'b', coordinates: [-3.1, 40.9], sources: ['infoca'] });
    const out = dedupeMutualAidFires([a, b]);
    expect(out).toHaveLength(2);
  });

  it('fusiona el caso real Selas (INFORCYL + INFOCAM, mismo municipio+provincia a 2,85 km)', () => {
    // Dos sistemas de emergencia reportan el mismo fuego de Selas (Guadalajara)
    // en apoyo mutuo, pero cada uno lo geolocaliza en un punto distinto: 2,85 km,
    // por encima del umbral de proximidad pura (1 km). El topónimo idéntico
    // (municipio + provincia) los identifica como el mismo incendio.
    const cyl = fire({
      slug: 'cyl-selas-42-107-26',
      name: 'Selas',
      municipality: 'Selas',
      province: 'Guadalajara',
      coordinates: [-2.100190112678745, 40.95174413758945],
      hectares: 0,
      sources: ['jcyl'],
    });
    const clm = fire({
      slug: 'clm-selas-2026190290',
      name: 'Selas',
      municipality: 'Selas',
      province: 'Guadalajara',
      coordinates: [-2.070653953723189, 40.93912443222499],
      hectares: 1429,
      perimeterSourceSlug: 'effis-selas',
      sources: ['infocam'],
    });
    const out = dedupeMutualAidFires([cyl, clm]);
    expect(out).toHaveLength(1);
    expect(out[0]?.sources).toEqual(expect.arrayContaining(['jcyl', 'infocam']));
  });

  it('NO fusiona dos incendios distintos que comparten municipio+provincia pero están lejos (>tope)', () => {
    // Salvaguarda: un municipio grande puede tener dos fuegos reales separados.
    // Ocultar uno sería peor que mostrar un duplicado, así que el topónimo común
    // NO basta si superan el tope de distancia.
    const a = fire({
      slug: 'a',
      municipality: 'Cáceres',
      province: 'Cáceres',
      coordinates: [-6.4, 39.4],
      sources: ['jcyl'],
    });
    const b = fire({
      slug: 'b',
      municipality: 'Cáceres',
      province: 'Cáceres',
      coordinates: [-6.2, 39.35], // ~18 km
      sources: ['infoca'],
    });
    const out = dedupeMutualAidFires([a, b]);
    expect(out).toHaveLength(2);
  });

  it('municipio homónimo de PROVINCIAS distintas + fuera de proximidad pura → NO fusiona', () => {
    const a = fire({
      slug: 'a',
      municipality: 'San Martín',
      province: 'Ávila',
      coordinates: [-4.4, 40.35],
      sources: ['jcyl'],
    });
    const b = fire({
      slug: 'b',
      municipality: 'San Martín',
      province: 'Madrid',
      coordinates: [-4.36, 40.36], // ~3,5 km, provincia distinta
      sources: ['infoca'],
    });
    const out = dedupeMutualAidFires([a, b]);
    expect(out).toHaveLength(2);
  });

  it('sin provincia (p. ej. Cataluña, «—») no fusiona por topónimo, solo por proximidad', () => {
    const a = fire({
      slug: 'a',
      municipality: 'Tortosa',
      province: '—',
      coordinates: [0.5, 40.8],
      sources: ['catalunya'],
    });
    const b = fire({
      slug: 'b',
      municipality: 'Tortosa',
      province: '—',
      coordinates: [0.53, 40.81], // ~2,6 km, sin provincia → no aplica el topónimo
      sources: ['jcyl'],
    });
    const out = dedupeMutualAidFires([a, b]);
    expect(out).toHaveLength(2);
  });

  it('NO fusiona si uno de los dos ya está extinguido (no describen el mismo episodio en curso)', () => {
    const a = fire({
      slug: 'a',
      coordinates: [-3.2374264589583754, 40.940111142687826],
      sources: ['jcyl'],
      state: 'activo',
    });
    const b = fire({
      slug: 'b',
      coordinates: [-3.236446192240136, 40.94092872093864],
      sources: ['infoca'],
      state: 'extinguido',
    });
    const out = dedupeMutualAidFires([a, b]);
    expect(out).toHaveLength(2);
  });

  it('conserva el perímetro real aunque el otro gemelo reporte más hectáreas (no solo el número manda)', () => {
    // Gemelo A: más hectáreas oficiales, pero SIN perímetro (no adjudicado a
    // ningún área EFFIS). Gemelo B: menos hectáreas, pero SÍ tiene un
    // perímetro real ya adjudicado por attachPerimeters. Perder ese perímetro
    // solo por el número de B ser menor dejaría el incidente sin forma real,
    // y el siguiente paso (deriveApproxPerimeters) le dibujaría una extensión
    // aproximada como si nunca hubiera tenido una oficial.
    const ring: [number, number][] = [
      [-3.2, 40.9],
      [-3.19, 40.9],
      [-3.19, 40.91],
      [-3.2, 40.9],
    ];
    const a = fire({
      slug: 'a-mas-hectareas-sin-forma',
      coordinates: [-3.2, 40.9],
      hectares: 300,
      sources: ['jcyl'],
    });
    const b = fire({
      slug: 'b-menos-hectareas-con-forma',
      coordinates: [-3.1995, 40.9002],
      hectares: 50,
      perimeter: ring,
      perimeterSourceSlug: 'effis-999',
      sources: ['infoca'],
    });
    const out = dedupeMutualAidFires([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0]?.slug).toBe('b-menos-hectareas-con-forma');
    expect(out[0]?.perimeter).toEqual(ring);
    expect(out[0]?.perimeterSourceSlug).toBe('effis-999');
    expect(out[0]?.sources).toEqual(expect.arrayContaining(['infoca', 'jcyl']));
  });

  it('es inerte con una lista vacía o sin duplicados', () => {
    expect(dedupeMutualAidFires([])).toEqual([]);
    const only = [fire({ slug: 'a' })];
    expect(dedupeMutualAidFires(only)).toEqual(only);
  });
});
