import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchFogosActive, fetchJcylFires } from './index';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function mockJson(body: unknown) {
  globalThis.fetch = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  ) as unknown as typeof fetch;
}

describe('fetchFogosActive (Portugal)', () => {
  it('normaliza un incidente con desglose de medios y estado PT', async () => {
    mockJson({
      success: true,
      data: [
        {
          id: 123,
          lat: 40.68,
          lng: -8.15,
          man: 72,
          aerial: 2,
          terrain: 25,
          planeFight: 1,
          heliFight: 1,
          heliCoord: 0,
          status: 'Em Curso',
          concelho: 'Vouzela',
          district: 'Viseu',
          regiao: 'Centro',
          sub_regiao: 'Viseu Dão Lafões',
          localidade: 'Tourelhe Tourelhe',
          dateTime: { sec: 1782957840 },
          updated: { sec: 1783724104 },
          isFire: true,
        },
      ],
    });
    const fires = await fetchFogosActive();
    expect(fires).toHaveLength(1);
    const f = fires[0]!;
    expect(f.country).toBe('PT');
    expect(f.coordinates).toEqual([-8.15, 40.68]);
    expect(f.state).toBe('activo');
    expect(f.ptState).toBe('em-curso');
    expect(f.name).toBe('Tourelhe'); // colapsa la duplicación de fogos
    expect(f.municipality).toBe('Vouzela');
    expect(f.resources?.personnel).toBe(72);
    expect(f.resources?.aerialUnits).toEqual([
      { kind: 'anfibio', count: 1 },
      { kind: 'helicoptero', count: 1 },
    ]);
    expect(f.resources?.groundUnits).toEqual([{ kind: 'autobomba', count: 25 }]);
    expect(f.sources).toEqual(['fogos']);
  });

  it('devuelve [] si el fetch falla', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network');
    }) as unknown as typeof fetch;
    expect(await fetchFogosActive()).toEqual([]);
  });
});

describe('fetchJcylFires (Castilla y León)', () => {
  it('normaliza nivel, hectáreas (decimales ES) y nombre/municipio', async () => {
    mockJson({
      results: [
        {
          posicion: { lon: -6.3, lat: 42.41 },
          situacion_actual: 'ACTIVO',
          nivel: '2',
          termino_municipal: 'BOISAN(LUCILLO)',
          provincia: ['LEÓN'],
          fecha_de_inicio: '2026-07-10',
          hora_de_inicio: '18:40',
          fecha_del_parte: '2026-07-11',
          hora_del_parte: '10:00',
          tipo_y_has_de_superficie_afectada: 'MATORRAL:414,30 HA.; OTRAS:3.266,33 HA.;',
          medios_de_extincion: null,
          codigo_ine: '24090',
        },
      ],
    });
    const fires = await fetchJcylFires();
    expect(fires).toHaveLength(1);
    const f = fires[0]!;
    expect(f.country).toBe('ES');
    expect(f.state).toBe('activo');
    expect(f.level).toBe(2);
    expect(f.hectares).toBe(3681); // 414,30 + 3.266,33 = 3680,63 → 3681
    expect(f.name).toBe('Boisan');
    expect(f.municipality).toBe('Lucillo');
    expect(f.province).toBe('León');
    expect(f.coordinates).toEqual([-6.3, 42.41]);
    expect(f.sources).toEqual(['jcyl']);
  });
});
