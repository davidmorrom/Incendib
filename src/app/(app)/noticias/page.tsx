import { getFires, getNews } from '@/lib/data';
import { NoticiasScreen } from '@/components/screens/NoticiasScreen';

// Pantalla canónica 3a (móvil) / 6a (desktop): directo 24h + titulares reales
// (Google News RSS) + cuentas oficiales, y en desktop una cronología en vivo
// que mezcla incendios y titulares por hora.
export const metadata = { title: 'Noticias y directos' };

export default async function NoticiasPage() {
  const [fires, news] = await Promise.all([getFires(), getNews()]);
  return <NoticiasScreen fires={fires} news={news} />;
}
