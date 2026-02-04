/**
 * iOS-compatible Notification Handler
 * Detects device/browser and provides appropriate notification strategy
 */

/**
 * Detect if running on iOS PWA
 */
export const isIOSPWA = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isStandalone = (navigator as any).standalone === true;
  const isInWebClip = (window.navigator as any).standalone === true;
  return isIOS && (isStandalone || isInWebClip || isWebApp());
};

/**
 * Detect if running as web app (not in Safari)
 */
export const isWebApp = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  // iOS PWA displays as "Mozilla/5.0 (iPhone..." without "Safari" when in standalone
  return /iphone|ipad|ipod/.test(userAgent) && !userAgent.includes('safari');
};

/**
 * Get platform-specific notification capability
 */
export interface NotificationCapability {
  supported: boolean;
  type: 'webpush' | 'realtime' | 'none';
  description: string;
  requiresPermission: boolean;
}

export const getNotificationCapability = (): NotificationCapability => {
  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  const hasWebPush = 'serviceWorker' in navigator && 'PushManager' in window;
  const hasNotificationAPI = 'Notification' in window;
  const isInstalledPWA = isIOSPWA();

  if (isIOS) {
    // iOS Web Push works only for installed PWAs (iOS 16.4+)
    if (hasWebPush && isInstalledPWA && hasNotificationAPI) {
      return {
        supported: true,
        type: 'webpush',
        description: 'iOS PWA detected: Web Push notifications supported',
        requiresPermission: true
      };
    }

    return {
      supported: true,
      type: 'realtime',
      description: 'iOS detected: Using real-time WebSocket notifications',
      requiresPermission: false
    };
  }

  if (hasWebPush && hasNotificationAPI) {
    return {
      supported: true,
      type: 'webpush',
      description: 'Web Push notifications supported',
      requiresPermission: true
    };
  }

  if (hasNotificationAPI) {
    return {
      supported: true,
      type: 'realtime',
      description: 'Notification API available (limited support)',
      requiresPermission: true
    };
  }

  return {
    supported: false,
    type: 'none',
    description: 'Notifications not supported on this device',
    requiresPermission: false
  };
};

/**
 * Request appropriate permission based on platform
 */
export const requestAppropriateNotificationPermission = async (): Promise<boolean> => {
  const capability = getNotificationCapability();

  // iOS realtime doesn't need permission
  if (capability.type === 'realtime' && /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())) {
    console.log('iOS detected: Real-time notifications ready (no permission needed)');
    return true;
  }

  // Web push requires permission on all platforms (including iOS PWA)
  if (capability.type === 'webpush' && 'Notification' in window) {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  return false;
};

/**
 * Show iOS-compatible notification
 * On iOS PWA: Uses visual toast + vibration (realtime notifications)
 * On Android/Desktop: Uses Web Push + sound
 */
export const showNativeNotification = async (
  title: string,
  options: {
    body?: string;
    tag?: string;
    badge?: string;
    icon?: string;
    data?: any;
  } = {}
): Promise<void> => {
  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  const capability = getNotificationCapability();

  if (isIOS && capability.type === 'realtime') {
    // iOS PWA: Use vibration + visual notification (via React component)
    // The actual UI notification is handled by useRealtimeNotifications hook
    try {
      // Request vibration permission and vibrate
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]); // Vibrate pattern: 200ms, pause 100ms, 200ms
      }

      // Try to play audio feedback (may be blocked by browser)
      playNotificationSound();
    } catch (error) {
      console.log('Could not play iOS notification feedback:', error);
    }
  } else {
    // Android/Desktop: Use Web Push API
    try {
      if ('serviceWorker' in navigator && 'Notification' in window) {
        const registration = await navigator.serviceWorker.ready;
        
        await registration.showNotification(title, {
          icon: options.icon || '/icon-192.png',
          badge: options.badge || '/icon-72.png',
          tag: options.tag,
          requireInteraction: false,
          ...options
        } as NotificationOptions);
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
      // Fallback to basic notification
      try {
        new Notification(title, options);
      } catch (fallbackError) {
        console.error('Fallback notification also failed:', fallbackError);
      }
    }
  }
};

/**
 * Play notification sound (iOS-friendly version)
 */
export const playNotificationSound = (): void => {
  try {
    // Create a simple beep using Web Audio API (better iOS support)
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;

    if (AudioContext) {
      try {
        const audioContext = new AudioContext();
        
        // Create a simple sine wave at 800Hz
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        // Set volume and create envelope
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (audioError) {
        console.log('Audio context creation failed, trying fallback');
        // Fallback to audio element
        const audioUrl = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAAA=';
        const audio = new Audio(audioUrl);
        audio.volume = 0.3;
        audio.play().catch(() => {
          console.log('Could not play fallback notification sound');
        });
      }
    }
  } catch (error) {
    console.log('Notification sound playback not supported:', error);
  }
};

/**
 * Create a user-friendly message explaining notification setup
 */
export const getNotificationSetupMessage = (): string => {
  const capability = getNotificationCapability();
  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

  if (isIOS) {
    if (capability.type === 'webpush') {
      return 'iOS PWA detected: enable notifications to receive push alerts.';
    }
    return 'Install the app to Home Screen to enable push notifications on iOS.';
  }

  if (capability.type === 'webpush') {
    return 'Click "Allow" to enable push notifications for appointments and reminders.';
  }

  if (capability.type === 'realtime') {
    return 'Real-time notifications are enabled for live updates.';
  }

  return 'Notifications are not supported on your device.';
};

/**
 * Check if notifications are actually working
 */
export const isNotificationWorking = async (): Promise<boolean> => {
  const capability = getNotificationCapability();
  return capability.supported;
};
