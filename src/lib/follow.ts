'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Lista de seguimiento local del usuario: incendios que ha marcado como
 * «seguir» en su ficha. Se persiste en localStorage (no requiere backend) y se
 * consulta desde la ficha (estado del botón) y desde Ajustes de alertas (lista
 * «Incendios que sigues»). Guardamos nombre y territorio para poder listarlos
 * sin volver a pedir el dato. Las notificaciones push por incendio se añadirán
 * cuando exista el backend de alertas (Upstash); esto es la base.
 */
export interface FollowedFire {
  slug: string;
  name: string;
  region: string;
}

interface FollowState {
  fires: FollowedFire[];
  toggle: (fire: FollowedFire) => void;
  unfollow: (slug: string) => void;
}

export const useFollowStore = create<FollowState>()(
  persist(
    (set) => ({
      fires: [],
      toggle: (fire) =>
        set((s) =>
          s.fires.some((f) => f.slug === fire.slug)
            ? { fires: s.fires.filter((f) => f.slug !== fire.slug) }
            : { fires: [...s.fires, fire] },
        ),
      unfollow: (slug) => set((s) => ({ fires: s.fires.filter((f) => f.slug !== slug) })),
    }),
    { name: 'incendib-follows' },
  ),
);
