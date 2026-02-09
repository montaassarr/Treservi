import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../services/apiClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export const usePushNotifications = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);

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
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      return false;
    }

    try {
      if (Notification.permission === 'denied') {
        return false;
      }

      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
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

      return true;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Push subscription aborted');
      } else {
        console.error('Failed to subscribe to push:', error);
      }
      return false;
    }
  }, []);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    };
    checkSubscription();
  }, []);

  return {
    subscribeToPush,
    permission,
    isSubscribed
  };
};
