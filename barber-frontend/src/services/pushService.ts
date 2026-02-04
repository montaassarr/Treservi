/**
 * Push Notification Service
 * 
 * Unified push notification service following the standard Web Push architecture.
 * Supports iOS (16.4+ with PWA), Android (after home screen add), and Desktop browsers.
 * 
 * Flow:
 * 1. Register Service Worker
 * 2. Request Notification Permission
 * 3. Subscribe to Push via PushManager
 * 4. Send subscription to backend (Supabase)
 * 5. Backend sends push via web-push protocol
 * 6. Service Worker receives and displays notification
 */

import { supabase } from './supabaseClient';

// VAPID public key from environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
  silent?: boolean;
  actions?: NotificationAction[];
}

export interface PlatformInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  isPWA: boolean;
  browserName: string;
  supportsWebPush: boolean;
  supportsNotifications: boolean;
  iosVersion: number | null;
}

export type SubscriptionStatus = 
  | 'unsupported'
  | 'permission-denied'
  | 'permission-default'
  | 'subscribed'
  | 'unsubscribed'
  | 'error';

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

/**
 * Detect platform and capabilities
 */
export function detectPlatform(): PlatformInfo {
  const ua = navigator.userAgent.toLowerCase();
  
  // iOS detection
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const iosVersionMatch = ua.match(/os (\d+)_/);
  const iosVersion = iosVersionMatch ? parseInt(iosVersionMatch[1], 10) : null;
  
  // Android detection
  const isAndroid = /android/.test(ua);
  
  // Desktop detection
  const isDesktop = !isIOS && !isAndroid;
  
  // PWA detection (standalone mode)
  const isPWA = 
    (window.matchMedia('(display-mode: standalone)').matches) ||
    ((navigator as any).standalone === true) ||
    document.referrer.includes('android-app://');
  
  // Browser detection
  let browserName = 'unknown';
  if (ua.includes('chrome') && !ua.includes('edge')) browserName = 'chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browserName = 'safari';
  else if (ua.includes('firefox')) browserName = 'firefox';
  else if (ua.includes('edge')) browserName = 'edge';
  
  // Web Push support
  const supportsServiceWorker = 'serviceWorker' in navigator;
  const supportsPushManager = 'PushManager' in window;
  const supportsNotifications = 'Notification' in window;
  
  // iOS requires 16.4+ for Web Push
  const supportsWebPush = supportsServiceWorker && supportsPushManager && supportsNotifications &&
    (!isIOS || (iosVersion !== null && iosVersion >= 16));
  
  return {
    isIOS,
    isAndroid,
    isDesktop,
    isPWA,
    browserName,
    supportsWebPush,
    supportsNotifications,
    iosVersion
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert base64url VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
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
}

// ============================================================================
// SERVICE WORKER MANAGEMENT
// ============================================================================

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PushService] Service Worker not supported');
    return null;
  }

  try {
    // Check for existing registration
    let registration = await navigator.serviceWorker.getRegistration('/');
    
    if (!registration) {
      console.log('[PushService] Registering new Service Worker...');
      registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
    }

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    
    console.log('[PushService] Service Worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.error('[PushService] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Check if service worker is active
 */
export async function isServiceWorkerActive(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    return registration?.active !== null;
  } catch {
    return false;
  }
}

// ============================================================================
// PERMISSION MANAGEMENT
// ============================================================================

/**
 * Get current notification permission status
 */
export function getPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request notification permission
 * IMPORTANT: Must be called from a user gesture (click, tap) on iOS
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[PushService] Notifications not supported');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[PushService] Permission result:', permission);
    return permission;
  } catch (error) {
    console.error('[PushService] Permission request failed:', error);
    return 'denied';
  }
}

// ============================================================================
// PUSH SUBSCRIPTION
// ============================================================================

/**
 * Get existing push subscription
 */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('[PushService] Failed to get subscription:', error);
    return null;
  }
}

/**
 * Subscribe to push notifications
 * Returns subscription data to be sent to backend
 */
export async function subscribeToPush(): Promise<PushSubscriptionData | null> {
  if (!VAPID_PUBLIC_KEY) {
    console.error('[PushService] VAPID public key not configured');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check for existing subscription first
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      console.log('[PushService] Creating new push subscription...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true, // Required - ensures notifications are visible to user
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    const json = subscription.toJSON();
    
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      console.error('[PushService] Invalid subscription data');
      return null;
    }

    console.log('[PushService] Subscription created:', json.endpoint);
    
    return {
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth
      }
    };
  } catch (error) {
    console.error('[PushService] Push subscription failed:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('[PushService] Unsubscribed from push');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[PushService] Unsubscribe failed:', error);
    return false;
  }
}

// ============================================================================
// BACKEND SYNC (SUPABASE)
// ============================================================================

/**
 * Save subscription to Supabase database
 */
