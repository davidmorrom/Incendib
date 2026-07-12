import { getBurnedAreas } from '@/lib/data';
import { HistoricoScreen } from '@/components/screens/HistoricoScreen';

// Pantalla canónica 10b: archivo de área quemada de la campaña (EFFIS/Copernicus).
export const metadata = { title: 'Histórico de campaña' };

export default async function HistoricoPage() {
  const areas = await getBurnedAreas();
  return <HistoricoScreen areas={areas} />;
}
