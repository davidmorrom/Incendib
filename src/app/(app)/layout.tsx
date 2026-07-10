import { I18nProvider } from '@/components/i18n/I18nProvider';
import { BottomNav } from '@/components/layout/BottomNav';

/**
 * Shell de la app: marco de altura de viewport con área de contenido scrollable
 * y barra inferior común a todas las pestañas (2a). Provee i18n a los
 * componentes cliente. La ficha /f/{slug} vive fuera de este grupo (pantalla
 * completa, sin barra inferior).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <div className="flex h-dvh flex-col overflow-hidden bg-bg-base text-fg">
        <div id="contenido" className="flex min-h-0 flex-1 flex-col">
          {children}
        </div>
        <BottomNav />
      </div>
    </I18nProvider>
  );
}
