import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle } from 'lucide-react';
import { NotificationData } from '../hooks/useNotifications';

interface NotificationToastProps {
  notification: NotificationData | null;
  onDismiss?: () => void;
  duration?: number;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
  duration = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);

      // Auto-dismiss after duration
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [notification, duration, onDismiss]);

  if (!notification || !isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-[1000] pointer-events-auto animate-in slide-in-from-top-4 fade-in duration-300">
      {/* Notification Container */}
      <div className="bg-white dark:bg-gray-900 rounded-[24px] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden max-w-md">
        {/* Content */}
        <div className="p-4 flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
              {notification.title}
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5 line-clamp-2">
              {notification.body}
            </p>

            {/* Details Row */}
            {(notification.customerName || notification.staffName || notification.amount) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {notification.customerName && (
                  <span className="inline-block px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[10px] rounded-full">
                    {notification.customerName}
                  </span>
                )}
                {notification.staffName && (
                  <span className="inline-block px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-[10px] rounded-full">
                    {notification.staffName}
                  </span>
                )}
                {notification.amount && (
                  <span className="inline-block px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold rounded-full">
                    {notification.amount} DT
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={() => {
              setIsVisible(false);
              onDismiss?.();
            }}
            className="flex-shrink-0 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-400 animate-pulse" />
      </div>
    </div>
  );
};

export default NotificationToast;
