
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export const usePushNotifications = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);

  // Helper to convert VAPID key
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
      console.warn('Push messaging is not supported');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error('VAPID Public Key is missing');
      return false;
    }

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Check existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Check if we need to resubscribe? 
        // For now, assume existing subscription is fine, but we should make sure it's in DB.
        // If we want to force resubscribe, we'd unsubscribe first.
        console.log('Already subscribed via PushManager');
      } else {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      setIsSubscribed(true);

      // Send to backend
      const { endpoint, keys } = subscription.toJSON();
      if (!keys?.p256dh || !keys?.auth) return false;

      // Upsert into Supabase
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: navigator.userAgent,
          last_used_at: new Date().toISOString() // Update timestamp
        }, { onConflict: 'endpoint' });

      if (error) {
        console.error('Failed to save push subscription:', error);
        return false;
      }

      console.log('Push subscription saved successfully');
      return true;

    } catch (error) {
      console.error('Failed to subscribe to push:', error);
      return false;
    }
  }, []);

  return {
    subscribeToPush,
    permission,
    isSubscribed
  };
};
