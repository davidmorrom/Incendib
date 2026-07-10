/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // maplibre-gl / react-map-gl ship modern ESM (la lógica v8 vive en
  // @vis.gl/react-maplibre); transpilarlos evita errores de ESM sin procesar.
  transpilePackages: ['maplibre-gl', 'react-map-gl', '@vis.gl/react-maplibre'],
  async headers() {
    return [
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
