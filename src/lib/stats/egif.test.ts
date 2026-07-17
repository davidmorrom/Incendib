import { describe, expect, it } from 'vitest';
import { aggregate, getEgifDataset, type EgifDataset } from './egif';

describe('EGIF dataset (datos reales versionados)', () => {
  const d = getEgifDataset();

  it('la serie está en orden cronológico ascendente y sin huecos de año', () => {
    for (let i = 1; i < d.series.length; i++) {
      expect(d.series[i]!.year).toBe(d.series[i - 1]!.year + 1);
    }
  });

  it('coincidencia cruzada: la superficie consolidada 2006-2015 suma el total del decenio (1 007 962 ha)', () => {
    // El ranking de CCAA da un total nacional del decenio de 1 007 962,25 ha;
    // la serie de superficie debe sumar lo mismo en ese tramo (verificación
    // independiente de dos fuentes MITECO distintas).
    const decadeHa = d.series
      .filter((y) => y.year >= 2006 && y.year <= 2015)
      .reduce((a, y) => a + (y.hectares ?? 0), 0);
    expect(Math.round(decadeHa)).toBe(1007962);
    const ccaaTotal = (d.topCcaa?.items ?? []).reduce((a, it) => a + it.hectares, 0);
    // El top-10 no cubre el total (hay CCAA fuera), pero sí la mayor parte.
    expect(ccaaTotal).toBeGreaterThan(0);
  });

  it('no hay cifras negativas y los flags provisional son coherentes por métrica', () => {
    for (const y of d.series) {
      if (y.fires != null) expect(y.fires).toBeGreaterThan(0);
      if (y.hectares != null) expect(y.hectares).toBeGreaterThan(0);
    }
    // Siniestros: definitivos 2006-2015; superficie: definitivos 2006-2019.
    expect(d.series.find((y) => y.year === 2015)!.firesProvisional).toBe(false);
    expect(d.series.find((y) => y.year === 2016)!.firesProvisional).toBe(true);
    expect(d.series.find((y) => y.year === 2019)!.hectaresProvisional).toBe(false);
    expect(d.series.find((y) => y.year === 2020)!.hectaresProvisional).toBe(true);
  });

  it('aggregate calcula peor año, último y medias sobre lo consolidado', () => {
    const a = aggregate(d);
    expect(a.worst?.year).toBe(2022); // año más severo de la serie (265 078 ha)
    expect(a.latest?.year).toBe(2024); // último con dato
    expect(a.hectaresConsolidatedFrom).toBe(2006);
    expect(a.hectaresConsolidatedTo).toBe(2019);
    expect(a.meanFires).toBeGreaterThan(0);
    expect(a.meanHectares).toBeGreaterThan(0);
  });

  it('aggregate es robusto ante un dataset vacío', () => {
    const empty: EgifDataset = { series: [], topCcaa: null, topProvincias: null, sources: [], dataNote: '' };
    const a = aggregate(empty);
    expect(a.worst).toBeNull();
    expect(a.latest).toBeNull();
    expect(a.meanFires).toBeNull();
    expect(a.meanHectares).toBeNull();
  });
});
