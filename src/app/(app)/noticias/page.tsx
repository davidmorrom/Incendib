import { getFires } from '@/lib/data';
import { NoticiasScreen } from '@/components/screens/NoticiasScreen';

// Pantalla canónica 3a (móvil) / 6a (desktop): directo 24h + titulares + cámaras
// DGT + cuentas, y en desktop una cronología en vivo a partir de los incendios.
export const metadata = { title: 'Noticias y directos' };

export default async function NoticiasPage() {
  const fires = await getFires();
  return <NoticiasScreen fires={fires} />;
}
