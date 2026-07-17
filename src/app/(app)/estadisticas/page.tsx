import { EstadisticasScreen } from '@/components/screens/EstadisticasScreen';
import { getEgifDataset } from '@/lib/stats/egif';

// Pantalla de Estadísticas (F1 del research): serie histórica oficial EGIF/MITECO.
// Datos estáticos versionados en el repo → build estático (sin `revalidate`).
export const metadata = {
  title: 'Estadísticas',
  description:
    'Serie histórica oficial de incendios forestales en España (EGIF · MITECO): siniestros y superficie quemada por año, y rankings por comunidad y provincia.',
};

export default function EstadisticasPage() {
  return <EstadisticasScreen data={getEgifDataset()} />;
}
