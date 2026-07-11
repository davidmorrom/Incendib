import { getFires, getHotspots, getBurnedAreas, countHotspots24h } from '@/lib/data';
import { getNow } from '@/lib/time';
import { MapaScreen } from '@/components/screens/MapaScreen';

// Home = Mapa (pantalla canónica 2a). El servidor obtiene incendios, focos
// satelitales (FIRMS) y áreas quemadas recientes (EFFIS) y los pasa a la isla
// cliente (mapa + KPIs + lista).
export default async function MapaPage() {
  const [fires, hotspots, burnedAreas] = await Promise.all([
    getFires(),
    getHotspots(),
    getBurnedAreas(),
  ]);
  return (
    <MapaScreen
      fires={fires}
      hotspots={hotspots}
      burnedAreas={burnedAreas}
      focos24h={countHotspots24h(hotspots, getNow())}
    />
  );
}
