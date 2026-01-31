/**
 * Push Notifications utility for Treservi PWA
 * Handles notification permissions, subscription, and local notifications
 */

// VAPID public key - you need to generate this for your server
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY_HERE';

// Notification sound (base64 encoded short beep or use URL)
const NOTIFICATION_SOUND_URL = 'https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3';

/**
 * Check if push notifications are supported
 */
export const isPushSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return 'denied';
  }
  
  const permission = await Notification.requestPermission();
  return permission;
};

/**
 * Get current notification permission status
 */
export const getNotificationPermission = (): NotificationPermission => {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
};

/**
 * Subscribe to push notifications
 */
export const subscribeToPush = async (): Promise<PushSubscription | null> => {
  if (!isPushSupported()) {
    console.log('Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Subscribe to push
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource
      });
    }
    
    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPush = async (): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Unsubscribe failed:', error);
    return false;
  }
};

/**
 * Show a local notification (for immediate notifications, not push)
 */
export const showLocalNotification = async (
  title: string,
  options: NotificationOptions & { playSound?: boolean } = {}
): Promise<void> => {
  if (Notification.permission !== 'granted') {
    console.log('Notification permission not granted');
    return;
  }

  const { playSound = true, ...notificationOptions } = options;

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Play notification sound
    if (playSound) {
      playNotificationSound();
    }
    
    await registration.showNotification(title, {
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      requireInteraction: false,
      ...notificationOptions
    } as NotificationOptions);
  } catch (error) {
    // Fallback to regular Notification API
    if (playSound) {
      playNotificationSound();
    }
    new Notification(title, {
      icon: '/icon-192.png',
      ...notificationOptions
    });
  }
};

/**
 * Play notification sound
 */
export const playNotificationSound = (): void => {
  try {
    // Create audio context for mobile compatibility
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    
    if (AudioContext) {
      const audioContext = new AudioContext();
      
      // Simple beep sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Hz
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } else {
      // Fallback to audio element
      const audio = new Audio(NOTIFICATION_SOUND_URL);
      audio.volume = 0.5;
      audio.play().catch(() => {
        console.log('Could not play notification sound');
      });
    }
  } catch (error) {
    console.log('Notification sound failed:', error);
  }
};

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
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
}

/**
 * Notification types for the app
 */
export type NotificationType = 
  | 'new_booking'
  | 'booking_reminder'
  | 'booking_cancelled'
  | 'booking_confirmed'
  | 'staff_message';

/**
 * Show app-specific notification with sound
 */
export const showAppNotification = async (
  type: NotificationType,
  data: { customerName?: string; serviceName?: string; time?: string; message?: string }
): Promise<void> => {
  const notifications: Record<NotificationType, { title: string; body: string }> = {
    new_booking: {
      title: '🎉 New Booking!',
      body: `${data.customerName} booked ${data.serviceName} at ${data.time}`
    },
    booking_reminder: {
      title: '⏰ Reminder',
      body: `${data.customerName}'s appointment in 30 minutes`
    },
    booking_cancelled: {
      title: '❌ Booking Cancelled',
      body: `${data.customerName} cancelled their appointment`
    },
    booking_confirmed: {
      title: '✅ Booking Confirmed',
      body: `Your appointment is confirmed for ${data.time}`
    },
    staff_message: {
      title: '💬 New Message',
      body: data.message || 'You have a new message'
    }
  };

  const notification = notifications[type];
  
  await showLocalNotification(notification.title, {
    body: notification.body,
    tag: type,
    playSound: true,
    data: { type, ...data }
  });
};
