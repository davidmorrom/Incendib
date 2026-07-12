import { redirect } from 'next/navigation';
import { latestBoletin } from '@/lib/boletin/store';

/**
 * `/boletin/latest` → redirige a la edición más reciente (o al índice si aún no
 * hay ninguna). URL estable y citable para enlazar "el último boletín" sin
 * conocer el id de la semana. Dinámica: refleja siempre la última publicada.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function LatestBoletinPage() {
  const b = latestBoletin();
  redirect(b ? `/boletin/${b.id}` : '/boletines');
}
