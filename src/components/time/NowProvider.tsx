'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { MOCK_NOW } from '@/lib/time';

/**
 * "Ahora" compartido para toda la app cliente.
 *
 * Problema que resuelve: en modo `live` calcular `Date.now()` DURANTE el render
 * (tiempos relativos "hace 6 min", reloj "14:32", filtro por periodo) difiere
 * entre el HTML del servidor y la hidratación del cliente → desajuste de
 * hidratación (React #418).
 *
 * Solución: el servidor calcula un `initialNow` y lo pasa como prop. El primer
 * render del cliente usa EXACTAMENTE ese valor (coincide con el HTML servido),
 * y sólo tras montar el cliente pasa al reloj real y lo refresca cada minuto.
 * En modo `mock` el "ahora" es fijo (MOCK_NOW): determinista y fiel al diseño.
 */
const NowContext = createContext<number>(MOCK_NOW);

const IS_LIVE = process.env.NEXT_PUBLIC_DATA_MODE === 'live';

export function NowProvider({
  initialNow,
  children,
}: {
  initialNow: number;
  children: React.ReactNode;
}) {
  const [now, setNow] = useState(initialNow);

  useEffect(() => {
    // En mock el "ahora" no avanza (fidelidad de diseño y tests deterministas).
    if (!IS_LIVE) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  return <NowContext.Provider value={now}>{children}</NowContext.Provider>;
}

/** "Ahora" (ms) estable server↔cliente en el primer render; se refresca en vivo. */
export function useNow(): number {
  return useContext(NowContext);
}
