import { describe, it, expect } from 'vitest';
import { utmToLonLat } from './utm';

describe('utmToLonLat (UTM huso 30N → grados)', () => {
  it('convierte un punto conocido de Ávila (Hoyos del Espino, INFORCYL)', () => {
    // UTM ETRS89 huso 30 (easting, northing) observado en INFORCYL.
    const [lon, lat] = utmToLonLat(316098, 4465547, 30);
    expect(lon).toBeCloseTo(-5.1645, 3);
    expect(lat).toBeCloseTo(40.3202, 3);
  });

  it('cae dentro de la Península para coordenadas UTM de CyL', () => {
    const [lon, lat] = utmToLonLat(316098, 4465547, 30);
    expect(lon).toBeGreaterThan(-10);
    expect(lon).toBeLessThan(4.5);
    expect(lat).toBeGreaterThan(36);
    expect(lat).toBeLessThan(44);
  });
});
