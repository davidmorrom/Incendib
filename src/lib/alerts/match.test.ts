import { describe, it, expect } from 'vitest';
import {
  fireInZone,
  fireMatchesZones,
  inQuietHours,
  localMinuteOfDay,
  decideFireAlert,
  hotspotMatches,
  hotspotCellId,
  anyoneWantsHotspots,
  haversineKm,
  type MatchableFire,
} from './match';
import { normalizePrefs, type AlertPrefs, type AlertZone } from './prefs';

function fire(o: Partial<MatchableFire> = {}): MatchableFire {
  return {
    slug: 'inc-1',
    level: 2,
    evacuation: undefined,
    coordinates: [-6.37, 39.47], // Cáceres aprox.
    province: 'Cáceres',
    region: 'Extremadura',
    ...o,
  };
}

// Entrada laxa (types/zones parciales) → normalizePrefs la sanea a AlertPrefs v2.
function prefs(o: Record<string, unknown> = {}): AlertPrefs {
  return normalizePrefs({ version: 2, ...o });
}

const geoZone = (o: Partial<AlertZone> = {}): AlertZone => ({
  id: 'g1',
  kind: 'location',
  label: 'z',
  enabled: true,
  lat: 39.47,
  lon: -6.37,
  radiusKm: 40,
  ...o,
});

const provZone = (slug: string, o: Partial<AlertZone> = {}): AlertZone => ({
  id: `p:${slug}`,
  kind: 'province',
  label: slug,
  enabled: true,
  provinceSlug: slug,
  ...o,
});

describe('fireInZone', () => {
  it('empareja por provincia normalizando acentos', () => {
    expect(fireInZone(fire({ province: 'Cáceres' }), provZone('caceres'))).toBe(true);
    expect(fireInZone(fire({ province: 'Ávila', region: 'Castilla y León' }), provZone('avila'))).toBe(true);
  });

  it('resuelve exónimos/variantes bilingües vía alias', () => {
    expect(fireInZone(fire({ province: 'La Coruña' }), provZone('a-coruna'))).toBe(true);
    expect(fireInZone(fire({ province: 'Orense' }), provZone('ourense'))).toBe(true);
    expect(fireInZone(fire({ province: 'Lérida' }), provZone('lleida'))).toBe(true);
    expect(fireInZone(fire({ province: 'Gerona' }), provZone('girona'))).toBe(true);
    expect(fireInZone(fire({ province: 'Guipúzcoa' }), provZone('gipuzkoa'))).toBe(true);
  });

  it('NO empareja por región (CCAA) contra un slug de provincia', () => {
    // La zona-provincia es a nivel provincia, no CCAA; comparar región engañaría.
    expect(fireInZone(fire({ province: '—', region: 'Castilla y León' }), provZone('avila'))).toBe(false);
  });

  it('no empareja provincia distinta', () => {
    expect(fireInZone(fire({ province: 'Cáceres' }), provZone('badajoz'))).toBe(false);
  });

  it('empareja zona geográfica dentro del radio y no fuera', () => {
    expect(fireInZone(fire(), geoZone({ radiusKm: 5 }))).toBe(true);
    // Un incendio a ~200 km cae fuera de un radio de 40 km.
    expect(fireInZone(fire({ coordinates: [-4, 41] }), geoZone({ radiusKm: 40 }))).toBe(false);
  });

  it('una zona deshabilitada nunca empareja', () => {
    expect(fireInZone(fire(), geoZone({ enabled: false }))).toBe(false);
  });
});

describe('fireMatchesZones', () => {
  it('sin ninguna zona definida → global (true)', () => {
    expect(fireMatchesZones(fire(), [])).toBe(true);
  });

  it('con zonas definidas pero TODAS en pausa → no casa ninguna (false)', () => {
    // Regresión: pausar la única zona no debe abrir la manguera nacional.
    expect(fireMatchesZones(fire(), [geoZone({ enabled: false })])).toBe(false);
    expect(fireMatchesZones(fire(), [geoZone({ enabled: false }), provZone('caceres', { enabled: false })])).toBe(
      false,
    );
  });

  it('con zonas habilitadas exige pertenencia a alguna', () => {
    expect(fireMatchesZones(fire(), [geoZone({ lat: 41, lon: -4, radiusKm: 10 })])).toBe(false);
    expect(fireMatchesZones(fire(), [geoZone({ lat: 41, lon: -4, radiusKm: 10 }), provZone('caceres')])).toBe(true);
  });
});

