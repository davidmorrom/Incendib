import { getSourceStatus } from '@/lib/data';
import { FuentesScreen } from '@/components/screens/FuentesScreen';

// Pantalla canónica 3b: estado por fuente + atribución + disclaimer 112.
export const metadata = { title: 'Fuentes y licencias' };

export default async function FuentesPage() {
  const sources = await getSourceStatus();
  return <FuentesScreen sources={sources} />;
}
