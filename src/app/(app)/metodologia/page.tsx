import { ContentScreen } from '@/components/screens/ContentScreen';
import { METHODOLOGY } from '@/lib/pages';

export const metadata = {
  title: 'Metodología',
  description:
    'Cómo Incendib obtiene, combina y presenta los datos de incendios: fuentes, satélite, superficie y limitaciones.',
};

export default function MetodologiaPage() {
  return <ContentScreen content={METHODOLOGY} />;
}
