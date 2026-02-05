import React, { useMemo } from 'react';
import { Bell, BellOff, AlertTriangle } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface NotificationToggleProps {
  userId?: string;
  salonId?: string;
  size?: number;
}

const NotificationToggle: React.FC<NotificationToggleProps> = ({
  userId,
  size = 20
}) => {
  const { subscribeToPush, permission, isSubscribed } = usePushNotifications();

  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
  const isBlocked = permission === 'denied';

  const label = useMemo(() => {
    if (!isSupported) return 'Notifications not supported on this device';
    if (isBlocked) return 'Notifications blocked in browser settings';
    if (isSubscribed) return 'Notifications enabled';
    return 'Enable notifications';
  }, [isBlocked, isSubscribed, isSupported]);

  const handleClick = async () => {
    if (!isSupported || isBlocked) return;
    if (!userId) return;
    await subscribeToPush(userId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={label}
      aria-label={label}
      className={`relative p-2.5 rounded-full transition-colors border border-transparent ${
        isSubscribed
          ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
          : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      {!isSupported || isBlocked ? (
        <AlertTriangle size={size} />
      ) : isSubscribed ? (
        <Bell size={size} />
      ) : (
        <BellOff size={size} />
      )}
      {isSubscribed && (
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#121212]" />
      )}
    </button>
  );
};

export default NotificationToggle;
