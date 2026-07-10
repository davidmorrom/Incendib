'use client';

/**
 * Registra el service worker (/sw.js). Llamar desde un componente cliente en
 * el layout una vez la app esté lista. En dev el SW puede molestar al HMR, así
 * que solo se registra en producción por defecto.
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (process.env.NODE_ENV !== 'production') return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
      // No romper la app si el registro falla; la web funciona sin SW.
      console.warn('[iberfuego] SW registration failed:', err);
    });
  });
}
