/**
 * useAppBadge Hook
 * Manages iOS/Android app icon badge with dynamic Supabase sync
 * Implements Instagram-style notification behavior
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { setNotificationBadge, clearNotificationBadge, isBadgeSupported } from '../utils/badgeApi';
import { 
  getUnreadCount, 
  markAllAsRead, 
  incrementBadgeCount,
  subscribeToNewAppointments,
  playNotificationSound,
  getStoredBadgeCount
} from '../services/notificationService';

interface UseAppBadgeOptions {
  /**
   * Auto-request notification permission on mount
   */
  autoRequestPermission?: boolean;
  /**
   * User ID for Supabase queries
   */
  userId?: string;
  /**
   * Salon ID for filtering appointments
   */
  salonId?: string;
  /**
   * User role (owner sees all salon appointments, staff sees only theirs)
   */
  userRole?: 'owner' | 'staff';
}

export const useAppBadge = (options: UseAppBadgeOptions = {}) => {
  const { autoRequestPermission = false, userId, salonId, userRole } = options;
  const [badgeCount, setBadgeCount] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const channelRef = useRef<any>(null);

  // Check support and permission on mount
  useEffect(() => {
    setIsSupported(isBadgeSupported());
    setHasPermission(Notification.permission === 'granted');
    
    // Load stored count
    const stored = getStoredBadgeCount();
    setBadgeCount(stored);
    if (stored > 0 && isBadgeSupported()) {
      setNotificationBadge(stored);
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasPermission(granted);
      
      // Fetch initial count from DB after permission granted
      if (granted && userId && salonId && userRole) {
        await refreshBadgeFromDB();
      }
      
      return granted;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, [userId, salonId, userRole]);

  /**
   * Fetch actual unread count from Supabase
   */
  const refreshBadgeFromDB = useCallback(async () => {
    if (!userId || !salonId || !userRole) return 0;

    try {
      const count = await getUnreadCount(userId, salonId, userRole);
      setBadgeCount(count);
      if (isSupported) {
        await setNotificationBadge(count);
      }
      return count;
    } catch (error) {
      console.error('Failed to refresh badge:', error);
      return badgeCount;
    }
  }, [userId, salonId, userRole, isSupported, badgeCount]);

  /**
   * Setup realtime subscription for new appointments
   */
  useEffect(() => {
    if (!userId || !salonId || !userRole) return;

    // Cleanup previous subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    // Subscribe to new appointments
    channelRef.current = subscribeToNewAppointments(
      salonId,
      userId,
      userRole,
      async (appointment) => {
        // Increment badge on new appointment
        const newCount = await incrementBadgeCount(badgeCount);
        setBadgeCount(newCount);
        if (isSupported) {
          await setNotificationBadge(newCount);
        }
        playNotificationSound();
        
        console.log(`[Badge] Incremented to ${newCount} (new appointment: ${appointment.id})`);
      }
    );

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [userId, salonId, userRole, badgeCount, isSupported]);

  // Auto-request permission on first interaction
  useEffect(() => {
    if (autoRequestPermission && !hasPermission && Notification.permission === 'default') {
      const handleFirstInteraction = () => {
        requestPermission();
        // Remove listeners after first call
        window.removeEventListener('click', handleFirstInteraction);
        window.removeEventListener('touchstart', handleFirstInteraction);
      };

      window.addEventListener('click', handleFirstInteraction, { once: true });
      window.addEventListener('touchstart', handleFirstInteraction, { once: true });

      return () => {
        window.removeEventListener('click', handleFirstInteraction);
        window.removeEventListener('touchstart', handleFirstInteraction);
      };
    }
  }, [autoRequestPermission, hasPermission, requestPermission]);

  // Update badge count (direct override)
  const updateBadge = useCallback(async (count: number) => {
    setBadgeCount(count);
    
    if (!hasPermission || !isSupported) {
      return;
    }

    await setNotificationBadge(count);
  }, [hasPermission, isSupported]);

  // Clear badge (Instagram-style - marks all as read)
  const clearBadge = useCallback(async () => {
    if (userId && salonId && userRole) {
      await markAllAsRead(salonId, userId, userRole);
    }
    setBadgeCount(0);
    
    if (!hasPermission || !isSupported) {
      return;
    }

    await clearNotificationBadge();
  }, [hasPermission, isSupported, userId, salonId, userRole]);

  // Increment badge
  const incrementBadge = useCallback(async () => {
    const newCount = await incrementBadgeCount(badgeCount);
    await updateBadge(newCount);
  }, [badgeCount, updateBadge]);

  // Decrement badge
  const decrementBadge = useCallback(async () => {
    await updateBadge(Math.max(0, badgeCount - 1));
  }, [badgeCount, updateBadge]);

  return {
    badgeCount,
    hasPermission,
    isSupported,
    updateBadge,
    clearBadge,
    incrementBadge,
    decrementBadge,
    requestPermission,
    refreshBadgeFromDB, // NEW: Sync with Supabase
  };
};
