import { ScaffoldNotice } from '@/components/ScaffoldNotice';

// Pantalla canónica 2b: KPIs 2×2 + filtros Todos/España/Portugal + tabla densa.
export const metadata = { title: 'Informe de situación' };

export default function InformePage() {
  return <ScaffoldNotice screen="Informe de situación" canonicalId="2b" />;
}
