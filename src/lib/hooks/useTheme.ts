'use client';

import type { Theme } from '@/lib/design/tokens';
import { useUIStore } from '@/lib/store';

/**
 * Tema efectivo ('dark' | 'light'). Oscuro por defecto (sala de control): no se
 * sigue prefers-color-scheme; el claro es opt-in del usuario (para exteriores).
 */
export function useEffectiveTheme(): Theme {
  return useUIStore((s) => s.theme) ?? 'dark';
}
