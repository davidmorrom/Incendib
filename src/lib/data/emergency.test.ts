import { describe, it, expect } from 'vitest';
import {
  applyEmergencyOverrides,
  mergeEmergency,
  EMERGENCY_OVERRIDES,
  type EmergencyOverride,
} from './emergency';
import type { Fire, TimelineEntry } from '@/types/fire';

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
    startedAt: '2026-07-22T00:00:00Z',
    updatedAt: '2026-07-22T00:00:00Z',
    sources: ['jcyl'],
    ...p,
  };
}

const NOW = Date.parse('2026-07-23T18:00:00+02:00');
const FUTURE = '2026-08-06T00:00:00+02:00';
const PAST = '2026-07-20T00:00:00+02:00';

const burgohondo = fire({
  slug: 'cyl-burgohondo-1-2-3',
  name: 'Burgohondo',
  municipality: 'Burgohondo',
  province: 'Ávila',
  region: 'Castilla y León',
  level: 2,
  coordinates: [-4.7376, 40.3577],
  timeline: [{ at: '2026-07-22T13:02:00+02:00', label: 'Declarado', state: 'activo' }],
});

const patch: Partial<Fire> = {
  perimeter: [
    [-4.74, 40.37],
    [-4.6, 40.4],
    [-4.58, 40.38],
    [-4.72, 40.36],
  ],
  perimeterProvisional: true,
  hectares: 1500,
  hectaresApprox: true,
  evacuation: 'Desalojo de Puente Nueva.',
  timeline: [{ at: '2026-07-23T17:30:00+02:00', label: 'Alcanza Iruelas', source: 'COPE', url: 'https://example.com' }],
};

const override: EmergencyOverride = {
  id: 'burgohondo-test',
  match: { coordinates: [-4.7376, 40.3577], radiusKm: 6, municipalityIncludes: 'burgohondo' },
  patch,
  standalone: fire({
    slug: 'cyl-burgohondo-standalone',
    name: 'Burgohondo',
    municipality: 'Burgohondo',
    reconstructed: true,
    ...patch,
  }),
  expiresAt: FUTURE,
};

describe('mergeEmergency', () => {
  it('fusiona el patch, marca edited y combina la cronología ordenada desc', () => {
    const out = mergeEmergency(burgohondo, patch);
    expect(out.edited).toBe(true);
    expect(out.overriddenFields).toEqual(
      expect.arrayContaining(['perimeter', 'perimeterProvisional', 'hectares', 'evacuation', 'timeline']),
    );
    expect(out.hectares).toBe(1500);
    expect(out.hectaresApprox).toBe(true);
    expect(out.perimeterProvisional).toBe(true);
    // La cronología de la fuente (Declarado) NO se pierde: se combina con la del patch.
    const labels = (out.timeline as TimelineEntry[]).map((e) => e.label);
    expect(labels).toContain('Declarado');
    expect(labels).toContain('Alcanza Iruelas');
    // Orden descendente (más reciente primero).
    expect(out.timeline![0]!.label).toBe('Alcanza Iruelas');
  });

  it('no duplica entradas de cronología idénticas (at+label)', () => {
    const dup: Partial<Fire> = {
      timeline: [{ at: '2026-07-22T13:02:00+02:00', label: 'Declarado', state: 'activo' }],
    };
    const out = mergeEmergency(burgohondo, dup);
    const declaradas = (out.timeline as TimelineEntry[]).filter((e) => e.label === 'Declarado');
    expect(declaradas).toHaveLength(1);
  });
});

