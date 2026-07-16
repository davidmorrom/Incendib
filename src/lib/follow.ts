'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncFollowedToServer } from '@/lib/alerts/storage';

/**
 * Lista de seguimiento local del usuario: incendios que ha marcado como
 * «seguir» en su ficha. Se persiste en localStorage (no requiere backend) y se
 * consulta desde la ficha (estado del botón) y desde Ajustes de alertas (lista
 * «Incendios que sigues»). Guardamos nombre y territorio para poder listarlos
 * sin volver a pedir el dato.
 *
 * Al cambiar la lista, si hay una suscripción Web Push activa, los slugs seguidos
 * se sincronizan con el servidor (`syncFollowedToServer`) para que el cron pueda
 * avisar de novedades en los incendios seguidos aunque no visites la pantalla de
 * Alertas. Sin suscripción es no-op.
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
    (set, get) => ({
      fires: [],
      toggle: (fire) => {
        set((s) =>
          s.fires.some((f) => f.slug === fire.slug)
            ? { fires: s.fires.filter((f) => f.slug !== fire.slug) }
            : { fires: [...s.fires, fire] },
        );
        void syncFollowedToServer(get().fires.map((f) => f.slug));
      },
      unfollow: (slug) => {
        set((s) => ({ fires: s.fires.filter((f) => f.slug !== slug) }));
        void syncFollowedToServer(get().fires.map((f) => f.slug));
      },
    }),
    { name: 'incendib-follows' },
  ),
);
