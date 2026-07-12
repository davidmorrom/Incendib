import type { AlertPrefs } from './store';

/**
 * Valida que un endpoint de Web Push es seguro antes de que el servidor le envíe
 * una petición (mitiga SSRF: el `endpoint` lo aporta el cliente y luego lo
 * consultamos desde `sendPush`). Exige `https:` y rechaza destinos internos o
 * reservados (loopback, RFC1918, link-local/metadata, CGNAT, ULA IPv6).
 */
export function isSafePushEndpoint(endpoint: string | undefined | null): boolean {
  if (!endpoint || typeof endpoint !== 'string') return false;
  let u: URL;
  try {
    u = new URL(endpoint);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;

  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return false;

  // Literal IPv4 en rango privado/reservado.
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 169 && b === 254) return false; // link-local + metadata cloud (169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
  }

  // Literal IPv6 interno (loopback, ULA, link-local). `URL.hostname` conserva
  // los corchetes en IPv6 (p. ej. "[fd00::1]"): quitarlos antes de evaluar.
  if (host.includes(':')) {
    const h6 = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
    if (h6 === '::1') return false; // loopback
    if (h6.startsWith('fc') || h6.startsWith('fd')) return false; // ULA fc00::/7
    if (h6.startsWith('fe8') || h6.startsWith('fe9') || h6.startsWith('fea') || h6.startsWith('feb'))
      return false; // link-local fe80::/10
  }

  return true;
}

/**
 * Acota las preferencias de alerta a rangos sanos (evita `Infinity`, negativos o
 * valores enormes que descuadren el matcher). Devuelve valores por defecto
 * seguros si el cliente manda basura.
 */
export function clampPrefs(raw?: Partial<AlertPrefs>): AlertPrefs {
  const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const minLevel = Math.min(3, Math.max(0, Math.round(num(raw?.minLevel, 2))));
  const radiusKm = Math.min(500, Math.max(1, num(raw?.radiusKm, 30)));
  const silence = Boolean(raw?.silence ?? false);

  let zone: AlertPrefs['zone'] = null;
  const z = raw?.zone;
  if (z != null) {
    const lat = num(z.lat, NaN);
    const lon = num(z.lon, NaN);
    if (Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      zone = { lat, lon };
    }
  }
  return { minLevel, radiusKm, silence, zone };
}
