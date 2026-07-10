import { ScaffoldNotice } from '@/components/ScaffoldNotice';

// Pantalla canónica 3a: directo 24h + feed filtrado + cámaras DGT + cuentas.
export const metadata = { title: 'Noticias y directos' };

export default function NoticiasPage() {
  return <ScaffoldNotice screen="Noticias y directos" canonicalId="3a" />;
}
