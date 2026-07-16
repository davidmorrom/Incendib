/**
 * Validación de seguridad de endpoints Web Push (anti-SSRF). El saneado/migración
 * de las **preferencias** de alerta se hace en `@/lib/alerts/prefs`
 * (`normalizePrefs`/`mergePrefsForStorage`), no aquí.
 *
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
