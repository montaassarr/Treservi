/**
 * useAppBadge Hook
 * Manages iOS/Android app icon badge for PWA notifications
 */

import { useEffect, useCallback, useState } from 'react';
import { setNotificationBadge, clearNotificationBadge, isBadgeSupported } from '../utils/badgeApi';

interface UseAppBadgeOptions {
  /**
   * Auto-request notification permission on mount
   */
  autoRequestPermission?: boolean;
}

export const useAppBadge = (options: UseAppBadgeOptions = {}) => {
  const { autoRequestPermission = false } = options;
  const [badgeCount, setBadgeCount] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  // Check support and permission on mount
  useEffect(() => {
    setIsSupported(isBadgeSupported());
    setHasPermission(Notification.permission === 'granted');
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
      return granted;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, []);

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

  // Update badge count
  const updateBadge = useCallback(async (count: number) => {
    setBadgeCount(count);
    
    if (!hasPermission || !isSupported) {
      return;
    }

    await setNotificationBadge(count);
  }, [hasPermission, isSupported]);

  // Clear badge
  const clearBadge = useCallback(async () => {
    setBadgeCount(0);
    
    if (!hasPermission || !isSupported) {
      return;
    }

    await clearNotificationBadge();
  }, [hasPermission, isSupported]);

  // Increment badge
  const incrementBadge = useCallback(async () => {
    await updateBadge(badgeCount + 1);
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
  };
};