describe('applyEmergencyOverrides', () => {
  it('fusiona sobre el incendio en vivo más cercano dentro del radio y municipio', () => {
    const out = applyEmergencyOverrides([burgohondo], [override], NOW);
    expect(out).toHaveLength(1);
    expect(out[0]!.edited).toBe(true);
    expect(out[0]!.perimeter).toEqual(patch.perimeter);
    expect(out[0]!.evacuation).toBe('Desalojo de Puente Nueva.');
    // Conserva la identidad (slug) de la fuente en vivo, no crea uno nuevo.
    expect(out[0]!.slug).toBe('cyl-burgohondo-1-2-3');
    // No añade el standalone si hubo match.
    expect(out.filter((f) => f.reconstructed)).toHaveLength(0);
  });

  it('añade la ficha standalone (reconstruida) si no hay match en vivo', () => {
    const out = applyEmergencyOverrides([], [override], NOW);
    expect(out).toHaveLength(1);
    expect(out[0]!.slug).toBe('cyl-burgohondo-standalone');
    expect(out[0]!.reconstructed).toBe(true);
  });

  it('no fusiona si el municipio no coincide, aunque esté cerca', () => {
    const vecino = fire({
      slug: 'cyl-navaluenga-9',
      name: 'Navaluenga',
      municipality: 'Navaluenga',
      coordinates: [-4.72, 40.36], // a <1 km del match
    });
    const out = applyEmergencyOverrides([vecino], [override], NOW);
    // No se toca el vecino y se añade el standalone (no había match válido).
    expect(out.find((f) => f.slug === 'cyl-navaluenga-9')!.edited).toBeUndefined();
    expect(out.find((f) => f.reconstructed)).toBeTruthy();
  });

  it('hectaresFallback solo se aplica si el incendio en vivo no trae superficie', () => {
    // Patch que NO fija superficie (como el override real de Burgohondo).
    const soloExtra: EmergencyOverride = {
      ...override,
      patch: { perimeterExtra: patch.perimeter, evacuation: 'x' },
      hectaresFallback: 2547,
    };
    // Sin cifra en vivo → usa el fallback (marcado aproximado).
    const sin = applyEmergencyOverrides([fire({ ...burgohondo, hectares: 0 })], [soloExtra], NOW);
    expect(sin[0]!.hectares).toBe(2547);
    expect(sin[0]!.hectaresApprox).toBe(true);
    expect(sin[0]!.overriddenFields).toContain('hectares');
    // Con cifra oficial/EFFIS en vivo → NO se pisa.
    const con = applyEmergencyOverrides([fire({ ...burgohondo, hectares: 1234 })], [soloExtra], NOW);
    expect(con[0]!.hectares).toBe(1234);
  });

  it('no hace nada con overrides caducados (queda inerte)', () => {
    const caducado = { ...override, expiresAt: PAST };
    const out = applyEmergencyOverrides([burgohondo], [caducado], NOW);
    expect(out).toEqual([burgohondo]);
    expect(out[0]!.edited).toBeUndefined();
  });

  it('elige el incendio en vivo MÁS CERCANO cuando hay varios candidatos', () => {
    const lejos = fire({ slug: 'lejos', municipality: 'Burgohondo', coordinates: [-4.70, 40.39] });
    const cerca = fire({ slug: 'cerca', municipality: 'Burgohondo', coordinates: [-4.7376, 40.3577] });
    const out = applyEmergencyOverrides([lejos, cerca], [override], NOW);
    expect(out.find((f) => f.slug === 'cerca')!.edited).toBe(true);
    expect(out.find((f) => f.slug === 'lejos')!.edited).toBeUndefined();
  });

  it('no fusiona contra una ficha ya reconstruida (evita colisión entre overrides)', () => {
    const recon = fire({
      slug: 'otra-recon',
      municipality: 'Burgohondo',
      coordinates: [-4.7376, 40.3577],
      reconstructed: true,
    });
    const out = applyEmergencyOverrides([recon], [override], NOW);
    // La reconstruida no se toca; se añade el standalone del override.
    expect(out.find((f) => f.slug === 'otra-recon')!.edited).toBeUndefined();
    expect(out.find((f) => f.slug === 'cyl-burgohondo-standalone')).toBeTruthy();
  });

  it('identidad si no hay overrides activos', () => {
    expect(applyEmergencyOverrides([burgohondo], [], NOW)).toEqual([burgohondo]);
  });
});

describe('EMERGENCY_OVERRIDES (datos reales)', () => {
  const burgo = EMERGENCY_OVERRIDES.find((o) => o.id === 'burgohondo-2026-07')!;

  it('el override de Burgohondo NO toca perímetro ni superficie (lo hace FIRMS)', () => {
    // El perímetro y la superficie los pone `deriveFirmsPerimeters` (cúmulo de
    // focos); el override solo añade evacuación y cronología.
    expect(burgo).toBeTruthy();
    expect(burgo.patch.perimeter).toBeUndefined();
    expect(burgo.patch.perimeterApprox).toBeUndefined();
    expect(burgo.patch.perimeterExtra).toBeUndefined();
    expect(burgo.patch.hectares).toBeUndefined();
    expect(burgo.patch.evacuation).toBeTruthy();
    expect(Array.isArray(burgo.patch.timeline)).toBe(true);
  });

  it('al fusionar sobre un incendio con perímetro/superficie, los conserva y añade evacuación+cronología', () => {
    const live = fire({
      slug: 'cyl-burgohondo-5-152-26',
      name: 'Burgohondo',
      municipality: 'Burgohondo',
      province: 'Ávila',
      coordinates: [-4.7376, 40.3577],
      hectares: 2547,
      hectaresApprox: true,
      perimeter: [
        [-4.75, 40.35],
        [-4.69, 40.35],
        [-4.69, 40.39],
        [-4.75, 40.39],
      ],
    });
    const out = applyEmergencyOverrides([live], [burgo], NOW);
    const f = out.find((x) => x.slug === 'cyl-burgohondo-5-152-26')!;
    expect(f.perimeter).toEqual(live.perimeter); // perímetro intacto
    expect(f.hectares).toBe(2547); // superficie intacta
    expect(f.edited).toBe(true);
    expect(f.evacuation).toContain('Iruelas');
    expect((f.timeline?.length ?? 0)).toBeGreaterThan(0);
  });
});