export async function saveSubscriptionToBackend(
  userId: string,
  subscription: PushSubscriptionData,
  salonId?: string
): Promise<boolean> {
  try {
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[PushService] User not authenticated:', authError);
      return false;
    }

    // Use authenticated user's ID
    const actualUserId = user.id;
    
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: actualUserId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        salon_id: salonId || null,
        user_agent: navigator.userAgent,
        platform: detectPlatform().isIOS ? 'ios' : detectPlatform().isAndroid ? 'android' : 'desktop',
        last_used_at: new Date().toISOString()
      }, {
        onConflict: 'endpoint',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('[PushService] Failed to save subscription:', error);
      return false;
    }

    console.log('[PushService] Subscription saved to backend');
    return true;
  } catch (error) {
    console.error('[PushService] Backend sync error:', error);
    return false;
  }
}

/**
 * Remove subscription from backend
 */
export async function removeSubscriptionFromBackend(endpoint: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (error) {
      console.error('[PushService] Failed to remove subscription:', error);
      return false;
    }

    console.log('[PushService] Subscription removed from backend');
    return true;
  } catch (error) {
    console.error('[PushService] Backend removal error:', error);
    return false;
  }
}

// ============================================================================
// HIGH-LEVEL API
// ============================================================================

/**
 * Complete setup flow: register SW, request permission, subscribe, save to backend
 * IMPORTANT: Call this from a user gesture (button click) on iOS
 */
export async function setupPushNotifications(
  userId: string,
  salonId?: string
): Promise<{ success: boolean; status: SubscriptionStatus; error?: string }> {
  const platform = detectPlatform();
  
  // Check support
  if (!platform.supportsWebPush) {
    const reason = platform.isIOS && platform.iosVersion && platform.iosVersion < 16
      ? 'iOS 16.4+ required for push notifications'
      : 'Push notifications not supported on this device';
    
    return { success: false, status: 'unsupported', error: reason };
  }

  // Check if PWA on iOS
  if (platform.isIOS && !platform.isPWA) {
    return {
      success: false,
      status: 'unsupported',
      error: 'Please add this app to your home screen to receive notifications'
    };
  }

  // Register service worker
  const registration = await registerServiceWorker();
  if (!registration) {
    return { success: false, status: 'error', error: 'Service worker registration failed' };
  }

  // Request permission
  const permission = await requestPermission();
  if (permission === 'denied') {
    return { success: false, status: 'permission-denied', error: 'Notification permission denied' };
  }
  if (permission !== 'granted') {
    return { success: false, status: 'permission-default', error: 'Notification permission not granted' };
  }

  // Subscribe to push
  const subscription = await subscribeToPush();
  if (!subscription) {
    return { success: false, status: 'error', error: 'Failed to create push subscription' };
  }

  // Save to backend
  const saved = await saveSubscriptionToBackend(userId, subscription, salonId);
  if (!saved) {
    return { success: false, status: 'error', error: 'Failed to save subscription to server' };
  }

  return { success: true, status: 'subscribed' };
}

/**
 * Complete teardown: unsubscribe and remove from backend
 */
export async function teardownPushNotifications(): Promise<boolean> {
  try {
    const subscription = await getExistingSubscription();
    
    if (subscription) {
      // Remove from backend first
      await removeSubscriptionFromBackend(subscription.endpoint);
      // Then unsubscribe locally
      await unsubscribeFromPush();
    }
    
    return true;
  } catch (error) {
    console.error('[PushService] Teardown failed:', error);
    return false;
  }
}

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const platform = detectPlatform();
  
  if (!platform.supportsWebPush) {
    return 'unsupported';
  }

  const permission = getPermissionStatus();
  if (permission === 'denied') {
    return 'permission-denied';
  }
  if (permission === 'default') {
    return 'permission-default';
  }

  const subscription = await getExistingSubscription();
  return subscription ? 'subscribed' : 'unsubscribed';
}

// ============================================================================
// LOCAL NOTIFICATIONS (for in-app use)
// ============================================================================

/**
 * Show a local notification via Service Worker
 * Use this for immediate notifications when the app is open
 */
export async function showLocalNotification(payload: NotificationPayload): Promise<void> {
  if (Notification.permission !== 'granted') {
    console.warn('[PushService] Notification permission not granted');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    await registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-72.png',
      tag: payload.tag,
      data: payload.data,
      requireInteraction: payload.requireInteraction ?? false,
      silent: payload.silent ?? false,
      actions: payload.actions
    });
  } catch (error) {
    console.error('[PushService] Failed to show notification:', error);
    
    // Fallback to basic Notification API
    try {
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icon-192.png'
      });
    } catch (fallbackError) {
      console.error('[PushService] Fallback notification failed:', fallbackError);
    }
  }
}

// ============================================================================
// AUDIO FEEDBACK
// ============================================================================

let audioContext: AudioContext | null = null;

/**
 * Initialize audio context (call on first user interaction for iOS)
 */
export function initAudioContext(): void {
  if (!audioContext) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContext = new AudioContextClass();
    } catch {
      console.warn('[PushService] AudioContext not supported');
    }
  }
  
  if (audioContext?.state === 'suspended') {
    audioContext.resume();
  }
}

/**
 * Play notification sound
 */
export function playNotificationSound(): void {
  if (!audioContext) {
    initAudioContext();
  }
  
  if (!audioContext) return;

  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    console.warn('[PushService] Could not play notification sound:', error);
  }
}

/**
 * Trigger device vibration
 */
export function vibrate(pattern: number | number[] = [200, 100, 200]): void {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}
