/**
 * NotificationPrompt Component
 * 
 * A user-friendly prompt to enable push notifications.
 * Handles iOS PWA requirements and platform-specific messaging.
 */

import React, { useState, useEffect } from 'react';
import { useNotifications, getNotificationStatusMessage } from '../hooks/useNotifications';
import { Bell, BellOff, X, Check, AlertCircle, Smartphone } from 'lucide-react';

interface NotificationPromptProps {
  userId?: string;
  salonId?: string;
  userRole?: 'owner' | 'staff' | 'super_admin';
  className?: string;
  onStatusChange?: (status: string) => void;
  compact?: boolean;
}

export const NotificationPrompt: React.FC<NotificationPromptProps> = ({
  userId,
  salonId,
  userRole,
  className = '',
  onStatusChange,
  compact = false
}) => {
  const [dismissed, setDismissed] = useState(false);
  
  const {
    status,
    platform,
    isLoading,
    error,
    subscribe,
    unsubscribe
  } = useNotifications({
    userId,
    salonId,
    userRole
  });

  // Get user-friendly status message
  const statusMessage = getNotificationStatusMessage(status, platform);

  // Notify parent of status changes
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  // Handle enable/disable toggle
  const handleToggle = async () => {
    if (status === 'subscribed') {
      await unsubscribe();
    } else {
      const success = await subscribe();
      if (success) {
        setDismissed(false);
      }
    }
  };

  // Don't show if dismissed and not subscribed
  if (dismissed && status !== 'subscribed') {
    return null;
  }

  // Compact version - just a toggle button
  if (compact) {
    return (
      <button
        onClick={handleToggle}
        disabled={isLoading || status === 'unsupported' || status === 'permission-denied'}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
          ${status === 'subscribed' 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }
          ${isLoading ? 'opacity-50 cursor-wait' : 'hover:opacity-80'}
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        title={statusMessage.description}
      >
        {status === 'subscribed' ? (
          <Bell className="w-5 h-5" />
        ) : (
          <BellOff className="w-5 h-5" />
        )}
        <span className="text-sm font-medium">
          {isLoading ? 'Loading...' : status === 'subscribed' ? 'On' : 'Off'}
        </span>
      </button>
    );
  }

  // Full prompt banner
  return (
    <div className={`
      relative rounded-lg p-4 
      ${status === 'subscribed' 
        ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800' 
        : status === 'permission-denied' || status === 'unsupported'
          ? 'bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
          : 'bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
      }
      ${className}
    `}>
      {/* Dismiss button */}
      {status !== 'subscribed' && (
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`
          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
          ${status === 'subscribed' 
            ? 'bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-400' 
            : status === 'unsupported'
              ? 'bg-amber-100 text-amber-600 dark:bg-amber-800 dark:text-amber-400'
              : 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-400'
          }
        `}>
          {status === 'subscribed' ? (
            <Check className="w-5 h-5" />
          ) : status === 'unsupported' && platform.isIOS && !platform.isPWA ? (
            <Smartphone className="w-5 h-5" />
          ) : status === 'permission-denied' || status === 'unsupported' ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`
            font-medium text-sm
            ${status === 'subscribed' 
              ? 'text-green-800 dark:text-green-300' 
              : status === 'permission-denied' || status === 'unsupported'
                ? 'text-amber-800 dark:text-amber-300'
                : 'text-blue-800 dark:text-blue-300'
            }
          `}>
            {statusMessage.title}
          </h3>
          
          <p className={`
            mt-1 text-sm
            ${status === 'subscribed' 
              ? 'text-green-700 dark:text-green-400' 
              : status === 'permission-denied' || status === 'unsupported'
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-blue-700 dark:text-blue-400'
            }
          `}>
            {statusMessage.description}
          </p>

          {/* Error message */}
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              Error: {error}
            </p>
          )}

          {/* Action button */}
          {statusMessage.action && status !== 'unsupported' && (
            <button
              onClick={handleToggle}
              disabled={isLoading}
              className={`
                mt-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors
                ${status === 'subscribed'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isLoading ? 'Please wait...' : statusMessage.action}
            </button>
          )}

          {/* Unsubscribe option when subscribed */}
          {status === 'subscribed' && (
            <button
              onClick={handleToggle}
              disabled={isLoading}
              className="mt-3 text-sm text-green-600 dark:text-green-400 hover:underline disabled:opacity-50"
            >
              {isLoading ? 'Please wait...' : 'Turn off notifications'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Notification Settings Panel
 * 
 * A more comprehensive settings panel for notification preferences.
 */
export const NotificationSettings: React.FC<{
  userId?: string;
  salonId?: string;
  userRole?: 'owner' | 'staff' | 'super_admin';
  className?: string;
}> = ({ userId, salonId, userRole, className = '' }) => {
  const {
    status,
    platform,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    refresh
  } = useNotifications({ userId, salonId, userRole });

  const isEnabled = status === 'subscribed';
  const canEnable = status !== 'unsupported' && status !== 'permission-denied';

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            Push Notifications
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Receive instant alerts for new appointments
          </p>
        </div>
        
        <button
          onClick={async () => {
            if (isEnabled) {
              await unsubscribe();
            } else {
              await subscribe();
            }
          }}
          disabled={isLoading || !canEnable}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full 
            border-2 border-transparent transition-colors duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${isEnabled ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}
            ${(!canEnable || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          role="switch"
          aria-checked={isEnabled}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full 
              bg-white shadow ring-0 transition duration-200 ease-in-out
              ${isEnabled ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {/* Platform info */}
      <div className="text-xs text-gray-400 dark:text-gray-500">
        {platform.isIOS && (
          <p>iOS {platform.iosVersion || 'Unknown'} • {platform.isPWA ? 'PWA' : 'Browser'}</p>
        )}
        {platform.isAndroid && <p>Android • {platform.isPWA ? 'PWA' : 'Browser'}</p>}
        {platform.isDesktop && <p>Desktop • {platform.browserName}</p>}
      </div>

      {/* Status message */}
      {!canEnable && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-400">
          {getNotificationStatusMessage(status, platform).description}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Refresh button */}
      <button
        onClick={refresh}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        Refresh status
      </button>
    </div>
  );
};

export default NotificationPrompt;
