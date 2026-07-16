import { describe, it, expect } from 'vitest';
import {
  normalizePrefs,
  mergePrefsForStorage,
  parseMinuteOfDay,
  minuteOfDayToHHMM,
  clampRadiusKm,
  DEFAULT_PREFS,
  MAX_ZONES,
  MAX_FOLLOWED,
} from './prefs';

describe('normalizePrefs — migración v1 → v2', () => {
  it('migra prefs v1 con zona a una única zona de ubicación', () => {
    const p = normalizePrefs({ minLevel: 1, radiusKm: 40, silence: true, zone: { lat: 40, lon: -6 } });
    expect(p.version).toBe(2);
    expect(p.minLevel).toBe(1);
    expect(p.zones).toHaveLength(1);
    expect(p.zones[0]).toMatchObject({ kind: 'location', lat: 40, lon: -6, radiusKm: 40, enabled: true });
    // El `silence` booleano v1 se descarta (el nuevo silencio es por horario).
    expect(p.quietHours).toBeNull();
  });

  it('migra prefs v1 con zona nula a sin zonas', () => {
    const p = normalizePrefs({ minLevel: 2, radiusKm: 30, silence: false, zone: null });
    expect(p.zones).toEqual([]);
  });

  it('convierte basura en los valores por defecto', () => {
    expect(normalizePrefs(undefined)).toEqual(DEFAULT_PREFS);
    expect(normalizePrefs('nope')).toEqual(DEFAULT_PREFS);
    expect(normalizePrefs(42)).toEqual(DEFAULT_PREFS);
  });
});

describe('normalizePrefs — saneado v2', () => {
  it('conserva una entrada v2 válida', () => {
    const input = {
      version: 2,
      zones: [
        { id: 'a', kind: 'province', provinceSlug: 'caceres', label: 'Cáceres', enabled: true },
        { id: 'b', kind: 'location', lat: 39.4, lon: -6.3, radiusKm: 25, label: 'Casa', enabled: false },
      ],
      minLevel: 3,
      types: { newFire: false, escalation: true, evacuation: false, hotspots: true, followed: false },
      quietHours: { start: 0, end: 420 },
      timeZone: 'Europe/Madrid',
      followedSlugs: ['inc-1', 'inc-2'],
    };
    const p = normalizePrefs(input);
    expect(p.zones).toHaveLength(2);
    expect(p.minLevel).toBe(3);
    // evacuación se fuerza siempre a true aunque llegue false.
    expect(p.types.evacuation).toBe(true);
    expect(p.types.hotspots).toBe(true);
    expect(p.quietHours).toEqual({ start: 0, end: 420 });
    expect(p.timeZone).toBe('Europe/Madrid');
    expect(p.followedSlugs).toEqual(['inc-1', 'inc-2']);
  });

  it('descarta zonas de provincia con slug desconocido', () => {
    const p = normalizePrefs({
      version: 2,
      zones: [
        { id: 'x', kind: 'province', provinceSlug: 'noexiste' },
        { id: 'y', kind: 'province', provinceSlug: 'avila' },
      ],
    });
    expect(p.zones).toHaveLength(1);
    expect(p.zones[0]!.provinceSlug).toBe('avila');
  });

  it('descarta zonas geográficas con coordenadas inválidas y acota el radio', () => {
    const p = normalizePrefs({
      version: 2,
      zones: [
        { id: 'x', kind: 'location', lat: 200, lon: 0 },
        { id: 'y', kind: 'location', lat: 40, lon: -6, radiusKm: 9999 },
        { id: 'z', kind: 'location', lat: 41, lon: -5, radiusKm: 0 },
      ],
    });
    expect(p.zones).toHaveLength(2);
    expect(p.zones[0]!.radiusKm).toBe(500); // acotado al máximo
    expect(p.zones[1]!.radiusKm).toBe(1); // acotado al mínimo
  });

  it('deduplica zonas por id y acota al máximo', () => {
    const many = Array.from({ length: MAX_ZONES + 5 }, (_, i) => ({
      id: `z${i}`,
      kind: 'location',
      lat: 40 + i * 0.01,
      lon: -6,
    }));
    const dup = normalizePrefs({ version: 2, zones: [...many, { id: 'z0', kind: 'location', lat: 40, lon: -6 }] });
    expect(dup.zones.length).toBe(MAX_ZONES);
    const ids = new Set(dup.zones.map((z) => z.id));
    expect(ids.size).toBe(dup.zones.length);
  });

  it('sanea followedSlugs (dedup, formato, tope)', () => {
    const p = normalizePrefs({
      version: 2,
      followedSlugs: ['ok-1', 'ok-1', 'MAYÚS', 'con espacio', 'ok-2', 42, null],
    });
    expect(p.followedSlugs).toEqual(['ok-1', 'ok-2']);

    const overflow = normalizePrefs({
      version: 2,
      followedSlugs: Array.from({ length: MAX_FOLLOWED + 20 }, (_, i) => `f-${i}`),
    });
    expect(overflow.followedSlugs.length).toBe(MAX_FOLLOWED);
  });

  it('rechaza franjas de silencio inválidas o vacías', () => {
    const tz = 'Europe/Madrid';
    expect(normalizePrefs({ version: 2, timeZone: tz, quietHours: { start: 100, end: 100 } }).quietHours).toBeNull();
    expect(normalizePrefs({ version: 2, timeZone: tz, quietHours: { start: 'x', end: 5 } }).quietHours).toBeNull();
    expect(
      normalizePrefs({ version: 2, timeZone: tz, quietHours: { start: '23:00', end: '07:00' } }).quietHours,
    ).toEqual({ start: 1380, end: 420 });
  });

  it('rechaza zonas horarias no plausibles (con horario de silencio para conservarlas)', () => {
    const q = { start: 0, end: 420 };
    expect(normalizePrefs({ version: 2, quietHours: q, timeZone: 'Europe/Madrid' }).timeZone).toBe('Europe/Madrid');
    expect(normalizePrefs({ version: 2, quietHours: q, timeZone: 'UTC' }).timeZone).toBe('UTC');
    expect(normalizePrefs({ version: 2, quietHours: q, timeZone: 'javascript:alert(1)' }).timeZone).toBeUndefined();
    expect(normalizePrefs({ version: 2, quietHours: q, timeZone: 123 }).timeZone).toBeUndefined();
  });

  it('acopla tz y horario de silencio (minimización + fail-open)', () => {
    // Sin horario de silencio no se guarda la tz (dato de más).
    expect(normalizePrefs({ version: 2, timeZone: 'Europe/Madrid' }).timeZone).toBeUndefined();
    // Con horario pero sin tz válida, se descarta el horario (no silenciar a la hora
    // equivocada por huso desconocido: fail-open en app de evacuaciones).
    const noTz = normalizePrefs({ version: 2, quietHours: { start: 0, end: 420 } });
    expect(noTz.quietHours).toBeNull();
    expect(noTz.timeZone).toBeUndefined();
    // Con ambos, se conservan.
    const both = normalizePrefs({ version: 2, quietHours: { start: 0, end: 420 }, timeZone: 'Europe/Lisbon' });
    expect(both.quietHours).toEqual({ start: 0, end: 420 });
    expect(both.timeZone).toBe('Europe/Lisbon');
  });
});

