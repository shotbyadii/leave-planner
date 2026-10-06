import { supabase } from '../lib/supabase';

/**
 * Universal Notification & Web Push Service for PWA & Desktop Web
 * Supports background push notifications on iOS 16.4+ (Home Screen PWA), Android (WebAPK/Chrome), and Desktop.
 */

export const urlBase64ToUint8Array = (base64String) => {
  if (!base64String) return new Uint8Array();
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const isNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window && Boolean(window.Notification);
};

export const isPushSupported = () => {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    Boolean(window.PushManager)
  );
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

/**
 * Retrieve active push subscription from ServiceWorker registration
 */
export const getExistingPushSubscription = async () => {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.warn('[NotificationService] Failed to get existing push subscription:', err);
    return null;
  }
};

/**
 * Subscribes the current device to Web Push and saves the subscription to Supabase.
 */
export const subscribeUserToPush = async (userId = null) => {
  if (!isNotificationSupported()) {
    console.warn('[NotificationService] Notifications are not supported in this browser.');
    return { success: false, reason: 'not_supported' };
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return { success: false, reason: 'permission_denied' };
  }

  if (!isPushSupported()) {
    console.warn('[NotificationService] PushManager is not supported in this context (e.g. non-installed Safari).');
    return { success: false, reason: 'push_not_supported' };
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.warn('[NotificationService] VITE_VAPID_PUBLIC_KEY is not defined in environment.');
    return { success: false, reason: 'missing_vapid_key' };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }

    const subJson = subscription.toJSON();
    if (subJson && subJson.keys) {
      const payload = {
        user_id: userId || null,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(payload, { onConflict: 'endpoint' });

      if (error) {
        console.warn('[NotificationService] Could not store subscription in Supabase:', error);
      } else {
        localStorage.setItem('push_subscribed', 'true');
      }
    }

    return { success: true, subscription };
  } catch (err) {
    console.error('[NotificationService] subscribeUserToPush error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Unsubscribes the current device from Web Push and removes subscription from Supabase.
 */
export const unsubscribeUserFromPush = async () => {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      if (endpoint) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', endpoint);
      }
      localStorage.removeItem('push_subscribed');
      return true;
    }
  } catch (err) {
    console.warn('[NotificationService] unsubscribeUserFromPush error:', err);
  }
  return false;
};

/**
 * Show immediate notification via ServiceWorker or fallback
 */
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

/**
 * Trigger a server-side test push via the Supabase Edge Function
 */
export const triggerTestWebPush = async (userId = null) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: {
        action: 'test',
        userId: userId || null
      }
    });
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.warn('[NotificationService] triggerTestWebPush failed:', err);
    return { success: false, error: err.message };
  }
};
