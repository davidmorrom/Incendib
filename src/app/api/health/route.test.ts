import { describe, it, expect, beforeAll } from 'vitest';
import { GET } from './route';

// En test el modo es 'mock' (sin VERCEL): getSourceStatus devuelve datos de ejemplo,
// sin red. Fija un PANEL_TOKEN para poder ejercitar la ruta autorizada.
beforeAll(() => {
  process.env.PANEL_TOKEN = 'test-token';
});

function req(headers: Record<string, string> = {}) {
  return new Request('https://incendib.es/api/health', { headers });
}

describe('GET /api/health', () => {
  it('401 sin Bearer', async () => {
    expect((await GET(req())).status).toBe(401);
  });

  it('401 con Bearer incorrecto', async () => {
    expect((await GET(req({ authorization: 'Bearer incorrecto' }))).status).toBe(401);
  });

  it('200 y forma esperada con el Bearer correcto', async () => {
    const res = await GET(req({ authorization: 'Bearer test-token' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.sources)).toBe(true);
    expect(body.sources.length).toBeGreaterThan(0);
    expect(body.sources[0]).toHaveProperty('status');
    expect(body.counts).toHaveProperty('fires');
    expect(body.counts).toHaveProperty('hotspots24h');
    expect(body.counts).toHaveProperty('burned');
    expect(body.env).toHaveProperty('panelToken', true);
    expect(['mock', 'live']).toContain(body.dataMode);
  });
});
