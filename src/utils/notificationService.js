/**
 * Universal Notification Service for PWA & Desktop Web
 * Resolves mobile compatibility issues where new Notification() throws an Illegal Constructor error.
 */

export const isNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window && Boolean(window.Notification);
};

export const isNotificationGranted = () => {
  return isNotificationSupported() && Notification.permission === 'granted';
};

export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) return 'denied';
  try {
    if (typeof Notification.requestPermission === 'function') {
      const permission = await Notification.requestPermission();
      return permission;
    }
  } catch (err) {
    console.warn('[NotificationService] Permission request failed:', err);
  }
  return Notification.permission || 'denied';
};

export const showAppNotification = async (title, options = {}) => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const notificationOptions = {
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    renotify: true,
    tag: options.tag || 'leave-vault-attendance',
    ...options
  };

  // 1. Mobile & PWA: Prefer ServiceWorker showNotification (mandatory on Android / iOS PWA)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, notificationOptions);
        return true;
      }
    } catch (swErr) {
      console.warn('[NotificationService] ServiceWorker showNotification failed, trying fallback:', swErr);
    }
  }

  // 2. Desktop Fallback: Standard window Notification constructor
  try {
    new Notification(title, notificationOptions);
    return true;
  } catch (deskErr) {
    console.warn('[NotificationService] Desktop Notification constructor failed:', deskErr);
  }

  return false;
};
