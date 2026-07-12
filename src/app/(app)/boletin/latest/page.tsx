import { redirect } from 'next/navigation';
import { latestBoletin } from '@/lib/boletin/store';

/**
 * `/boletin/latest` → redirige a la edición más reciente (o al índice si aún no
 * hay ninguna). URL estable y citable para enlazar "el último boletín" sin
 * conocer el id de la semana.
 *
 * Estática a propósito: `latestBoletin()` lee el sistema de ficheros del repo,
 * disponible solo en build (no en el runtime serverless). Se resuelve en build
 * y se regenera al publicar una edición nueva (que dispara un redeploy). Con
 * runtime dinámico leería un directorio vacío y redirigiría siempre al índice.
 */
export default function LatestBoletinPage() {
  const b = latestBoletin();
  redirect(b ? `/boletin/${b.id}` : '/boletines');
}
