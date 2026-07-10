import { describe, it, expect } from 'vitest';
import { parseFirmsCsv } from './index';

const VIIRS_CSV = `latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
40.36012,-6.29011,320.1,0.4,0.36,2026-07-10,149,N20,VIIRS,n,2.0NRT,295.4,12.5,N
27.99,-15.61,360,0.4,0.36,2026-07-10,3,N20,VIIRS,h,2.0NRT,300,86.2,D
43.0,-2.2,290,0.4,0.36,2026-07-10,1230,N20,VIIRS,l,2.0NRT,280,0.4,N`;

const MODIS_CSV = `latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
41.0,-4.0,330,1.1,1.0,2026-07-10,1015,Terra,MODIS,85,6.1NRT,300,45,D
41.1,-4.1,320,1.1,1.0,2026-07-10,1015,Terra,MODIS,20,6.1NRT,295,10,D`;

describe('parseFirmsCsv', () => {
  it('parses VIIRS rows con confianza l/n/h, FRP y hora HHMM UTC', () => {
    const out = parseFirmsCsv(VIIRS_CSV, 'VIIRS_NOAA20_NRT');
    expect(out).toHaveLength(3);

    const [a, b, c] = out;
    expect(a!.coordinates).toEqual([-6.29011, 40.36012]); // [lon, lat]
    expect(a!.frp).toBe(12.5);
    expect(a!.confidence).toBe('nominal');
    expect(a!.sensor).toBe('VIIRS');
    // acq_time 149 → 01:49 UTC
    expect(a!.acquiredAt).toBe('2026-07-10T01:49:00.000Z');

    expect(b!.confidence).toBe('high');
    // acq_time 3 → 00:03 UTC
    expect(b!.acquiredAt).toBe('2026-07-10T00:03:00.000Z');

    expect(c!.confidence).toBe('low');
    // acq_time 1230 → 12:30 UTC
    expect(c!.acquiredAt).toBe('2026-07-10T12:30:00.000Z');
  });

  it('mapea la confianza numérica de MODIS (0–100) a low/nominal/high', () => {
    const out = parseFirmsCsv(MODIS_CSV, 'MODIS_NRT');
    expect(out).toHaveLength(2);
    expect(out[0]!.sensor).toBe('MODIS');
    expect(out[0]!.confidence).toBe('high'); // 85
    expect(out[1]!.confidence).toBe('low'); // 20
  });

  it('devuelve [] ante un cuerpo que no es CSV (aviso de FIRMS / clave inválida)', () => {
    expect(parseFirmsCsv('Invalid MAP_KEY.', 'VIIRS_NOAA20_NRT')).toEqual([]);
    expect(parseFirmsCsv('', 'VIIRS_NOAA20_NRT')).toEqual([]);
  });

  it('ignora filas con coordenadas no numéricas', () => {
    const csv = `latitude,longitude,acq_date,acq_time,instrument,confidence,frp
foo,bar,2026-07-10,100,VIIRS,n,5
40.0,-3.0,2026-07-10,100,VIIRS,n,5`;
    const out = parseFirmsCsv(csv, 'VIIRS_NOAA20_NRT');
    expect(out).toHaveLength(1);
    expect(out[0]!.coordinates).toEqual([-3.0, 40.0]);
  });
});
