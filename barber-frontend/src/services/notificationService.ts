/**
 * Notification Service - Handles dynamic badge counting with Supabase
 * Implements Instagram-style notification behavior
 */

import { supabase } from './supabaseClient';

const UNREAD_BADGE_KEY = 'unread_badge_count';
// LAST_CHECKED_KEY no longer needed given IS_READ column, but kept for legacy cleanup
const LAST_CHECKED_KEY = 'last_notification_check';

export interface UnreadNotification {
  id: string;
  appointment_id: string;
  user_id: string;
  salon_id: string;
  is_read: boolean;
  created_at: string;
  appointment?: any;
}

/**
 * Get the count of unread appointments for the current user
 */
/**
 * Get the count of unread appointments for the current user (using is_read column)
 */
export const getUnreadCount = async (
  userId: string,
  salonId: string,
  userRole: 'owner' | 'staff'
): Promise<number> => {
  try {
    if (!supabase) return 0;

    // Count appointments where is_read is false
    const query = supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true });

    if (userRole === 'owner') {
      query.eq('salon_id', salonId);
    } else {
      query.eq('staff_id', userId).eq('salon_id', salonId);
    }

    // Only count unread ones
    const { count, error } = await query.eq('is_read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return getStoredBadgeCount();
    }

    const unreadCount = count || 0;

    // Store in localStorage as backup
    localStorage.setItem(UNREAD_BADGE_KEY, unreadCount.toString());

    return unreadCount;
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return getStoredBadgeCount();
  }
};

/**
 * Get stored badge count from localStorage (fallback)
 */
export const getStoredBadgeCount = (): number => {
  try {
    const stored = localStorage.getItem(UNREAD_BADGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
};

/**
 * Mark all notifications as read (clear badge) via RPC
 */
export const markAllAsRead = async (
  salonId: string,
  userId: string,
  userRole: 'owner' | 'staff'
): Promise<void> => {
  try {
    if (!supabase) return;

    let error;

    if (userRole === 'owner') {
      const result = await supabase.rpc('mark_notifications_read', { 
        p_salon_id: salonId 
      });
      error = result.error;
    } else {
      const result = await supabase.rpc('mark_staff_notifications_read', { 
        p_staff_id: userId 
      });
      error = result.error;
    }

    if (error) throw error;

    // Update local storage just in case
    localStorage.setItem(UNREAD_BADGE_KEY, '0');
  } catch (error) {
    console.error('Failed to mark as read:', error);
  }
};

/**
 * Increment badge count (called when new appointment arrives)
 */
export const incrementBadgeCount = async (currentCount: number): Promise<number> => {
  const newCount = currentCount + 1;
  localStorage.setItem(UNREAD_BADGE_KEY, newCount.toString());
  return newCount;
};

/**
 * Setup realtime subscription for new appointments
 */
export const subscribeToNewAppointments = (
  salonId: string,
  userId: string,
  userRole: 'owner' | 'staff',
  onNewAppointment: (appointment: any) => void
) => {
  if (!supabase) return null;

  const channel = supabase
    .channel('new-appointments-badge')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'appointments',
        filter: userRole === 'owner' 
          ? `salon_id=eq.${salonId}`
          : `staff_id=eq.${userId}`,
      },
      (payload) => {
        console.log('[Badge] New appointment:', payload.new);
        onNewAppointment(payload.new);
      }
    )
    .subscribe();

  return channel;
};

/**
 * Play notification sound
 */
// Global audio context for iOS compatibility
let audioContext: AudioContext | null = null;

/**
 * Initialize audio context on first user interaction (iOS requirement)
 */
export const initAudioContext = () => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error('AudioContext not supported');
    }
  }
  
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }
};

/**
 * Play notification sound
 */
export const playNotificationSound = () => {
  try {
    if (!audioContext) {
      initAudioContext();
    }

    if (!audioContext) return;

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
    console.log('Could not play notification sound:', error);
  }
};
