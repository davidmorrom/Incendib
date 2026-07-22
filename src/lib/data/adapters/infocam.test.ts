import { describe, it, expect } from 'vitest';
import { isInfocamRecentActive, gateByHotspots, type InfocamAttrs } from './index';
import type { Fire, Hotspot } from '@/types/fire';

// "Ahora" fijo para tests deterministas (el día en que se integró INFOCAM).
const NOW = Date.parse('2026-07-23T12:00:00Z');
const DAY = 86400e3;

// Timestamps REALES del feed INFOCAM para el MISMO punto de Almorox (Toledo),
// consultados en vivo: el incendio figura en 3 campañas, todas "Activo" y sin
// Fecha_Fin. Es la prueba de que el feed es un log acumulativo (nunca cierra).
const ALMOROX_2024 = 1727906400000; // 2024-10-02
const ALMOROX_2025 = 1759960800000; // 2025-10-08
const ALMOROX_2026 = 1784731920000; // 2026-07-22 14:52 UTC — el incendio real

function almorox(fechaInicio: number, extra: Partial<InfocamAttrs> = {}): InfocamAttrs {
  return {
    Municipio: 'Almorox',
    Provincia: 'Toledo',
    Estado: 'Activo',
    Fecha_Inicio: fechaInicio,
    Fecha_Fin: null,
    ...extra,
  };
}

describe('isInfocamRecentActive (filtro de recencia de INFOCAM)', () => {
  it('descarta los "zombis" de campañas pasadas (Almorox 2024 y 2025, aún "Activo")', () => {
    expect(isInfocamRecentActive(almorox(ALMOROX_2024), NOW)).toBe(false);
    expect(isInfocamRecentActive(almorox(ALMOROX_2025), NOW)).toBe(false);
  });

  it('deja pasar el incidente real de la última semana (Almorox 2026-07-22)', () => {
    expect(isInfocamRecentActive(almorox(ALMOROX_2026), NOW)).toBe(true);
  });

  it('respeta la ventana de 7 días en el borde', () => {
    expect(isInfocamRecentActive(almorox(NOW - 6 * DAY), NOW)).toBe(true);
    expect(isInfocamRecentActive(almorox(NOW - 8 * DAY), NOW)).toBe(false);
  });

  it('descarta si Fecha_Fin está fijada (incidente cerrado)', () => {
    expect(isInfocamRecentActive(almorox(ALMOROX_2026, { Fecha_Fin: NOW }), NOW)).toBe(false);
  });

  it('descarta si Estado indica extinguido', () => {
    expect(isInfocamRecentActive(almorox(ALMOROX_2026, { Estado: 'Extinguido' }), NOW)).toBe(false);
  });

  it('descarta incidentes fronterizos de otra CCAA, conserva los de Castilla-La Mancha', () => {
    expect(isInfocamRecentActive(almorox(ALMOROX_2026, { CCAA: 'Madrid' }), NOW)).toBe(false);
    expect(isInfocamRecentActive(almorox(ALMOROX_2026, { CCAA: 'Castilla-La Mancha' }), NOW)).toBe(true);
  });

  it('descarta registros sin Fecha_Inicio', () => {
    expect(isInfocamRecentActive({ Municipio: 'X' }, NOW)).toBe(false);
  });
});

// El segundo filtro del pipeline: aunque un incidente de INFOCAM sea reciente,
// solo se muestra si un foco FIRMS cercano corrobora que sigue ardiendo.
function fire(p: Partial<Fire>): Fire {
  return {
    slug: 'clm-almorox-1',
    name: 'Almorox',
    municipality: 'Almorox',
    province: 'Toledo',
    region: 'Castilla-La Mancha',
    country: 'ES',
    state: 'activo',
    level: null,
    hectares: 0,
    coordinates: [-4.3913637, 40.2330695], // Almorox real
    startedAt: '2026-07-22T14:52:00Z',
    updatedAt: '2026-07-23T00:00:00Z',
    sources: ['infocam'],
    ...p,
  };
}

function hotspot(coords: [number, number]): Hotspot {
  return {
    id: `h-${coords.join()}`,
    coordinates: coords,
    frp: 12,
    confidence: 'nominal',
    sensor: 'VIIRS',
    acquiredAt: '2026-07-23T00:00:00Z',
  };
}

describe('gateByHotspots sobre un incidente de INFOCAM (Almorox)', () => {
  it('deja pasar el incidente reciente cuando hay un foco FIRMS cercano', () => {
    const near = hotspot([-4.395, 40.235]); // ~0,5 km de Almorox
    const out = gateByHotspots([fire({})], [near]);
    expect(out).toHaveLength(1);
    expect(out[0]?.satelliteConfirmed).toBe(true);
  });

  it('descarta el incidente reciente si ningún foco lo corrobora (ya sin fuego)', () => {
    const far = hotspot([2.0, 41.5]); // Cataluña, lejísimos
    expect(gateByHotspots([fire({})], [far])).toHaveLength(0);
  });
});
