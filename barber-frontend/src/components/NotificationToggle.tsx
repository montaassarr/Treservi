import React, { useMemo } from 'react';
import { Bell, BellOff, BellRing, AlertTriangle } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface NotificationToggleProps {
  userId?: string;
  salonId?: string;
  size?: number;
}

const NotificationToggle: React.FC<NotificationToggleProps> = ({
  userId,
  salonId,
  size = 20
}) => {
  const {
    status,
    isSupported,
    isLoading,
    error,
    platform,
    enable,
    disable
  } = usePushNotifications({ userId, salonId });

  const isEnabled = status === 'subscribed';

  const label = useMemo(() => {
    if (!isSupported) {
      if (platform?.isIOS && !platform.isPWA) {
        return 'Add to Home Screen to enable notifications';
      }
      return 'Notifications not supported on this device';
    }
    if (status === 'permission-denied') return 'Notifications blocked in browser settings';
    if (status === 'permission-default') return 'Enable notifications';
    if (status === 'subscribed') return 'Disable notifications';
    if (status === 'unsubscribed') return 'Enable notifications';
    if (status === 'error') return error || 'Notification error';
    return 'Notification settings';
  }, [error, isSupported, platform?.isIOS, platform?.isPWA, status]);

  const handleClick = async () => {
    if (isLoading) return;
    if (!isSupported) return;
    if (isEnabled) {
      await disable();
    } else {
      await enable();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={label}
      aria-label={label}
      className={`relative p-2.5 rounded-full transition-colors border border-transparent ${
        isEnabled
          ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
      } ${isLoading ? 'animate-pulse' : ''}`}
    >
      {!isSupported ? (
        <AlertTriangle size={size} />
      ) : isEnabled ? (
        <BellRing size={size} />
      ) : (
        <BellOff size={size} />
      )}
      {isEnabled && (
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#121212]" />
      )}
    </button>
  );
};

export default NotificationToggle;
