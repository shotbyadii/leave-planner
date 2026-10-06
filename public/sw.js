// Basic Service Worker for Leave Vault PWA Installation & Offline Support
const CACHE_NAME = 'leave-vault-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/favicon.svg',
        '/manifest.webmanifest'
      ]).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass through fetch with cache fallback if offline
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Handle Web Push event (Background notifications on iOS, Android & Desktop)
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Daily Attendance Check-in',
    body: 'Please confirm whether today is Work From Home or In-Office.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'wfh-checkin',
    data: { url: '/?action=attendance' },
    renotify: true,
    vibrate: [200, 100, 200]
  };

  if (event.data) {
    try {
      const data = event.data.json();
      payload = {
        ...payload,
        ...data,
        data: {
          url: data.url || (data.data && data.data.url) || '/?action=attendance',
          ...(data.data || {})
        }
      };
    } catch (err) {
      const rawText = event.data.text();
      if (rawText) {
        payload.body = rawText;
      }
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || '/favicon.svg',
    badge: payload.badge || '/favicon.svg',
    tag: payload.tag || 'leave-vault-attendance',
    data: payload.data || { url: '/?action=attendance' },
    renotify: payload.renotify ?? true,
    vibrate: payload.vibrate || [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

// Handle Notification clicks on Mobile & Desktop
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  // Focus existing open window or open a new one
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  // Notification dismissed by user
});

