import { I18nProvider } from '@/components/i18n/I18nProvider';
import { BottomNav } from '@/components/layout/BottomNav';
import { DesktopTopNav } from '@/components/layout/DesktopTopNav';
import { NetworkStatus } from '@/components/layout/NetworkStatus';
import { SkipLink } from '@/components/layout/SkipLink';

/**
 * Shell de la app: marco de altura de viewport con área de contenido scrollable
 * y barra inferior común a todas las pestañas (2a). Provee i18n a los
 * componentes cliente. La ficha /f/{slug} vive fuera de este grupo (pantalla
 * completa, sin barra inferior).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <div className="flex h-dvh flex-col overflow-hidden bg-bg-base text-fg print:block print:h-auto print:overflow-visible">
        <SkipLink />
        <div className="print:hidden">
          <NetworkStatus />
        </div>
        <DesktopTopNav className="hidden lg:flex print:!hidden" />
        <main
          id="contenido"
          tabIndex={-1}
          className="flex min-h-0 flex-1 flex-col outline-none print:block print:min-h-0 print:overflow-visible"
        >
          {children}
        </main>
        <BottomNav className="lg:hidden print:!hidden" />
      </div>
    </I18nProvider>
  );
}
