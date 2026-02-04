import React, { useEffect, useState } from 'react';
import { getNotificationCapability, getNotificationSetupMessage } from '../utils/iosNotifications';

interface NotificationInfoProps {
  className?: string;
}

/**
 * Shows notification status and setup info
 * iOS users see "Ready" message, Android/Desktop users see permission status
 */
const NotificationInfo: React.FC<NotificationInfoProps> = ({ className = '' }) => {
  const [capability, setCapability] = useState(getNotificationCapability());
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    const cap = getNotificationCapability();
    setCapability(cap);

    // Check permission status if applicable
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  const message = getNotificationSetupMessage();

  // Determine status icon and color
  let statusColor = 'text-gray-500';
  let statusIcon = '⚪';

  if (capability.type === 'realtime') {
    // iOS: Always ready
    statusColor = 'text-green-500';
    statusIcon = '🟢';
  } else if (capability.type === 'webpush' && permissionStatus === 'granted') {
    statusColor = 'text-green-500';
    statusIcon = '🟢';
  } else if (capability.type === 'webpush' && permissionStatus === 'denied') {
    statusColor = 'text-red-500';
    statusIcon = '🔴';
  }

  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 ${className}`}>
      <span className="text-lg">{statusIcon}</span>
      <div className="flex-1">
        <p className={`text-sm font-medium ${statusColor}`}>
          {capability.type === 'realtime' && isIOS ? 'Notifications Ready' : 'Notification Status'}
        </p>
        <p className="text-xs text-gray-600 mt-1">{message}</p>
        {capability.type === 'webpush' && permissionStatus === 'denied' && (
          <p className="text-xs text-red-600 mt-1">
            Enable notifications in your browser settings to receive push notifications
          </p>
        )}
      </div>
    </div>
  );
};

export default NotificationInfo;
