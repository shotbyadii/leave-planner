// Basic Service Worker for Leave Vault PWA Installation & Offline Support
const CACHE_NAME = 'leave-vault-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/favicon.svg',
        '/app-icon-192.png',
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
    title: 'Attendance Check-in',
    body: 'Where are you working today?',
    icon: '/app-icon-192.png',
    badge: '/app-icon-192.png',
    tag: 'leave-vault-attendance',
    data: { url: '/?action=attendance', date: new Date().toISOString().split('T')[0] },
    renotify: true,
    requireInteraction: true,
    vibrate: [150, 80, 150],
    actions: [
      { action: 'action_wfh', title: '🏠 WFH' },
      { action: 'action_office', title: '🏢 Office' },
      { action: 'action_leave', title: '🌴 Leave' }
    ]
  };

  if (event.data) {
    try {
      const data = event.data.json();
      payload = {
        ...payload,
        ...data,
        data: {
          url: data.url || (data.data && data.data.url) || '/?action=attendance',
          date: data.date || (data.data && data.data.date) || new Date().toISOString().split('T')[0],
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
    icon: payload.icon || '/app-icon-192.png',
    badge: payload.badge || '/app-icon-192.png',
    tag: payload.tag || 'leave-vault-attendance',
    data: payload.data || { url: '/?action=attendance', date: new Date().toISOString().split('T')[0] },
    renotify: payload.renotify ?? true,
    requireInteraction: payload.requireInteraction ?? true,
    vibrate: payload.vibrate || [150, 80, 150],
    actions: payload.actions || [
      { action: 'action_wfh', title: '🏠 WFH' },
      { action: 'action_office', title: '🏢 Office' },
      { action: 'action_leave', title: '🌴 Leave' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

// Handle Notification clicks on Mobile & Desktop
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const notif = event.notification;
  const data = notif.data || {};
  const targetDate = data.date || new Date().toISOString().split('T')[0];

  // 1. Direct Background 1-Tap Check-in (ColorOS 16 Live Activity / Fluid Cloud)
  if (action === 'action_wfh' || action === 'action_office') {
    notif.close();

    const isWfh = action === 'action_wfh';
    const statusType = isWfh ? 'wfh' : 'office';
    const statusLabel = isWfh ? 'Work From Home' : 'In-Office';

    // Broadcast update to any active window/tab via BroadcastChannel
    try {
      const bc = new BroadcastChannel('leave-vault-sync');
      bc.postMessage({ type: 'LEAVES_UPDATED', todayStr: targetDate, statusType });
      bc.close();
    } catch (_) {}

    // Post to all active clients
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach(c => {
        c.postMessage({ type: 'QUICK_ATTENDANCE_LOGGED', date: targetDate, statusType });
      });
    });

    // Background REST call to Supabase if credentials are provided in data payload
    const promises = [];
    if (data.supabaseUrl && data.supabaseKey && data.userId) {
      const restPromise = fetch(`${data.supabaseUrl}/rest/v1/leaves`, {
        method: 'POST',
        headers: {
          'apikey': data.supabaseKey,
          'Authorization': `Bearer ${data.supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          user_id: data.userId,
          date: targetDate,
          type: statusType,
          duration: 1,
          note: statusLabel
        })
      }).catch(err => console.warn('[SW] Background leave insert failed:', err));
      promises.push(restPromise);
    }

    // Display temporary confirmation notification
    const confirmPromise = self.registration.showNotification('Leave Vault', {
      body: `✅ Recorded as ${statusLabel} for ${targetDate}`,
      icon: '/app-icon-192.png',
      badge: '/app-icon-192.png',
      tag: 'leave-vault-attendance-confirmed',
      renotify: true
    }).then(() => {
      setTimeout(async () => {
        const activeNotifs = await self.registration.getNotifications({ tag: 'leave-vault-attendance-confirmed' });
        activeNotifs.forEach(n => n.close());
      }, 2500);
    });
    promises.push(confirmPromise);

    event.waitUntil(Promise.all(promises));
    return;
  }

  // 2. Direct Background Batch Log: All unrecorded days marked as In-Office
  if (action === 'action_all_office') {
    notif.close();
    const dates = Array.isArray(data.dates) && data.dates.length > 0 ? data.dates : [targetDate];

    try {
      const bc = new BroadcastChannel('leave-vault-sync');
      bc.postMessage({ type: 'LEAVES_UPDATED', batch: true, statusType: 'office', dates });
      bc.close();
    } catch (_) {}

    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach(c => {
        c.postMessage({ type: 'QUICK_ATTENDANCE_LOGGED', batch: true, dates, statusType: 'office' });
      });
    });

    const promises = [];
    if (data.supabaseUrl && data.supabaseKey && data.userId) {
      for (const d of dates) {
        const restPromise = fetch(`${data.supabaseUrl}/rest/v1/leaves`, {
          method: 'POST',
          headers: {
            'apikey': data.supabaseKey,
            'Authorization': `Bearer ${data.supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            user_id: data.userId,
            date: d,
            type: 'office',
            duration: 1,
            note: 'In-Office'
          })
        }).catch(err => console.warn('[SW] Background batch leave insert failed:', err));
        promises.push(restPromise);
      }
    }

    const confirmPromise = self.registration.showNotification('Attendance Recorded', {
      body: `✅ Recorded ${dates.length} day${dates.length === 1 ? '' : 's'} as In-Office`,
      icon: '/app-icon-192.png',
      badge: '/app-icon-192.png',
      tag: 'leave-vault-attendance-confirmed',
      renotify: true
    }).then(() => {
      setTimeout(async () => {
        const activeNotifs = await self.registration.getNotifications({ tag: 'leave-vault-attendance-confirmed' });
        activeNotifs.forEach(n => n.close());
      }, 2500);
    });
    promises.push(confirmPromise);

    event.waitUntil(Promise.all(promises));
    return;
  }

  // 3. Navigation & Deep Linking Actions
  notif.close();
  let targetUrl = '/';
  if (action === 'action_leave') {
    targetUrl = `/?action=leave&date=${targetDate}`;
  } else if (action === 'action_catchup_review') {
    targetUrl = '/?action=attendance&mode=catchup';
  } else if (action === 'action_view_plan' || action === 'action_view_tracker') {
    targetUrl = '/?action=tracker';
  } else if (action === 'action_view_calendar') {
    targetUrl = '/?action=calendar';
  } else {
    targetUrl = data.url || `/?action=attendance&date=${targetDate}`;
  }

  // Focus existing open window or open a new one
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
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

