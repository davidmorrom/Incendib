import { getBurnedAreas } from '@/lib/data';
import { dedupeBurnedAreas } from '@/lib/fires/burned';
import { HistoricoScreen } from '@/components/screens/HistoricoScreen';

// Pantalla canónica 10b: archivo de área quemada de la campaña (EFFIS/Copernicus).
export const metadata = { title: 'Histórico de campaña' };

export default async function HistoricoPage() {
  // EFFIS trocea algunos incendios en varios polígonos: se fusionan para el
  // listado (el mapa mantiene todos los polígonos para dibujar las formas).
  const areas = dedupeBurnedAreas(await getBurnedAreas());
  return <HistoricoScreen areas={areas} />;
}
