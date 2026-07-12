import { describe, it, expect } from 'vitest';
import { isSafePushEndpoint, clampPrefs } from './validate';

describe('isSafePushEndpoint', () => {
  it('acepta endpoints https de servicios de push reales', () => {
    expect(isSafePushEndpoint('https://fcm.googleapis.com/fcm/send/abc123')).toBe(true);
    expect(isSafePushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/xyz')).toBe(true);
    expect(isSafePushEndpoint('https://web.push.apple.com/QABC')).toBe(true);
  });

  it('rechaza no-https', () => {
    expect(isSafePushEndpoint('http://fcm.googleapis.com/x')).toBe(false);
    expect(isSafePushEndpoint('ftp://example.com')).toBe(false);
  });

  it('rechaza vacío o malformado', () => {
    expect(isSafePushEndpoint(undefined)).toBe(false);
    expect(isSafePushEndpoint(null)).toBe(false);
    expect(isSafePushEndpoint('')).toBe(false);
    expect(isSafePushEndpoint('no-es-una-url')).toBe(false);
  });

  it('rechaza destinos internos/reservados (anti-SSRF)', () => {
    expect(isSafePushEndpoint('https://localhost/x')).toBe(false);
    expect(isSafePushEndpoint('https://app.localhost/x')).toBe(false);
    expect(isSafePushEndpoint('https://127.0.0.1/x')).toBe(false);
    expect(isSafePushEndpoint('https://10.0.0.5/x')).toBe(false);
    expect(isSafePushEndpoint('https://172.16.3.4/x')).toBe(false);
    expect(isSafePushEndpoint('https://192.168.1.1/x')).toBe(false);
    expect(isSafePushEndpoint('https://169.254.169.254/latest/meta-data')).toBe(false); // metadata cloud
    expect(isSafePushEndpoint('https://100.64.0.1/x')).toBe(false); // CGNAT
    expect(isSafePushEndpoint('https://[::1]/x')).toBe(false);
    expect(isSafePushEndpoint('https://[fd00::1]/x')).toBe(false);
    expect(isSafePushEndpoint('https://[fe80::1]/x')).toBe(false);
  });
});

describe('clampPrefs', () => {
  it('aplica valores por defecto ante entrada vacía o basura', () => {
    expect(clampPrefs(undefined)).toEqual({ minLevel: 2, radiusKm: 30, silence: false, zone: null });
    expect(clampPrefs({ minLevel: NaN as unknown as number })).toMatchObject({ minLevel: 2 });
  });

  it('acota minLevel a 0..3 y radiusKm a 1..500', () => {
    expect(clampPrefs({ minLevel: 9 }).minLevel).toBe(3);
    expect(clampPrefs({ minLevel: -5 }).minLevel).toBe(0);
    expect(clampPrefs({ radiusKm: 999999 }).radiusKm).toBe(500);
    expect(clampPrefs({ radiusKm: 0 }).radiusKm).toBe(1);
    // Valores no finitos son basura → caen al defecto (30), no al tope.
    expect(clampPrefs({ radiusKm: Infinity }).radiusKm).toBe(30);
  });

  it('valida la zona: solo coordenadas finitas en rango', () => {
    expect(clampPrefs({ zone: { lat: 40.4, lon: -3.7 } }).zone).toEqual({ lat: 40.4, lon: -3.7 });
    expect(clampPrefs({ zone: { lat: 999, lon: 0 } }).zone).toBeNull();
    expect(clampPrefs({ zone: { lat: Infinity, lon: 0 } }).zone).toBeNull();
    expect(clampPrefs({ zone: null }).zone).toBeNull();
  });
});
