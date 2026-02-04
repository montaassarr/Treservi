/**
 * useNotifications Hook
 * 
 * Unified hook for push notification management in the Treservi PWA.
 * Handles iOS (16.4+ PWA), Android, and Desktop browsers.
 * 
 * Usage:
 * const { 
 *   status,
 *   platform,
 *   subscribe,
 *   unsubscribe,
 *   showNotification 
 * } = useNotifications({ userId, salonId });
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  setupPushNotifications,
  teardownPushNotifications,
  getSubscriptionStatus,
  detectPlatform,
  showLocalNotification,
  playNotificationSound,
  vibrate,
  initAudioContext,
  type SubscriptionStatus,
  type PlatformInfo,
  type NotificationPayload
} from '../services/pushService';
import { supabase } from '../services/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  timestamp: Date;
  appointmentId?: string;
  customerName?: string;
  serviceName?: string;
  staffName?: string;
  amount?: string;
  salonId?: string;
  read?: boolean;
}

export interface UseNotificationsOptions {
  /** User ID for subscription storage */
  userId?: string;
  /** Salon ID for filtering notifications */
  salonId?: string;
  /** User role for permission checks */
  userRole?: 'owner' | 'staff' | 'super_admin';
  /** Enable real-time notifications via WebSocket */
  enableRealtime?: boolean;
  /** Callback when a new notification arrives */
  onNotification?: (notification: NotificationData) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
}

export interface UseNotificationsReturn {
  /** Current subscription status */
  status: SubscriptionStatus;
  /** Platform information */
  platform: PlatformInfo;
  /** Whether currently subscribing */
  isLoading: boolean;
  /** Last error message */
  error: string | null;
  /** Subscribe to push notifications (call from user gesture!) */
  subscribe: () => Promise<boolean>;
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<boolean>;
  /** Show a local notification */
  showNotification: (payload: NotificationPayload) => Promise<void>;
  /** Play notification sound */
  playSound: () => void;
  /** Trigger vibration */
  vibrate: (pattern?: number | number[]) => void;
  /** Refresh subscription status */
  refresh: () => Promise<void>;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const {
    userId,
    salonId,
    userRole,
    enableRealtime = true,
    onNotification,
    onError
  } = options;

