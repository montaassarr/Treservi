/**
 * Notification Service - Handles dynamic badge counting with Supabase
 * Implements Instagram-style notification behavior
 */

import { supabase } from './supabaseClient';

const UNREAD_BADGE_KEY = 'unread_badge_count';
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
export const getUnreadCount = async (
  userId: string,
  salonId: string,
  userRole: 'owner' | 'staff'
): Promise<number> => {
  try {
    if (!supabase) return 0;

    // For owners: count all pending/confirmed appointments in salon
    // For staff: count only their assigned appointments
    const query = supabase
      .from('appointments')
      .select('id, status, created_at', { count: 'exact', head: false })
      .in('status', ['Pending', 'Confirmed'])
      .order('created_at', { ascending: false });

    const { data, count, error } = userRole === 'owner'
      ? await query.eq('salon_id', salonId)
      : await query.eq('staff_id', userId).eq('salon_id', salonId);

    if (error) {
      console.error('Error fetching unread count:', error);
      return getStoredBadgeCount();
    }

    // Get last checked timestamp
    const lastChecked = localStorage.getItem(LAST_CHECKED_KEY);
    const lastCheckedDate = lastChecked ? new Date(lastChecked) : new Date(0);

    // Filter appointments created after last check
    const unreadAppointments = (data || []).filter((apt: any) => {
      const createdAt = new Date(apt.created_at);
      return createdAt > lastCheckedDate;
    });

    const unreadCount = unreadAppointments.length;

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
 * Mark all notifications as read (clear badge)
 */
export const markAllAsRead = async (): Promise<void> => {
  try {
    // Update last checked timestamp
    localStorage.setItem(LAST_CHECKED_KEY, new Date().toISOString());
    localStorage.setItem(UNREAD_BADGE_KEY, '0');
    localStorage.setItem('dashboard_notifications_read', 'true');
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
export const playNotificationSound = () => {
  try {
    // Use Web Audio API for iOS compatibility
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
