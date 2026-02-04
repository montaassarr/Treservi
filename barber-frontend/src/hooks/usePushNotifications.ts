import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  detectPlatform,
  getSubscriptionStatus,
  setupPushNotifications,
  teardownPushNotifications,
  type PlatformInfo,
  type SubscriptionStatus
} from '../services/pushService';

interface UsePushNotificationsOptions {
  userId?: string;
  salonId?: string;
  enabled?: boolean;
}

interface UsePushNotificationsResult {
  status: SubscriptionStatus;
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
  platform: PlatformInfo | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export function usePushNotifications(
  options: UsePushNotificationsOptions
): UsePushNotificationsResult {
  const { userId, salonId, enabled = true } = options;
  const [status, setStatus] = useState<SubscriptionStatus>('unsubscribed');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const platform = useMemo<PlatformInfo | null>(() => {
    if (typeof window === 'undefined') return null;
    return detectPlatform();
  }, []);

  const isSupported = !!platform?.supportsWebPush;

  const refreshStatus = useCallback(async () => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    try {
      const currentStatus = await getSubscriptionStatus();
      setStatus(currentStatus);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to read status');
    }
  }, [enabled]);

  const enable = useCallback(async () => {
    if (!userId) {
      setError('Missing user ID');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await setupPushNotifications(userId, salonId);
      setStatus(result.status);
      if (!result.success) {
        setError(result.error || 'Failed to enable notifications');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to enable notifications');
    } finally {
      setIsLoading(false);
    }
  }, [userId, salonId]);

  const disable = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await teardownPushNotifications();
      setStatus('unsubscribed');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to disable notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    refreshStatus();
  }, [enabled, refreshStatus]);

  return {
    status,
    isSupported,
    isLoading,
    error,
    platform,
    enable,
    disable,
    refreshStatus
  };
}
