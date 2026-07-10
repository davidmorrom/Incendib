import { getFires, getHotspots } from '@/lib/data';
import { MapaScreen } from '@/components/screens/MapaScreen';

// Home = Mapa (pantalla canónica 2a). El servidor obtiene incendios y focos
// satelitales (FIRMS) y los pasa a la isla cliente (mapa + KPIs + lista).
export default async function MapaPage() {
  const [fires, hotspots] = await Promise.all([getFires(), getHotspots()]);
  return <MapaScreen fires={fires} hotspots={hotspots} focos24h={hotspots.length} />;
}
