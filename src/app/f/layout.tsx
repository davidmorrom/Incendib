import { I18nProvider } from '@/components/i18n/I18nProvider';

/** Las fichas /f/{slug} viven fuera del shell de pestañas (pantalla completa,
 * compartible), pero necesitan i18n/tema. */
export default function FichaLayout({ children }: { children: React.ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}
