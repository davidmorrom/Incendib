import { describe, it, expect } from 'vitest';
import { isSafePushEndpoint } from './validate';
// El clamp/migración de preferencias se probó en `@/lib/alerts/prefs` (prefs.test.ts).

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
