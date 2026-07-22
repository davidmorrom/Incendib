import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fetchFogosActive,
  fetchAnepcFires,
  fetchPortugalFires,
  fetchJcylFires,
  fetchInfocaFires,
  fetchCatalunyaFires,
} from './index';

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

describe('fetchJcylFires (INFORCYL, tiempo real)', () => {
  it('normaliza estado, nivel InfoCal, coordenadas UTM y medios', async () => {
    mockJson({
      listaEmergencias: [
        {
          causa: 'Rayos',
          estado: { NOMBRE: 'Activo' },
          falsa_alarma: false,
          fecha_inicio: '06/07/2026 16:35:00',
          fecha_control: '06/07/2026 21:45:00',
          huso: 30,
          latitud: 4465547.0, // UTM northing
          longitud: 316098.0, // UTM easting
          localidad: { nombre: 'HOYOS DEL ESPINO', municipio: { nombre: 'HOYOS DEL ESPINO' } },
          municipio: { nombre: 'HOYOS DEL ESPINO' },
          provincia: { nombre: 'AVILA' },
          nivel_infocal: 2,
          emergencia_cpm: 5,
          emergencia_num1: 133,
          emergencia_num2: 26,
          medios: [
            { TIPO: { CATEGORIA: 'Terrestre', NOMBRE: 'Autobombas' } },
            { TIPO: { CATEGORIA: 'Terrestre', NOMBRE: 'Cuadrillas de tierra' } },
            { TIPO: { CATEGORIA: 'Terrestre', NOMBRE: 'BRIF' } },
            { TIPO: { CATEGORIA: 'Terrestre', NOMBRE: 'Bulldozer' } },
            { TIPO: { CATEGORIA: 'Aereo', NOMBRE: 'Medios Aéreos' } },
            { TIPO: { CATEGORIA: 'Aereo', NOMBRE: 'Medios Aéreos' } },
            { TIPO: { CATEGORIA: 'Personal', NOMBRE: 'Técnicos' } },
            { TIPO: { CATEGORIA: 'Otros', NOMBRE: 'Otras Administraciones' } },
          ],
        },
      ],
    });
    const fires = await fetchJcylFires();
    expect(fires).toHaveLength(1);
    const f = fires[0]!;
    expect(f.country).toBe('ES');
    expect(f.state).toBe('activo');
    expect(f.level).toBe(2);
    expect(f.name).toBe('Hoyos Del Espino');
    expect(f.coordinates[0]).toBeCloseTo(-5.1645, 2);
    expect(f.coordinates[1]).toBeCloseTo(40.3202, 2);
    expect(f.resources?.aerial).toBe(2);
    expect(f.resources?.aerialUnits?.[0]).toEqual({ kind: 'aereo', count: 2 }); // aéreo genérico
    expect(f.resources?.personnel).toBe(1);
    // brigada = Cuadrillas + BRIF = 2; autobomba = 1; maquinaria(Bulldozer) = 1
    const brig = f.resources?.groundUnits?.find((u) => u.kind === 'brigada');
    expect(brig?.count).toBe(2);
    expect(f.resources?.groundUnits?.find((u) => u.kind === 'autobomba')?.count).toBe(1);
    expect(f.resources?.groundUnits?.find((u) => u.kind === 'maquinaria')?.count).toBe(1);
    expect(f.sources).toEqual(['jcyl']);
  });

  it('descarta falsas alarmas', async () => {
    mockJson({
      listaEmergencias: [
        {
          estado: { NOMBRE: 'Extinguido' },
          falsa_alarma: true,
          huso: 30,
          latitud: 4465547.0,
          longitud: 316098.0,
          municipio: { nombre: 'X' },
          provincia: { nombre: 'AVILA' },
          medios: [],
        },
      ],
    });
    expect(await fetchJcylFires()).toEqual([]);
  });
});

