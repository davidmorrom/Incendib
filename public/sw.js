/*
 * Incendib — Service Worker (ANDAMIAJE).
 *
 * Cubre dos necesidades del handoff:
 *  1) Caché offline: servir la última vista con antigüedad visible cuando no
 *     hay red (estado 4d). Estrategia network-first para datos, cache-first
 *     para el app shell.
 *  2) Web Push: recibir alertas (zonas del usuario). Las alertas de EVACUACIÓN
 *     ignoran "No molestar" (requireInteraction).
 *
 * TODO(fase-web-push): precache del shell, versionado de caché y payloads
 * reales. Este archivo se registra desde src/lib/pwa/register-sw.ts.
 */

const CACHE = 'incendib-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Network-first con fallback a caché (datos con antigüedad visible).
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request)),
  );
});

// ── Web Push ─────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  // Parseo defensivo: nunca dejar de mostrar notificación por un payload raro.
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    try {
      data = { body: event.data.text() };
    } catch {
      data = {};
    }
  }
  const isEvacuation = data.severity === 'evacuation';

  event.waitUntil(
    self.registration.showNotification(data.title || 'Incendib', {
      body: data.body || 'Novedad en un incendio de tu zona.',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: data.tag || 'incendib',
      // Evacuaciones: persistente y con vibración; ignoran "No molestar".
      requireInteraction: isEvacuation,
      vibrate: isEvacuation ? [200, 100, 200, 100, 200] : undefined,
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Navega SOLO dentro del propio origen: aunque un payload trajera una URL
  // absoluta externa, no abrimos destinos de terceros (defensa anti-phishing).
  let target = '/';
  try {
    const u = new URL(event.notification.data?.url ?? '/', self.location.origin);
    if (u.origin === self.location.origin) target = u.pathname + u.search + u.hash;
  } catch {
    /* payload raro → destino seguro por defecto */
  }
  event.waitUntil(clients.openWindow(target));
});