describe('decideFireAlert — pausar todas las zonas silencia (regresión)', () => {
  it('con la única zona en pausa, un incendio lejano NO dispara', () => {
    const p = normalizePrefs({
      version: 2,
      zones: [{ id: 'a', kind: 'location', lat: 40, lon: -6, radiusKm: 20, enabled: false }],
      minLevel: 0,
      timeZone: 'UTC',
    });
    const far = fire({ coordinates: [2.1, 41.4], province: 'Barcelona', level: 3 });
    expect(decideFireAlert('new', far, p, new Date('2026-07-16T12:00:00Z')).send).toBe(false);
  });
});

describe('localMinuteOfDay / inQuietHours', () => {
  it('convierte a hora local con la tz IANA', () => {
    // Julio: Madrid = UTC+2. 00:30Z → 02:30 → 150 min.
    const now = new Date('2026-07-16T00:30:00Z');
    expect(localMinuteOfDay(now, 'Europe/Madrid')).toBe(150);
    expect(localMinuteOfDay(now, 'UTC')).toBe(30);
  });

  it('tz inválida → null (no se silencia por dato corrupto)', () => {
    expect(localMinuteOfDay(new Date('2026-07-16T00:30:00Z'), 'No/Existe')).toBeNull();
  });

  it('detecta franja normal y franja que cruza medianoche', () => {
    const at = (iso: string) => new Date(iso);
    // 00:00–07:00 UTC
    const q = { start: 0, end: 420 };
    expect(inQuietHours(q, 'UTC', at('2026-07-16T03:00:00Z'))).toBe(true);
    expect(inQuietHours(q, 'UTC', at('2026-07-16T08:00:00Z'))).toBe(false);
    // 23:00–07:00 UTC (cruza medianoche)
    const wrap = { start: 1380, end: 420 };
    expect(inQuietHours(wrap, 'UTC', at('2026-07-16T23:30:00Z'))).toBe(true);
    expect(inQuietHours(wrap, 'UTC', at('2026-07-16T02:00:00Z'))).toBe(true);
    expect(inQuietHours(wrap, 'UTC', at('2026-07-16T12:00:00Z'))).toBe(false);
  });

  it('sin franja → nunca en silencio', () => {
    expect(inQuietHours(null, 'UTC', new Date('2026-07-16T03:00:00Z'))).toBe(false);
  });
});

