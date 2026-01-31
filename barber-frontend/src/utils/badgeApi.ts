/**
 * Badge API utility for PWA
 * Sets notification badge on home screen icon (iOS Safari, Chrome Android)
 * https://w3c.github.io/badging/
 */

/**
 * Check if Badge API is supported
 */
export const isBadgeSupported = (): boolean => {
  return 'setAppBadge' in navigator;
};

/**
 * Set the notification badge count on the app icon
 * @param count - Number to display on badge (0 to clear)
 */
export const setNotificationBadge = async (count: number): Promise<void> => {
  try {
    if (!isBadgeSupported()) {
      console.log('Badge API not supported');
      return;
    }

    if (count > 0) {
      // @ts-ignore - Badge API is not fully typed yet
      await navigator.setAppBadge(count);
    } else {
      // Clear badge
      // @ts-ignore
      await navigator.clearAppBadge();
    }
  } catch (error) {
    console.error('Failed to set app badge:', error);
  }
};

/**
 * Clear the notification badge
 */
export const clearNotificationBadge = async (): Promise<void> => {
  try {
    if (!isBadgeSupported()) {
      return;
    }
    // @ts-ignore
    await navigator.clearAppBadge();
  } catch (error) {
    console.error('Failed to clear app badge:', error);
  }
};

/**
 * Check if app is running as standalone PWA
 */
export const isStandalone = (): boolean => {
  return (
    (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
};
