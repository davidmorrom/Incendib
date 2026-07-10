import { ScaffoldNotice } from '@/components/ScaffoldNotice';

// Pantallas canónicas 10a–10b: ficha de extinguido (balance final) + archivo.
export const metadata = { title: 'Histórico' };

export default function HistoricoPage() {
  return <ScaffoldNotice screen="Histórico de campaña" canonicalId="10a–10b" />;
}
