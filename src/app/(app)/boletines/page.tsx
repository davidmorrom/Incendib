import { listBoletines } from '@/lib/boletin/store';
import { BoletinesScreen } from '@/components/screens/BoletinesScreen';

// Índice de boletines semanales (archivo consultable, citable e indexable).
export const metadata = {
  title: 'Boletines semanales',
  alternates: { types: { 'application/rss+xml': '/boletines/rss.xml' } },
};

export default function BoletinesPage() {
  return <BoletinesScreen boletines={listBoletines()} />;
}
