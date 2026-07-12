import { getFires, getHotspots, countHotspots24h } from '@/lib/data';
import { getNow } from '@/lib/time';
import { IncendiosHoyScreen } from '@/components/screens/IncendiosHoyScreen';

// Ranking territorial de la actividad de incendios (por provincia/distrito).
export const metadata = { title: 'Incendios hoy' };

export default async function IncendiosHoyPage() {
  const [fires, hotspots] = await Promise.all([getFires(), getHotspots()]);
  return <IncendiosHoyScreen fires={fires} focos24h={countHotspots24h(hotspots, getNow())} />;
}
