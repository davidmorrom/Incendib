import { clsx, type ClassValue } from 'clsx';

/** Une clases condicionales. Envoltura fina de clsx para uso en componentes. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