describe('decideFireAlert', () => {
  const NOON = new Date('2026-07-16T12:00:00Z');
  const NIGHT = new Date('2026-07-16T03:00:00Z');
  const quiet = { start: 0, end: 420 }; // 00:00–07:00 UTC

  it('nuevo incendio en zona por encima del umbral → newFire', () => {
    const p = prefs({ zones: [geoZone()], minLevel: 2, timeZone: 'UTC' });
    expect(decideFireAlert('new', fire({ level: 2 }), p, NOON)).toEqual({ send: true, reason: 'newFire' });
  });

  it('respeta el umbral de nivel', () => {
    const p = prefs({ zones: [geoZone()], minLevel: 2, timeZone: 'UTC' });
    expect(decideFireAlert('new', fire({ level: 1 }), p, NOON).send).toBe(false);
  });

  it('escalada solo si el tipo escalation está activo', () => {
    const on = prefs({ zones: [geoZone()], types: { escalation: true }, timeZone: 'UTC' });
    const off = prefs({ zones: [geoZone()], types: { escalation: false }, timeZone: 'UTC' });
    expect(decideFireAlert('escalated', fire(), on, NOON)).toEqual({ send: true, reason: 'escalation' });
    expect(decideFireAlert('escalated', fire(), off, NOON).send).toBe(false);
  });

  it('newFire desactivado no avisa de nuevos', () => {
    const p = prefs({ zones: [geoZone()], types: { newFire: false }, timeZone: 'UTC' });
    expect(decideFireAlert('new', fire(), p, NOON).send).toBe(false);
  });

  it('evacuación tiene prioridad e ignora el silencio', () => {
    const p = prefs({ zones: [geoZone()], quietHours: quiet, timeZone: 'UTC' });
    expect(decideFireAlert('escalated', fire({ evacuation: 'Corte EX-204' }), p, NIGHT)).toEqual({
      send: true,
      reason: 'evacuation',
    });
  });

  it('el silencio suprime los avisos no-evacuación', () => {
    const p = prefs({ zones: [geoZone()], quietHours: quiet, timeZone: 'UTC' });
    expect(decideFireAlert('new', fire(), p, NIGHT).send).toBe(false);
    // Pero de día sí:
    expect(decideFireAlert('new', fire(), p, NOON).send).toBe(true);
  });

  it('incendio seguido avisa aunque esté fuera de zona y bajo umbral', () => {
    const p = prefs({
      zones: [geoZone({ lat: 41, lon: -4, radiusKm: 10 })], // lejos
      minLevel: 3,
      followedSlugs: ['inc-1'],
      timeZone: 'UTC',
    });
    expect(decideFireAlert('escalated', fire({ level: 1 }), p, NOON)).toEqual({ send: true, reason: 'followed' });
  });

  it('seguido respeta el silencio (salvo evacuación)', () => {
    const p = prefs({ followedSlugs: ['inc-1'], quietHours: quiet, timeZone: 'UTC' });
    expect(decideFireAlert('escalated', fire(), p, NIGHT).send).toBe(false);
    expect(decideFireAlert('escalated', fire({ evacuation: 'x' }), p, NIGHT).reason).toBe('evacuation');
  });

  it('una sola decisión: evacuación gana a seguido y a zona (sin doble push)', () => {
    const p = prefs({ zones: [geoZone()], followedSlugs: ['inc-1'], timeZone: 'UTC' });
    const res = decideFireAlert('new', fire({ evacuation: 'x' }), p, NOON);
    expect(res).toEqual({ send: true, reason: 'evacuation' });
  });
});

describe('hotspots', () => {
  const NOON = new Date('2026-07-16T12:00:00Z');
  it('empareja foco por proximidad a zona geográfica si el tipo está activo', () => {
    const p = prefs({ zones: [geoZone({ radiusKm: 20 })], types: { hotspots: true }, timeZone: 'UTC' });
    expect(hotspotMatches({ coordinates: [-6.37, 39.47] }, p, NOON)).toBe(true);
  });
  it('no empareja si el tipo está desactivado', () => {
    const p = prefs({ zones: [geoZone()], types: { hotspots: false }, timeZone: 'UTC' });
    expect(hotspotMatches({ coordinates: [-6.37, 39.47] }, p, NOON)).toBe(false);
  });
  it('zona solo por provincia no basta para focos (no tienen provincia)', () => {
    const p = prefs({ zones: [provZone('caceres')], types: { hotspots: true }, timeZone: 'UTC' });
    expect(hotspotMatches({ coordinates: [-6.37, 39.47] }, p, NOON)).toBe(false);
  });
  it('anyoneWantsHotspots solo si hay tipo activo y zona geográfica', () => {
    expect(anyoneWantsHotspots([prefs({ types: { hotspots: true }, zones: [geoZone()] })])).toBe(true);
    expect(anyoneWantsHotspots([prefs({ types: { hotspots: true }, zones: [provZone('caceres')] })])).toBe(false);
    expect(anyoneWantsHotspots([prefs({ types: { hotspots: false }, zones: [geoZone()] })])).toBe(false);
  });

  it('hotspotCellId agrupa detecciones cercanas en la misma celda (~1 km)', () => {
    // Dos pasadas del satélite sobre el mismo fuego con coords ligeramente distintas.
    expect(hotspotCellId([-6.371, 39.472])).toBe(hotspotCellId([-6.374, 39.469]));
    // Un foco lejano cae en otra celda.
    expect(hotspotCellId([-6.371, 39.472])).not.toBe(hotspotCellId([-5.0, 40.0]));
  });
});

describe('haversineKm', () => {
  it('distancia ~0 en el mismo punto', () => {
    expect(haversineKm([-6, 40], [-6, 40])).toBeCloseTo(0, 5);
  });
  it('distancia positiva plausible', () => {
    expect(haversineKm([-6, 40], [-5, 40])).toBeGreaterThan(50);
    expect(haversineKm([-6, 40], [-5, 40])).toBeLessThan(120);
  });
});
