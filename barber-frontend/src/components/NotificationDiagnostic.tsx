import React, { useEffect, useState } from 'react';
import { isIOSPWA, getNotificationCapability } from '../utils/iosNotifications';
import { supabase } from '../services/supabaseClient';

interface DiagnosticResult {
  label: string;
  status: 'success' | 'warning' | 'error' | 'info';
  message: string;
  detail?: string;
}

interface NotificationDiagnosticProps {
  userId?: string;
}

const NotificationDiagnostic: React.FC<NotificationDiagnosticProps> = ({ userId }) => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    runDiagnostics();
  }, [userId]);

  const runDiagnostics = async () => {
    setIsLoading(true);
    const diagnostics: DiagnosticResult[] = [];

    // 1. Platform Detection
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
    const isChrome = /chrome/.test(userAgent);

    if (isIOS) {
      const iosVersion = userAgent.match(/os (\d+)_/)?.[1];
      diagnostics.push({
        label: 'Platform',
        status: 'info',
        message: `iOS ${iosVersion || 'Unknown'}`,
        detail: iosVersion && parseInt(iosVersion) >= 16 ? 'iOS 16.4+ required for Web Push' : 'Requires iOS 16.4+'
      });
    } else if (isAndroid) {
      diagnostics.push({
        label: 'Platform',
        status: 'success',
        message: 'Android',
        detail: 'Web Push fully supported'
      });
    } else {
      diagnostics.push({
        label: 'Platform',
        status: 'success',
        message: 'Desktop',
        detail: 'Web Push fully supported'
      });
    }

    // 2. PWA Install Status (iOS specific)
    if (isIOS) {
      const isPWA = isIOSPWA();
      diagnostics.push({
        label: 'PWA Installation',
        status: isPWA ? 'success' : 'warning',
        message: isPWA ? 'Installed to Home Screen' : 'Not installed',
        detail: isPWA ? 'Web Push enabled' : 'Add to Home Screen required for push notifications'
      });
    }

    // 3. Service Worker Support
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const state = registration.active?.state || registration.installing?.state || registration.waiting?.state;
          diagnostics.push({
            label: 'Service Worker',
            status: 'success',
            message: `Registered (${state})`,
            detail: `Scope: ${registration.scope}`
          });
        } else {
          diagnostics.push({
            label: 'Service Worker',
            status: 'warning',
            message: 'Not registered',
            detail: 'Will be registered on next page load'
          });
        }
      } catch (error) {
        diagnostics.push({
          label: 'Service Worker',
          status: 'error',
          message: 'Error checking status',
          detail: String(error)
        });
      }
    } else {
      diagnostics.push({
        label: 'Service Worker',
        status: 'error',
        message: 'Not supported',
        detail: 'Browser does not support Service Workers'
      });
    }

    // 4. Push Manager Support
    if ('PushManager' in window) {
      diagnostics.push({
        label: 'Push Manager',
        status: 'success',
        message: 'Available',
        detail: 'Browser supports Web Push API'
      });
    } else {
      diagnostics.push({
        label: 'Push Manager',
        status: 'error',
        message: 'Not available',
        detail: 'Web Push not supported on this browser'
      });
    }

    // 5. Notification API
    if ('Notification' in window) {
      const permission = Notification.permission;
      diagnostics.push({
        label: 'Notification Permission',
        status: permission === 'granted' ? 'success' : permission === 'denied' ? 'error' : 'warning',
        message: permission.charAt(0).toUpperCase() + permission.slice(1),
        detail: permission === 'granted' ? 'Can show notifications' : permission === 'denied' ? 'User denied permission' : 'Permission not requested yet'
      });
    } else {
      diagnostics.push({
        label: 'Notification API',
        status: 'error',
        message: 'Not supported',
        detail: 'Browser does not support Notification API'
      });
    }

    // 6. Push Subscription Status
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          diagnostics.push({
            label: 'Push Subscription',
            status: 'success',
            message: 'Active',
            detail: `Endpoint: ${subscription.endpoint.substring(0, 50)}...`
          });
        } else {
          diagnostics.push({
            label: 'Push Subscription',
            status: 'warning',
            message: 'Not subscribed',
            detail: 'Click "Allow" when prompted for notifications'
          });
        }
      } catch (error) {
        diagnostics.push({
          label: 'Push Subscription',
          status: 'warning',
          message: 'Unable to check',
          detail: String(error)
        });
      }
    }

    // 7. Database Subscription Check
    if (userId) {
      try {
        const { data, error } = await supabase
          .from('push_subscriptions')
          .select('id, endpoint, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const timeSince = Math.floor((Date.now() - new Date(data[0].created_at).getTime()) / 1000 / 60);
          diagnostics.push({
            label: 'Database Subscription',
            status: 'success',
            message: 'Saved',
            detail: `Registered ${timeSince} minutes ago`
          });
        } else {
          diagnostics.push({
            label: 'Database Subscription',
            status: 'warning',
            message: 'Not found',
            detail: 'No subscription in database'
          });
        }
      } catch (error) {
        diagnostics.push({
          label: 'Database Subscription',
          status: 'error',
          message: 'Error checking',
          detail: String(error)
        });
      }
    }

    // 8. Notification Capability Summary
    const capability = getNotificationCapability();
    diagnostics.push({
      label: 'Notification Strategy',
      status: capability.type === 'webpush' ? 'success' : capability.type === 'realtime' ? 'info' : 'error',
      message: capability.type === 'webpush' ? 'Web Push' : capability.type === 'realtime' ? 'Realtime Only' : 'Not Available',
      detail: capability.description
    });

    setResults(diagnostics);
    setIsLoading(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'info':
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          🔍 Notification Diagnostics
        </h3>
        <div className="animate-pulse space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          🔍 Notification Diagnostics
        </h3>
        <button
          onClick={runDiagnostics}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="space-y-3">
        {results.map((result, index) => (
          <div
            key={index}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{getStatusIcon(result.status)}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {result.label}
                  </span>
                </div>
                <div className={`text-sm font-semibold ${getStatusColor(result.status)}`}>
                  {result.message}
                </div>
                {result.detail && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {result.detail}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>💡 Tip:</strong> For iOS devices, install this app to your Home Screen first, then allow notifications.
          Web Push only works when the PWA is installed (iOS 16.4+).
        </p>
      </div>
    </div>
  );
};

export default NotificationDiagnostic;
