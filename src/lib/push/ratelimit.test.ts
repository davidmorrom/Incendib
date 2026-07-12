import { describe, it, expect } from 'vitest';
import { allowRequest, clientIp } from './ratelimit';

describe('clientIp', () => {
  it('toma la primera IP de x-forwarded-for', () => {
    const req = new Request('https://x/y', { headers: { 'x-forwarded-for': '203.0.113.5, 70.41.3.18' } });
    expect(clientIp(req)).toBe('203.0.113.5');
  });
  it('cae a x-real-ip y luego a "unknown"', () => {
    expect(clientIp(new Request('https://x', { headers: { 'x-real-ip': '198.51.100.2' } }))).toBe('198.51.100.2');
    expect(clientIp(new Request('https://x'))).toBe('unknown');
  });
});

describe('allowRequest (fail-open)', () => {
  it('permite siempre si no hay almacén configurado', async () => {
    // En el entorno de test no hay UPSTASH_* → redis() es null → fail-open.
    expect(await allowRequest('203.0.113.5', { limit: 1 })).toBe(true);
    expect(await allowRequest('203.0.113.5', { limit: 1 })).toBe(true);
  });
});
