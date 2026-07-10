import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { NowProvider } from '@/components/time/NowProvider';
import { getNow } from '@/lib/time';
import './globals.css';

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

// URL canónica: variable explícita → dominio de producción de Vercel (previews)
// → localhost en desarrollo. Se usa para metadataBase, OG y enlaces /f/{slug}.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Incendib — Incendios forestales activos · España y Portugal',
    template: '%s · Incendib',
  },
  description:
    'Visor sin ánimo de lucro de incendios forestales activos en España y Portugal. ' +
    'Agrega NASA FIRMS, EFFIS/Copernicus y fuentes oficiales. No sustituye al 112.',
  applicationName: 'Incendib',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Incendib' },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    siteName: 'Incendib',
    locale: 'es_ES',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Oscuro por defecto (el tema claro es opt-in del usuario).
  themeColor: '#0C1117',
};

/**
 * Fija data-theme antes del primer paint (evita flash al cargar la preferencia
 * guardada). Si no hay preferencia, no toca nada y manda prefers-color-scheme.
 */
const themeInit = `(function(){try{var t=localStorage.getItem('incendib-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="bg-bg-base text-fg antialiased" suppressHydrationWarning>
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-btn focus:bg-bg-raised focus:px-3 focus:py-2 focus:text-body"
        >
          Saltar al contenido
        </a>
        <NowProvider initialNow={getNow()}>{children}</NowProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
