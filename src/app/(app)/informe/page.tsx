import { getFires, getHotspots, getSourceStatus } from '@/lib/data';
import { InformeScreen } from '@/components/screens/InformeScreen';

// Pantalla canónica 2b: KPIs 2×2 + filtros Todos/España/Portugal + tabla densa.
export const metadata = { title: 'Informe de situación' };

export default async function InformePage() {
  const [fires, hotspots, sources] = await Promise.all([
    getFires(),
    getHotspots(),
    getSourceStatus(),
  ]);
  return <InformeScreen fires={fires} focos24h={hotspots.length} sources={sources} />;
}
