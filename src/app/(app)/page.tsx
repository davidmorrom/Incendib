import { getFires, getHotspots, countHotspots24h } from '@/lib/data';
import { getNow } from '@/lib/time';
import { MapaScreen } from '@/components/screens/MapaScreen';

// Home = Mapa (pantalla canónica 2a). El servidor obtiene los incendios (pocos,
// necesarios para KPIs y lista) y el número de "focos 24 h" para el KPI. Los
// focos FIRMS completos y los perímetros EFFIS NO se serializan en el HTML: solo
// los consume el mapa (client-only) y los pide a /api/map-layers al montar, lo
// que aligera el HTML de la home y acelera la hidratación (ver MapCanvasClient).
export default async function MapaPage() {
  const [fires, hotspots] = await Promise.all([getFires(), getHotspots()]);
  return <MapaScreen fires={fires} focos24h={countHotspots24h(hotspots, getNow())} />;
}
