import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Iberfuego — Incendios forestales activos · España y Portugal',
    template: '%s · Iberfuego',
  },
  description:
    'Visor sin ánimo de lucro de incendios forestales activos en España y Portugal. ' +
    'Agrega NASA FIRMS, EFFIS/Copernicus y fuentes oficiales. No sustituye al 112.',
  applicationName: 'Iberfuego',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Iberfuego' },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    siteName: 'Iberfuego',
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
const themeInit = `(function(){try{var t=localStorage.getItem('iberfuego-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

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
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
