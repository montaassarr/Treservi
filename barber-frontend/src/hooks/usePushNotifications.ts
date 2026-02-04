
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
let hasServiceWorkerListeners = false;

export const usePushNotifications = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'default'
  );

  // Helper to convert VAPID key (web-push standard)
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

  // Check if service worker is registered
  const isServiceWorkerRegistered = async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) return false;
    
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration !== undefined;
    } catch {
      return false;
    }
  };

  // Register service worker if not already registered
  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return null;
    }

    try {
      // Check if already registered
      let registration = await navigator.serviceWorker.getRegistration();
      
      if (!registration) {
        registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/'
        });
        console.log('Service Worker registered:', registration);
      }

      if (!hasServiceWorkerListeners) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
        hasServiceWorkerListeners = true;
      }

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration?.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            installingWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      await registration.update();
      await navigator.serviceWorker.ready;
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  };

  // Generate subscription endpoint (following tutorial approach)
  const generateSubscriptionEndpoint = async (
    registration: ServiceWorkerRegistration
  ): Promise<PushSubscription | null> => {
    if (!VAPID_PUBLIC_KEY) {
      console.error('VAPID public key not found');
      return null;
    }

    try {
      // Check existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Subscribe with VAPID key
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true, // Required for Chrome/iOS
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        console.log('Push subscription created:', subscription.endpoint);
      } else {
        console.log('Push subscription already exists:', subscription.endpoint);
      }

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
      return null;
    }
  };

  // Main subscribe function (iOS 16.4+ compatible)
  const subscribeToPush = useCallback(async (userId: string) => {
    // Check browser support
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      console.log('Push notifications not supported on this browser');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error('VAPID_PUBLIC_KEY not configured');
      return false;
    }

    try {
      // Step 1: Request notification permission
      if (Notification.permission === 'denied') {
        console.log('Notification permission denied');
        return false;
      }

      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        console.log('Notification permission not granted:', permissionResult);
        return false;
      }

      // Step 2: Register service worker
      const registration = await registerServiceWorker();
      if (!registration) {
        console.error('Service worker registration failed');
        return false;
      }

      // Step 3: Generate subscription endpoint
      const subscription = await generateSubscriptionEndpoint(registration);
      if (!subscription) {
        console.error('Failed to generate subscription');
        return false;
      }

      setIsSubscribed(true);

      // Step 4: Save subscription to database
      const { endpoint, keys } = subscription.toJSON();
      if (!keys?.p256dh || !keys?.auth) {
        console.error('Invalid subscription keys');
        return false;
      }

      console.log('Saving subscription to database...');
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: navigator.userAgent,
          last_used_at: new Date().toISOString()
        }, { 
          onConflict: 'endpoint',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Failed to save push subscription to DB:', error);
        return false;
      }

      console.log('✅ Push notification subscription successful!');
      return true;

    } catch (error: any) {
      console.error('Push subscription error:', error);
      setPermission(Notification.permission);
      return false;
    }
  }, []);

  // Unsubscribe from push notifications
  const unsubscribeFromPush = useCallback(async (userId: string) => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('endpoint', subscription.endpoint);
        
        setIsSubscribed(false);
        console.log('Unsubscribed from push notifications');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Unsubscribe failed:', error);
      return false;
    }
  }, []);

  // Check subscription status on mount
  useEffect(() => {
    const checkSubscription = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        }
      } catch (error) {
        console.error('Failed to check subscription:', error);
      }
    };

    checkSubscription();
  }, []);

  return {
    subscribeToPush,
    unsubscribeFromPush,
    permission,
    isSubscribed,
    isServiceWorkerRegistered
  };
};
