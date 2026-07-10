import { getFires, getSourceStatus } from '@/lib/data';
import { MOCK_HOTSPOTS_24H } from '@/lib/data/mock';
import { InformeScreen } from '@/components/screens/InformeScreen';

// Pantalla canónica 2b: KPIs 2×2 + filtros Todos/España/Portugal + tabla densa.
export const metadata = { title: 'Informe de situación' };

export default async function InformePage() {
  const [fires, sources] = await Promise.all([getFires(), getSourceStatus()]);
  return <InformeScreen fires={fires} focos24h={MOCK_HOTSPOTS_24H} sources={sources} />;
}
