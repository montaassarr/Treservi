import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeNotification {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  appointmentId?: string;
  customerName?: string;
  serviceName?: string;
  staffName?: string;
  amount?: string;
  salonId?: string;
  userId?: string;
}

interface UseRealtimeNotificationsOptions {
  userId?: string;
  salonId?: string;
  userRole?: 'owner' | 'staff' | 'super_admin';
  enabled?: boolean;
  onNotification?: (notification: RealtimeNotification) => void;
  onError?: (error: Error) => void;
}

export const useRealtimeNotifications = (options: UseRealtimeNotificationsOptions) => {
  const {
    userId,
    salonId,
    userRole,
    enabled = true,
    onNotification,
    onError
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscriptionRef = useRef<boolean>(false);

  // Subscribe to real-time notifications for this user/salon
  useEffect(() => {
    if (!enabled || !userId || !salonId) return;

    const setupRealtimeListener = async () => {
      try {
        // Create a channel for receiving notifications (always for current user)
        const channelName = `notifications:${userId}`;
        
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
        }

        channelRef.current = supabase.channel(channelName, {
          config: {
            broadcast: { self: true },
          },
        });

        channelRef.current
          .on('broadcast', { event: 'appointment_notification' }, (payload) => {
            const notification: RealtimeNotification = {
              id: payload.payload.appointmentId || `notif-${Date.now()}`,
              title: payload.payload.title || 'New Appointment',
              body: payload.payload.body || 'You have a new appointment',
              timestamp: Date.now(),
              appointmentId: payload.payload.appointmentId,
              customerName: payload.payload.customerName,
              serviceName: payload.payload.serviceName,
              staffName: payload.payload.staffName,
              amount: payload.payload.amount,
              salonId: payload.payload.salonId,
              userId: payload.payload.userId,
            };

            onNotification?.(notification);

            // Play notification sound on iOS
            playNotificationSound();
            
            // Request vibration
            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
            }
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              subscriptionRef.current = true;
              console.log('[RealtimeNotifications] Subscribed to channel:', channelName);
            } else if (status === 'CHANNEL_ERROR') {
              onError?.(new Error('Failed to subscribe to notification channel'));
            }
          });

      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
        console.error('[RealtimeNotifications] Setup error:', err);
      }
    };

    setupRealtimeListener();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current).then(() => {
          subscriptionRef.current = false;
          channelRef.current = null;
        });
      }
    };
  }, [userId, salonId, enabled, onNotification, onError]);

  // Utility to play notification sound (works on iOS when user has interacted with page)
  const playNotificationSound = useCallback(() => {
    try {
      // Try using Web Audio API for iOS compatibility
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 1000;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Silently fail - audio might not be available
      console.log('[RealtimeNotifications] Audio unavailable');
    }
  }, []);

  // Test notification (for development)
  const sendTestNotification = useCallback(() => {
    const testNotification: RealtimeNotification = {
      id: `test-${Date.now()}`,
      title: 'Test Notification',
      body: 'This is a test notification from your system',
      timestamp: Date.now(),
      salonId,
      userId,
    };
    onNotification?.(testNotification);
  }, [salonId, userId, onNotification]);

  return {
    isSubscribed: subscriptionRef.current,
    sendTestNotification,
    playNotificationSound,
  };
};