describe('fetchInfocaFires (Andalucía)', () => {
  it('normaliza estado, geometría (lat/lon) y medios de INFOCA', async () => {
    mockJson({
      features: [
        {
          attributes: {
            OID_ENTERO: 12,
            TERMINO_MUNICIPAL: 'Lanjarón',
            PROVINCIA: 'GRANADA',
            TIPO_INCIDENTE: 'IIFF INCENDIOS FORESTALES',
            ESTADO: 'ACTIVO',
            FECHA: Date.UTC(2026, 6, 10),
            HORA: '13:06:00',
            MEDIOS_AEREOS: 3,
            UNASIF_ACO: 1,
            BRICAS: 4,
            GRUPOS_ESPECIALISTAS: 1,
            GRUPOS_APOYO: 0,
            UMIF: 0,
            VEHICULOS: 6,
            TECNICOS: 2,
          },
          geometry: { x: -3.46, y: 36.93 },
        },
      ],
    });
    const fires = await fetchInfocaFires();
    expect(fires).toHaveLength(1);
    const f = fires[0]!;
    expect(f.country).toBe('ES');
    expect(f.region).toBe('Andalucía');
    expect(f.state).toBe('activo');
    expect(f.name).toBe('Lanjarón');
    expect(f.province).toBe('Granada');
    expect(f.coordinates).toEqual([-3.46, 36.93]);
    expect(f.resources?.aerial).toBe(4); // 3 aéreos + 1 ACO
    expect(f.resources?.personnel).toBe(2);
    expect(f.resources?.groundUnits?.find((u) => u.kind === 'brigada')?.count).toBe(5);
    expect(f.resources?.groundUnits?.find((u) => u.kind === 'autobomba')?.count).toBe(6);
    expect(f.resources?.aerialUnits?.find((u) => u.kind === 'coordinacion')?.count).toBe(1);
    expect(f.sources).toEqual(['infoca']);
  });

  it('descarta features sin geometría', async () => {
    mockJson({ features: [{ attributes: { TERMINO_MUNICIPAL: 'X', ESTADO: 'ACTIVO' } }] });
    expect(await fetchInfocaFires()).toEqual([]);
  });
});

describe('fetchCatalunyaFires (Bombers)', () => {
  it('normaliza fase/tipo/vehículos y descarta extinguidos', async () => {
    const now = Date.now();
    mockJson({
      features: [
        {
          attributes: {
            ACT_NUM_ACTUACIO: '260313130',
            MUNICIPI_DPX: 'Oliana',
            TAL_COD_ALARMA1: 'IV',
            TAL_DESC_ALARMA2: 'Incendi vegetació agrícola',
            COM_FASE: 'Controlat',
            ACT_DAT_INICI: now - 3600e3,
            ACT_DAT_ACTUAL: now,
            ACT_NUM_VEH: 5,
          },
          geometry: { x: 1.33, y: 42.08 },
        },
        {
          attributes: {
            ACT_NUM_ACTUACIO: '999',
            MUNICIPI_DPX: 'X',
            TAL_COD_ALARMA1: 'IV',
            COM_FASE: 'Extingit',
            ACT_DAT_ACTUAL: now,
          },
          geometry: { x: 1, y: 41 },
        },
      ],
    });
    const fires = await fetchCatalunyaFires();
    expect(fires).toHaveLength(1); // el extinguido se descarta
    const f = fires[0]!;
    expect(f.region).toBe('Cataluña');
    expect(f.state).toBe('controlado');
    expect(f.type).toBe('agricola');
    expect(f.name).toBe('Oliana');
    expect(f.coordinates).toEqual([1.33, 42.08]);
    expect(f.resources?.groundUnits?.[0]).toEqual({ kind: 'autobomba', count: 5 });
    expect(f.sources).toEqual(['catalunya']);
  });
});

