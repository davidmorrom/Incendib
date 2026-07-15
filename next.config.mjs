/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production';

// Content-Security-Policy acotada a los orígenes que la app usa de verdad:
//  - teselas del mapa (OpenFreeMap), iframe de directos (YouTube nocookie),
//  - `blob:` para los workers de MapLibre, `data:` para iconos/marcadores SVG.
// script-src/style-src incluyen 'unsafe-inline' porque Next inyecta scripts de
// arranque sin nonce y el tema fija estilos en línea; 'unsafe-eval' solo en dev
// (React Refresh). Deuda anotada: migrar a nonce para eliminar 'unsafe-inline'.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tiles.openfreemap.org",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "child-src 'self' blob: https://www.youtube-nocookie.com",
  "frame-src 'self' https://www.youtube-nocookie.com",
  "media-src 'self' blob:",
  "manifest-src 'self'",
  // Fetch/beacon: API propia, teselas del mapa y telemetría de Vercel.
  "connect-src 'self' https://tiles.openfreemap.org https://*.vercel-insights.com",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ');

// Cabeceras de seguridad para todas las respuestas. La app usa geolocalización
// propia («localízame»); el resto de capacidades sensibles se deniegan.
const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value:
      'geolocation=(self), camera=(), microphone=(), payment=(), usb=(), ' +
      'magnetometer=(), accelerometer=(), gyroscope=(), browsing-topics=()',
  },
  // HSTS solo en producción (en localhost/http rompería o sería inútil).
  ...(isProd
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
];

const nextConfig = {
  reactStrictMode: true,
  // maplibre-gl / react-map-gl ship modern ESM (la lógica v8 vive en
  // @vis.gl/react-maplibre); transpilarlos evita errores de ESM sin procesar.
  transpilePackages: ['maplibre-gl', 'react-map-gl', '@vis.gl/react-maplibre'],
  async redirects() {
    return [
      {
        // La edición 2026-w27 se retiró (era una foto en vivo del 12-jul mal
        // etiquetada como semana ISO 27). Su URL era pública y citable, así que
        // redirigimos al índice en lugar de dejar un enlace muerto o seguir
        // sirviendo la página estática cacheada.
        source: '/boletin/2026-w27',
        destination: '/boletines',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // Cabeceras de seguridad en todo el origen.
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Allow the service worker to control the whole origin.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