describe('mergePrefsForStorage — no dejar que un cliente v1 cacheado borre v2', () => {
  const storedV2 = normalizePrefs({
    version: 2,
    zones: [{ id: 'a', kind: 'province', provinceSlug: 'avila' }],
    minLevel: 1,
    types: { hotspots: true },
  });

  it('un cliente v1 (sin zones/types) conserva la config v2 guardada y solo cambia el umbral', () => {
    const merged = mergePrefsForStorage({ minLevel: 3, radiusKm: 40, silence: false, zone: null }, storedV2);
    expect(merged.zones).toHaveLength(1); // no se borran las zonas v2
    expect(merged.types.hotspots).toBe(true);
    expect(merged.minLevel).toBe(3); // el umbral del cliente v1 sí se aplica
  });

  it('un cliente v2 reemplaza normalmente', () => {
    const merged = mergePrefsForStorage({ version: 2, zones: [], minLevel: 0 }, storedV2);
    expect(merged.zones).toEqual([]);
    expect(merged.minLevel).toBe(0);
  });

  it('sin nada guardado, normaliza la entrada', () => {
    expect(mergePrefsForStorage({ minLevel: 2, zone: { lat: 40, lon: -6 }, radiusKm: 30 }, null).zones).toHaveLength(
      1,
    );
  });
});

describe('helpers de tiempo', () => {
  it('parseMinuteOfDay acepta HH:MM y números', () => {
    expect(parseMinuteOfDay('07:30')).toBe(450);
    expect(parseMinuteOfDay('00:00')).toBe(0);
    expect(parseMinuteOfDay('23:59')).toBe(1439);
    expect(parseMinuteOfDay(90)).toBe(90);
    expect(parseMinuteOfDay('24:00')).toBeNull();
    expect(parseMinuteOfDay('7:5')).toBeNull();
    expect(parseMinuteOfDay(2000)).toBeNull();
  });

  it('minuteOfDayToHHMM es la inversa', () => {
    expect(minuteOfDayToHHMM(450)).toBe('07:30');
    expect(minuteOfDayToHHMM(0)).toBe('00:00');
    expect(minuteOfDayToHHMM(1439)).toBe('23:59');
  });

  it('clampRadiusKm acota a [1,500]', () => {
    expect(clampRadiusKm(30)).toBe(30);
    expect(clampRadiusKm(0)).toBe(1);
    expect(clampRadiusKm(99999)).toBe(500);
    expect(clampRadiusKm('nope')).toBe(30);
  });
});