describe('fetchJcylFires Opendatasoft (respaldo)', () => {
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

describe('fetchAnepcFires (Portugal, ANEPC oficial)', () => {
  it('normaliza estado PT, tipo por naturaleza, distrito (del concelho) y medios', async () => {
    const now = Date.now();
    mockJson({
      features: [
        {
          attributes: {
            Numero: '20260920981',
            CodNatureza: 3103, // mato → forestal
            EstadoOcorrencia: 'Vigilância',
            EstadoAgrupado: 'Em Conclusão',
            DataOcorrencia: now - 3600e3,
            DataDosDados: now,
            Regiao: 'Centro',
            SubRegiao: 'Viseu Dão Lafões',
            Concelho: 'Vouzela',
            Freguesia: 'Cambra',
            Localidade: 'Tourelhe',
            Operacionais: 26,
            MeiosTerrestres: 6,
            MeiosAereos: 0,
          },
          geometry: { x: -8.15205, y: 40.680513 },
        },
        {
          attributes: {
            Numero: '2',
            CodNatureza: 3105, // áreas agrícolas → agricola
            EstadoOcorrencia: 'Em Curso',
            DataOcorrencia: now - 7200e3,
            DataDosDados: now,
            Concelho: 'Valpaços',
            Operacionais: 10,
            MeiosTerrestres: 3,
            MeiosAereos: 2,
          },
          geometry: { x: -7.31, y: 41.6 },
        },
        {
          // «Encerrada» → se descarta (extinguido)
          attributes: {
            Numero: '3',
            CodNatureza: 3101,
            EstadoOcorrencia: 'Encerrada',
            DataOcorrencia: now - 3600e3,
            DataDosDados: now,
            Concelho: 'Faro',
          },
          geometry: { x: -7.9, y: 37.0 },
        },
      ],
    });
    const fires = await fetchAnepcFires();
    expect(fires).toHaveLength(2); // la «Encerrada» se descarta

    const vouzela = fires.find((f) => f.municipality === 'Vouzela')!;
    expect(vouzela.country).toBe('PT');
    expect(vouzela.coordinates).toEqual([-8.15205, 40.680513]);
    expect(vouzela.state).toBe('estabilizado');
    expect(vouzela.ptState).toBe('vigilancia');
    expect(vouzela.type).toBe('forestal');
    expect(vouzela.province).toBe('Viseu'); // distrito derivado del concelho (CAOP)
    expect(vouzela.region).toBe('Viseu Dão Lafões (PT)');
    expect(vouzela.name).toBe('Tourelhe');
    expect(vouzela.resources?.personnel).toBe(26);
    expect(vouzela.resources?.groundUnits).toEqual([{ kind: 'autobomba', count: 6 }]);
    expect(vouzela.sources).toEqual(['anepc']);

    const valpacos = fires.find((f) => f.municipality === 'Valpaços')!;
    expect(valpacos.type).toBe('agricola');
    expect(valpacos.state).toBe('activo');
    expect(valpacos.ptState).toBe('em-curso');
    expect(valpacos.province).toBe('Vila Real'); // Valpaços → Vila Real (CAOP)
    expect(valpacos.resources?.aerialUnits).toEqual([{ kind: 'aereo', count: 2 }]);
  });

  it('devuelve [] si el fetch falla', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network');
    }) as unknown as typeof fetch;
    expect(await fetchAnepcFires()).toEqual([]);
  });
});

describe('fetchPortugalFires (ANEPC primaria, fogos.pt respaldo)', () => {
  it('usa ANEPC cuando responde', async () => {
    const now = Date.now();
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.includes('OcorrenciasSite')
        ? {
            features: [
              {
                attributes: {
                  Numero: '1',
                  CodNatureza: 3101,
                  EstadoOcorrencia: 'Em Curso',
                  DataOcorrencia: now,
                  DataDosDados: now,
                  Concelho: 'Guarda',
                },
                geometry: { x: -7.27, y: 40.53 },
              },
            ],
          }
        : { data: [] };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;
    const fires = await fetchPortugalFires();
    expect(fires).toHaveLength(1);
    expect(fires[0]!.sources).toEqual(['anepc']);
    expect(fires[0]!.province).toBe('Guarda');
  });

  it('cae a fogos.pt si ANEPC viene vacía', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.includes('OcorrenciasSite')
        ? { features: [] }
        : {
            data: [
              {
                id: 9,
                lat: 40.68,
                lng: -8.15,
                status: 'Em Curso',
                concelho: 'Vouzela',
                district: 'Viseu',
                isFire: true,
              },
            ],
          };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;
    const fires = await fetchPortugalFires();
    expect(fires).toHaveLength(1);
    expect(fires[0]!.sources).toEqual(['fogos']);
    expect(fires[0]!.province).toBe('Viseu');
  });
});
