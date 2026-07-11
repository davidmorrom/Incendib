import { listBoletines } from '@/lib/boletin/store';
import { BoletinesScreen } from '@/components/screens/BoletinesScreen';

// Índice de boletines semanales (archivo consultable, citable e indexable).
export const metadata = { title: 'Boletines semanales' };

export default function BoletinesPage() {
  return <BoletinesScreen boletines={listBoletines()} />;
}
