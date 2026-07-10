import { getFires } from '@/lib/data';
import { MOCK_HOTSPOTS_24H } from '@/lib/data/mock';
import { MapaScreen } from '@/components/screens/MapaScreen';

// Home = Mapa (pantalla canónica 2a). El servidor obtiene los incendios y los
// pasa a la isla cliente (mapa + KPIs + lista con filtros).
export default async function MapaPage() {
  const fires = await getFires();
  return <MapaScreen fires={fires} focos24h={MOCK_HOTSPOTS_24H} />;
}
