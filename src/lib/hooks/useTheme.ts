'use client';

import type { Theme } from '@/lib/design/tokens';
import { useUIStore } from '@/lib/store';

/**
 * Tema efectivo ('dark' | 'light'). Claro por defecto: no se sigue
 * prefers-color-scheme; el oscuro (sala de control) es opt-in del usuario.
 */
export function useEffectiveTheme(): Theme {
  return useUIStore((s) => s.theme) ?? 'light';
}