  // State
  const [status, setStatus] = useState<SubscriptionStatus>('unsupported');
  const [platform, setPlatform] = useState<PlatformInfo>(() => detectPlatform());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const mountedRef = useRef(true);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  // Check subscription status on mount
  useEffect(() => {
    mountedRef.current = true;

    const checkStatus = async () => {
      try {
        const currentPlatform = detectPlatform();
        console.log('[useNotifications] 📱 Platform detected:', {
          isIOS: currentPlatform.isIOS,
          iosVersion: currentPlatform.iosVersion,
          isPWA: currentPlatform.isPWA,
          isAndroid: currentPlatform.isAndroid,
          isDesktop: currentPlatform.isDesktop,
          browserName: currentPlatform.browserName,
          supportsWebPush: currentPlatform.supportsWebPush,
          supportsNotifications: currentPlatform.supportsNotifications
        });
        
        const currentStatus = await getSubscriptionStatus();
        console.log('[useNotifications] 🔔 Current status:', currentStatus);
        
        if (mountedRef.current) {
          setStatus(currentStatus);
          setPlatform(currentPlatform);
        }
      } catch (err) {
        console.error('[useNotifications] ❌ Status check failed:', err);
      }
    };

    checkStatus();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ============================================================================
  // REALTIME NOTIFICATIONS (WebSocket fallback for background + iOS)
  // ============================================================================

  useEffect(() => {
    if (!enableRealtime || !userId || !salonId) {
      console.log('[useNotifications] ⏸️ Realtime disabled or missing userId/salonId:', { enableRealtime, userId, salonId });
      return;
    }

    const setupRealtime = async () => {
      try {
        // Clean up existing channel
        if (realtimeChannelRef.current) {
          await supabase.removeChannel(realtimeChannelRef.current);
        }

        // Create user-specific notification channel
        const channelName = `notifications:${userId}`;
        console.log('[useNotifications] 🔌 Setting up realtime channel:', channelName);
        
        realtimeChannelRef.current = supabase
          .channel(channelName, {
            config: {
              broadcast: { self: true }
            }
          })
          .on('broadcast', { event: 'appointment_notification' }, (payload) => {
            console.log('[useNotifications] 📬 Realtime notification received:', payload);

            const notification: NotificationData = {
              id: payload.payload.appointmentId || `notif-${Date.now()}`,
              title: payload.payload.title || 'New Appointment',
              body: payload.payload.body || 'You have a new appointment',
              timestamp: new Date(),
              appointmentId: payload.payload.appointmentId,
              customerName: payload.payload.customerName,
              serviceName: payload.payload.serviceName,
              staffName: payload.payload.staffName,
              amount: payload.payload.amount,
              salonId: payload.payload.salonId
            };

            // Trigger callback
            onNotification?.(notification);

            // Play feedback
            playNotificationSound();
            vibrate([200, 100, 200]);

            // Show local notification if permission granted
            if (Notification.permission === 'granted') {
              showLocalNotification({
                title: notification.title,
                body: notification.body,
                tag: notification.appointmentId,
                data: {
                  appointmentId: notification.appointmentId,
                  url: '/dashboard'
                }
              });
            }
          })
          .subscribe((subscribeStatus) => {
            console.log('[useNotifications] 📡 Channel subscription status:', subscribeStatus);
            if (subscribeStatus === 'SUBSCRIBED') {
              console.log('[useNotifications] ✅ Realtime channel subscribed:', channelName);
            } else if (subscribeStatus === 'CHANNEL_ERROR') {
              console.error('[useNotifications] ❌ Realtime channel error');
              onError?.(new Error('Failed to connect to notification channel'));
            }
          });

      } catch (err) {
        console.error('[useNotifications] ❌ Realtime setup failed:', err);
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    };

    setupRealtime();

    return () => {
      if (realtimeChannelRef.current) {
        console.log('[useNotifications] 🧹 Cleaning up realtime channel');
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [userId, salonId, enableRealtime, onNotification, onError]);

  // ============================================================================
  // SUBSCRIBE TO PUSH
  // ============================================================================

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!userId) {
      setError('User ID required for subscription');
      onError?.(new Error('User ID required for subscription'));
      return false;
    }

    console.log('[useNotifications] 🔔 Starting push subscription...');
    setIsLoading(true);
    setError(null);

    try {
      // Initialize audio context on user gesture (required for iOS)
      initAudioContext();

      const result = await setupPushNotifications(userId, salonId);
      console.log('[useNotifications] 🔔 Push subscription result:', result);

      if (mountedRef.current) {
        setStatus(result.status);
        
        if (!result.success) {
          console.log('[useNotifications] ❌ Push subscription failed:', result.error);
          setError(result.error || 'Failed to subscribe');
          onError?.(new Error(result.error || 'Failed to subscribe'));
        } else {
          console.log('[useNotifications] ✅ Push subscription successful!');
        }
      }

      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useNotifications] ❌ Push subscription error:', errorMessage);
      
      if (mountedRef.current) {
        setError(errorMessage);
      }
      
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      return false;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [userId, salonId, onError]);

  // ============================================================================
  // UNSUBSCRIBE FROM PUSH
  // ============================================================================

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const success = await teardownPushNotifications();
      
      if (mountedRef.current) {
        if (success) {
          setStatus('unsubscribed');
        } else {
          setError('Failed to unsubscribe');
        }
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      if (mountedRef.current) {
        setError(errorMessage);
      }
      
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      return false;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [onError]);

  // ============================================================================
  // SHOW LOCAL NOTIFICATION
  // ============================================================================

  const showNotificationWrapper = useCallback(async (payload: NotificationPayload): Promise<void> => {
    try {
      await showLocalNotification(payload);
    } catch (err) {
      console.error('[useNotifications] Failed to show notification:', err);
      onError?.(err instanceof Error ? err : new Error('Failed to show notification'));
    }
  }, [onError]);

  // ============================================================================
  // REFRESH STATUS
  // ============================================================================

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const currentStatus = await getSubscriptionStatus();
      if (mountedRef.current) {
        setStatus(currentStatus);
        setError(null);
      }
    } catch (err) {
      console.error('[useNotifications] Refresh failed:', err);
    }
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    status,
    platform,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    showNotification: showNotificationWrapper,
    playSound: playNotificationSound,
    vibrate,
    refresh
  };
}

// ============================================================================
// NOTIFICATION PROMPT COMPONENT HELPER
// ============================================================================

/**
 * Get user-friendly message for notification status
 */
export function getNotificationStatusMessage(
  status: SubscriptionStatus,
  platform: PlatformInfo
): { title: string; description: string; action?: string } {
  switch (status) {
    case 'subscribed':
      return {
        title: 'Notifications Enabled',
        description: 'You will receive push notifications for new appointments.'
      };

    case 'unsubscribed':
      return {
        title: 'Notifications Disabled',
        description: 'Enable notifications to stay updated on new appointments.',
        action: 'Enable Notifications'
      };

    case 'permission-denied':
      return {
        title: 'Notifications Blocked',
        description: 'Please enable notifications in your browser settings to receive updates.'
      };

    case 'permission-default':
      return {
        title: 'Enable Notifications',
        description: 'Get notified instantly when you receive new appointments.',
        action: 'Enable Notifications'
      };

    case 'unsupported':
      if (platform.isIOS && !platform.isPWA) {
        return {
          title: 'Add to Home Screen',
          description: 'To receive notifications, add this app to your home screen. Tap the share button and select "Add to Home Screen".'
        };
      }
      if (platform.isIOS && platform.iosVersion && platform.iosVersion < 16) {
        return {
          title: 'iOS Update Required',
          description: 'Push notifications require iOS 16.4 or later. Please update your device.'
        };
      }
      return {
        title: 'Notifications Not Supported',
        description: 'Your browser does not support push notifications.'
      };

    case 'error':
    default:
      return {
        title: 'Notification Error',
        description: 'There was a problem setting up notifications. Please try again.'
      };
  }
}
