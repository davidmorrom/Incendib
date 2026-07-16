import { ContentScreen } from '@/components/screens/ContentScreen';
import { ABOUT } from '@/lib/pages';

export const metadata = {
  title: 'Acerca del proyecto',
  description:
    'Incendib: visor web gratuito y sin ánimo de lucro de incendios forestales activos en España y Portugal.',
};

export default function AcercaPage() {
  return <ContentScreen content={ABOUT} />;
}
