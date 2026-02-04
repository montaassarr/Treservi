import React, { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Dashboard from '../components/Dashboard';
import StaffDashboard from '../components/StaffDashboard';
import Appointments from '../components/Appointments';
import Services from '../components/Services';
import Staff from '../components/Staff';
import Settings from '../components/Settings';
import BottomNavigation from '../components/BottomNavigation';
import NotificationToast from '../components/NotificationToast';
import { useSalon } from '../context/SalonContext';
import { useLanguage } from '../context/LanguageContext';
import { useAppBadge } from '../hooks/useAppBadge';
import { useNotifications, NotificationData } from '../hooks/useNotifications';
import { supabase } from '../services/supabaseClient';
import { QRCodeCanvas } from 'qrcode.react';
import { detectPlatform } from '../services/pushService';

interface DashboardPageProps {
  salonId: string;
  userId: string;
  userRole: 'owner' | 'staff' | 'super_admin';
  staffName: string;
  onLogout: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
  salonId,
  userId,
  userRole,
  staffName,
  onLogout
}) => {
  const { salon, salonSlug } = useSalon(); // Access salon context
  const { language, setLanguage } = useLanguage(); // Add language context
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; subtitle: string; timestamp: string }>>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [currentToastNotification, setCurrentToastNotification] = useState<NotificationData | null>(null);
  const seenAppointmentsRef = useRef<Set<string>>(new Set());
  const [hasBootstrappedNotifications, setHasBootstrappedNotifications] = useState(false);
  const [hasReadNotifications, setHasReadNotifications] = useState(false);
  const isLiveRef = useRef(false); // Track if we're receiving live updates (not bootstrap)
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);

  // Initialize app badge hook with Supabase sync
  const {
    updateBadge,
    clearBadge,
    hasPermission,
    isSupported,
    refreshBadgeFromDB,
    badgeCount
  } = useAppBadge({
    autoRequestPermission: true,
    userId: userId,
    salonId: salonId,
    userRole: userRole
  });

  // Get platform info for iOS-specific handling
  const platformInfo = useMemo(() => detectPlatform(), []);

  // Unified Notification Hook (push + realtime)
  const {
    status: notificationStatus,
    platform,
    isLoading: notificationLoading,
    error: notificationError,
    subscribe: subscribeToNotifications,
    showNotification: showLocalNotification,
    playSound,
    vibrate: vibrateDevice
  } = useNotifications({
    userId,
    salonId,
    userRole,
    enableRealtime: true,
    onNotification: (notification: NotificationData) => {
      console.log('[DashboardPage] 📬 Notification received:', notification);
      
      // Show toast notification (works on all platforms)
      setCurrentToastNotification(notification);
      
      // Increment notification count
      setNotificationCount(prev => prev + 1);
      
      // Add to notifications list for navbar dropdown
      setNotifications((prev) => [
        {
          id: notification.id,
          title: notification.title,
          subtitle: notification.body,
          timestamp: new Date().toLocaleString()
        },
        ...prev
      ]);

      // Update app badge
      updateBadge(notificationCount + 1);
      
      // Play sound and vibrate
      playSound();
      vibrateDevice([200, 100, 200]);
    },
    onError: (error) => {
      console.error('[DashboardPage] ❌ Notification error:', error);
    }
  });

  // Show notification setup banner on iOS if not subscribed
  useEffect(() => {
    if (platformInfo.isIOS && platformInfo.isPWA && notificationStatus !== 'subscribed') {
      // Show banner after 3 seconds if on iOS PWA and not yet subscribed
      const timer = setTimeout(() => {
        setShowNotificationBanner(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [platformInfo.isIOS, platformInfo.isPWA, notificationStatus]);

  // Auto-subscribe on non-iOS platforms (desktop/Android)
  useEffect(() => {
    if (!userId || !salonId) return;
    if (platformInfo.isIOS) return; // iOS requires user gesture, don't auto-subscribe

    // For desktop/Android, attempt subscription after 2 seconds
    const timer = setTimeout(async () => {
      if (notificationStatus === 'unsubscribed' || notificationStatus === 'permission-default') {
        const success = await subscribeToNotifications();
        if (success) {
          console.log('✅ Push notifications enabled (auto)');
        } else {
          console.log('⚠️ Push notifications not available, using real-time fallback');
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [userId, salonId, platformInfo.isIOS, notificationStatus, subscribeToNotifications]);

  // Handler for iOS notification enable button (requires user gesture)
  const handleEnableNotifications = async () => {
    console.log('[DashboardPage] 🔔 User tapped enable notifications button');
    const success = await subscribeToNotifications();
    if (success) {
      setShowNotificationBanner(false);
      console.log('✅ iOS Push notifications enabled via user gesture');
    }
  };

  // Update page title with salon name
  useEffect(() => {
    if (salon?.name) {
      document.title = `${salon.name} - Dashboard | Reservi`;
    }
  }, [salon]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('dashboard_notifications');
    const savedReadState = localStorage.getItem('dashboard_notifications_read');

    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        if (parsed && parsed.length > 0) {
          setNotifications(parsed);
          // Add IDs to seenAppointmentsRef to prevent duplicates
          parsed.forEach((notif: any) => {
            if (notif.id) seenAppointmentsRef.current.add(notif.id);
          });

          // Only show count if not marked as read
          if (savedReadState === 'true') {
            setNotificationCount(0);
            setHasReadNotifications(true);
          } else {
            setNotificationCount(parsed.length);
          }
        }
      } catch (e) {
        console.error('Failed to parse saved notifications:', e);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('dashboard_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Update app badge when notification count changes
  useEffect(() => {
    if (hasPermission && isSupported) {
      updateBadge(notificationCount);
    }
  }, [notificationCount, hasPermission, isSupported, updateBadge]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  const bookingUrl = useMemo(() => {
    if (!salonSlug) return '';
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/?salon=${salonSlug}&ref=qr_code&route=/book`;
  }, [salonSlug]);

  const playNotification = () => {
    // Vibration
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    // Play notification sound - simple beep
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 1000; // Higher frequency for faster response
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Silently fail if audio context not available
      console.log('Audio notification not supported');
    }
  };

  useEffect(() => {
    if (!supabase || !salonId || !userId) return;

    const addNotification = async (appointment: any) => {
      const appointmentId = appointment?.id || `${Date.now()}`;
      if (seenAppointmentsRef.current.has(appointmentId)) return;
      seenAppointmentsRef.current.add(appointmentId);

      // Fetch full appointment details
      let staffName = 'Unassigned';
      let serviceName = 'Service';
      let amount = 'N/A';

      try {
        const { data } = await supabase
          .from('appointments')
          .select(`
            *,
            staff:staff_id(full_name),
            service:service_id(name, price)
          `)
          .eq('id', appointmentId)
          .single();

        if (data) {
          staffName = (data.staff as any)?.full_name || 'Unassigned';
          serviceName = (data.service as any)?.name || 'Service';
          amount = (data.service as any)?.price ? `${(data.service as any).price} DT` : (data.amount || 'N/A');
        }
      } catch (error) {
        console.error('Error fetching appointment details:', error);
      }

      const title = `New appointment${appointment?.customer_name ? ` • ${appointment.customer_name}` : ''}`;
      const subtitle = `${serviceName} • ${staffName} • ${appointment?.appointment_date || ''} ${appointment?.appointment_time || ''}`.trim();
      const timestamp = new Date().toLocaleString();

      setNotifications((prev) => {
        const newNotifications = [
          {
            id: appointmentId,
            title,
            subtitle,
            timestamp,
            staffName,
            serviceName,
            amount,
            date: appointment?.appointment_date,
            time: appointment?.appointment_time,
            customerName: appointment?.customer_name,
            customerPhone: appointment?.customer_phone,
            customerEmail: appointment?.customer_email
          },
          ...prev.filter(n => n.id !== appointmentId), // Remove duplicates
        ];
        // Keep last 10 notifications (no hardcoded limit)
        return newNotifications.slice(0, 10);
      });

      // Only play sound and increment count for LIVE updates (not bootstrap/refresh)
      if (isLiveRef.current) {
        setNotificationCount((prev) => prev + 1); // No cap
        setHasReadNotifications(false);
        localStorage.setItem('dashboard_notifications_read', 'false');
        playNotification();
        // Badge auto-updates via useAppBadge hook's realtime subscription
      }
    };

    const bootstrapNotifications = async () => {
      if (hasBootstrappedNotifications) return;

      // Only bootstrap if no notifications in localStorage
      if (notifications.length > 0) {
        setHasBootstrappedNotifications(true);
        return;
      }

      try {
        // 1. Fetch the items for the dropdown (Limit 10 is fine for UI list)
        const query = supabase
          .from('appointments')
          .select(`
            *,
            staff:staff_id(full_name),
            service:service_id(name, price)
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        const { data } = userRole === 'owner'
          ? await query.eq('salon_id', salonId)
          : await query.eq('staff_id', userId);

        if (data && data.length > 0) {
          const bootstrappedNotifications = data.map((apt: any) => {
            seenAppointmentsRef.current.add(apt.id);

            const staffName = (apt.staff as any)?.full_name || 'Unassigned';
            const serviceName = (apt.service as any)?.name || 'Service';
            const amount = (apt.service as any)?.price ? `${(apt.service as any).price} DT` : (apt.amount || 'N/A');

            return {
              id: apt.id,
              title: `New appointment${apt.customer_name ? ` • ${apt.customer_name}` : ''}`,
              subtitle: `${serviceName} • ${staffName} • ${apt.appointment_date || ''} ${apt.appointment_time || ''}`.trim(),
              timestamp: new Date(apt.created_at).toLocaleString(),
              staffName,
              serviceName,
              amount,
              date: apt.appointment_date,
              time: apt.appointment_time,
              customerName: apt.customer_name,
              customerPhone: apt.customer_phone,
              customerEmail: apt.customer_email,
              isRead: apt.is_read // Store read status
            };
          });

          setNotifications(bootstrappedNotifications);
        }

        // Don't set notification count on bootstrap - only from live updates
        setNotificationCount(0);

      } catch (error) {
        console.error('Error bootstrapping notifications:', error);
      }

      setHasBootstrappedNotifications(true);
    };

    bootstrapNotifications();

    // Realtime subscription for appointments - this is the primary notification mechanism
    console.log('[DashboardPage] 🔌 Setting up postgres_changes subscription for appointments');
    const channel = supabase
      .channel('notifications-appointments')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'appointments',
        filter: userRole === 'owner'
          ? `salon_id=eq.${salonId}`
          : `staff_id=eq.${userId}`,
      }, (payload) => {
        console.log('[DashboardPage] 📬 postgres_changes notification received:', payload);
        // Mark as live mode - this is a real-time update
        isLiveRef.current = true;
        addNotification(payload.new as any);
      })
      .subscribe((status) => {
        console.log('[DashboardPage] 📡 postgres_changes subscription status:', status);
      });

    return () => {
      console.log('[DashboardPage] 🧹 Cleaning up postgres_changes subscription');
      supabase.removeChannel(channel);
    };
  }, [salonId, userId, userRole, hasBootstrappedNotifications]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const toggleLanguage = () => {
    let newLang: 'en' | 'fr' | 'ar' | 'tn' = 'en';
    if (language === 'en') newLang = 'fr';
    else if (language === 'fr') newLang = 'ar';
    else if (language === 'ar') newLang = 'tn';
    else newLang = 'en';

    setLanguage(newLang);
  };

  // Force staff to dashboard only
  useEffect(() => {
    if (userRole === 'staff' && activeTab !== 'dashboard') {
      setActiveTab('dashboard');
    }
  }, [userRole, activeTab]);

  const shouldShowOwnerDashboard = activeTab === 'dashboard' && userRole === 'owner';
  const shouldShowStaffDashboard = activeTab === 'dashboard' && userRole === 'staff';

  return (
    <div className={`flex h-screen w-full transition-colors duration-300 ${isDarkMode ? 'dark bg-treservi-bg-dark' : 'bg-treservi-bg-light'}`}>
      {/* Real-time Notification Toast (iOS & Desktop Compatible) */}
      <NotificationToast
        notification={currentToastNotification}
        onDismiss={() => setCurrentToastNotification(null)}
        duration={5000}
      />

      {/* iOS Notification Enable Banner - Requires user gesture */}
      {showNotificationBanner && platformInfo.isIOS && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 shadow-lg">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔔</span>
              <div>
                <p className="font-semibold">Enable Notifications</p>
                <p className="text-sm opacity-90">Stay updated with new appointments</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleEnableNotifications}
                disabled={notificationLoading}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {notificationLoading ? 'Enabling...' : 'Enable'}
              </button>
              <button
                onClick={() => setShowNotificationBanner(false)}
                className="text-white/80 hover:text-white px-2"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Desktop Only */}
      <div className="hidden lg:block h-screen sticky top-0 z-40 bg-white dark:bg-black/20 backdrop-blur-md">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          userRole={userRole}
          onLogout={onLogout}
        />
      </div>

      {/* Main Content Area - Responsive */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - visible on all screens (modified Navbar for mobile) */}
        <div className="sticky top-0 z-30 pointer-events-none">
          <Navbar
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            userRole={userRole}
            onLogout={onLogout}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            salonName={salon?.name || 'Salon'}
            userName={staffName || 'User'}
            notificationCount={notificationCount}
            notifications={notifications}
            onNotificationsOpen={async () => {
              // Instagram-style: clear badge and mark as read
              setNotificationCount(0);
              setHasReadNotifications(true);
              localStorage.setItem('dashboard_notifications_read', 'true');
              await clearBadge();

              // Refresh badge count from DB
              if (refreshBadgeFromDB) {
                await refreshBadgeFromDB();
              }
            }}
            currentLanguage={language}
            onLanguageToggle={toggleLanguage}
          />
        </div>

        {/* Main Content - scrollable with bottom padding for mobile nav */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 pt-[calc(env(safe-area-inset-top)+5rem)] md:pt-6 pb-[calc(env(safe-area-inset-bottom)+6rem)] md:pb-6">
          {bookingUrl && userRole === 'owner' && (
            <div className="mb-6 bg-white dark:bg-treservi-card-dark rounded-[28px] p-5 border border-gray-100 dark:border-gray-800 shadow-soft-glow">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Booking QR Code</h3>
                  <p className="text-sm text-gray-500">Share this link for online booking.</p>
                  <a href={bookingUrl} className="text-sm text-emerald-600 break-all" target="_blank" rel="noreferrer">
                    {bookingUrl}
                  </a>
                </div>
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                  <QRCodeCanvas value={bookingUrl} size={120} />
                </div>
              </div>
            </div>
          )}
          {shouldShowOwnerDashboard && <Dashboard salonId={salonId} userId={userId} />}
          {shouldShowStaffDashboard && <StaffDashboard salonId={salonId} staffId={userId} staffName={staffName} />}
          {activeTab === 'appointments' && userRole === 'owner' && <Appointments salonId={salonId} />}
          {activeTab === 'services' && userRole === 'owner' && <Services salonId={salonId} />}
          {activeTab === 'staff' && userRole === 'owner' && <Staff salonId={salonId} />}
          {activeTab === 'settings' && userRole === 'owner' && <Settings salonId={salonId} />}
        </div>
      </div>

      {/* FAB - AI Assistant (Removed as per request) */}

      {/* AI Modal (Removed as per request) */}


      {/* Bottom Navigation - Mobile Only */}
      <BottomNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        onAddClick={() => {
          // Navigate to appointments tab on FAB click
          setActiveTab('appointments');
        }}
      />
    </div>
  );
};

export default DashboardPage;
