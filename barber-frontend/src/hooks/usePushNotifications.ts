import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../services/apiClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export const usePushNotifications = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'default'
  );
  const [statusMessage, setStatusMessage] = useState('Enable notifications');

  const hasNotificationApi = 'Notification' in window;
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasPushManager = 'PushManager' in window;
  const isSupported = hasNotificationApi && hasServiceWorker && hasPushManager;

  const isSecureOrLocalhost =
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandaloneIOS =
    isIOS &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
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

  const subscribeToPush = useCallback(async (userId: string) => {
    if (!isSupported) {
      setStatusMessage('Push notifications are not supported on this device/browser.');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      setStatusMessage('VAPID public key is missing.');
      return false;
    }

    if (!isSecureOrLocalhost) {
      setStatusMessage('Notifications require HTTPS on mobile devices.');
      return false;
    }

    if (isIOS && !isStandaloneIOS) {
      setStatusMessage('On iPhone/iPad, install app to Home Screen first.');
      return false;
    }

    if (!userId) {
      setStatusMessage('User session is missing. Please re-login.');
      return false;
    }

    try {
      if (!hasNotificationApi) {
        setStatusMessage('Notification API is not available.');
        return false;
      }

      if (Notification.permission === 'denied') {
        setStatusMessage('Notifications are blocked in browser settings.');
        return false;
      }

      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setStatusMessage('Notification permission was not granted.');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
        } catch {
          setStatusMessage('Failed to create push subscription on this device.');
          return false;
        }
      }

      setIsSubscribed(true);

      const { endpoint, keys } = subscription.toJSON();
      if (!keys?.p256dh || !keys?.auth) return false;

      await apiClient.savePushSubscription({
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: navigator.userAgent
      });
      setStatusMessage('Notifications enabled successfully.');

      return true;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Push subscription aborted');
        setStatusMessage('Subscription was aborted. Please try again.');
      } else {
        console.error('Failed to subscribe to push:', error);
        setStatusMessage(error?.message || 'Failed to subscribe to push notifications.');
      }
      return false;
    }
  }, [hasNotificationApi, isIOS, isSecureOrLocalhost, isStandaloneIOS, isSupported]);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported) {
        setStatusMessage('Push notifications are not supported on this device/browser.');
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
      if (subscription) {
        setStatusMessage('Notifications enabled');
      }
    };
    checkSubscription();
  }, [isSupported]);

  return {
    subscribeToPush,
    permission,
    isSubscribed,
    isSupported,
    statusMessage
  };
};
