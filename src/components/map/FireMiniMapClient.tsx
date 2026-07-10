'use client';

import dynamic from 'next/dynamic';
import type { Fire } from '@/types/fire';

/** Carga el mini-mapa solo en cliente (WebGL). */
const FireMiniMap = dynamic(() => import('./FireMiniMap').then((m) => m.FireMiniMap), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-bg-sunken" aria-hidden />,
});

export function FireMiniMapClient({ fire }: { fire: Fire }) {
  return <FireMiniMap fire={fire} />;
}
