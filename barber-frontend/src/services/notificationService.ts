/**
 * Notification Service - Handles dynamic badge counting
 * Implements Instagram-style notification behavior
 */

import { apiClient } from './apiClient';

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
    const count = await apiClient.getUnreadCount(salonId, userRole, userRole === 'staff' ? userId : undefined);
    localStorage.setItem(UNREAD_BADGE_KEY, count.toString());
    return count;
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
export const markAllAsRead = async (
  userId: string,
  salonId: string,
  userRole: 'owner' | 'staff'
): Promise<void> => {
  try {
    await apiClient.markAllRead({
      salonId,
      role: userRole,
      staffId: userRole === 'staff' ? userId : undefined
    });

    // Clear local badge count
    localStorage.setItem(UNREAD_BADGE_KEY, '0');
    localStorage.setItem(LAST_CHECKED_KEY, new Date().toISOString());
  } catch (error) {
    console.error('Failed to mark as read:', error);
  }
};

/**
 * Mark a single notification as read
 */
export const markAsRead = async (
  notificationId: string,
  userId: string
): Promise<void> => {
  try {
    await apiClient.markRead(notificationId);

    // Update local storage
    const currentCount = getStoredBadgeCount();
    if (currentCount > 0) {
      localStorage.setItem(UNREAD_BADGE_KEY, (currentCount - 1).toString());
    }
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
};

/**
 * Subscribe to real-time notification updates
 */
export const subscribeToNotifications = (
  userId: string,
  salonId: string,
  userRole: 'owner' | 'staff',
  onNotification: (notification: UnreadNotification) => void
): (() => void) => {
  // TODO: Implement real-time subscriptions via WebSockets or Server-Sent Events
  console.warn('subscribeToNotifications: Real-time notifications not yet implemented');
  
  // Return unsubscribe function
  return () => {
    console.log('Unsubscribed from notifications');
  };
};

/**
 * Get all unread notifications
 */
export const getUnreadNotifications = async (
  userId: string,
  salonId: string,
  userRole: 'owner' | 'staff'
): Promise<UnreadNotification[]> => {
  try {
    console.warn('getUnreadNotifications: Endpoint not implemented on backend');
    return [];
  } catch (error) {
    console.error('Failed to get unread notifications:', error);
    return [];
  }
};

/**
 * Clear all notifications
 */
export const clearAllNotifications = async (
  userId: string,
  salonId: string
): Promise<void> => {
  try {
    console.warn('clearAllNotifications: Endpoint not implemented on backend');
    localStorage.removeItem(UNREAD_BADGE_KEY);
    localStorage.removeItem(LAST_CHECKED_KEY);
  } catch (error) {
    console.error('Failed to clear notifications:', error);
  }
};
