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
import { useSalon } from '../context/SalonContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../services/supabaseClient';
import { QRCodeCanvas } from 'qrcode.react';

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
  const { salon, salonSlug } = useSalon();
  const { language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; subtitle: string; timestamp: string }>>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  
  // Refs to track state without causing re-renders
  const seenAppointmentsRef = useRef<Set<string>>(new Set());
  const isInitializedRef = useRef(false);
  const channelRef = useRef<any>(null);

  // Update page title with salon name
  useEffect(() => {
    if (salon?.name) {
      document.title = `${salon.name} - Dashboard | Reservi`;
    }
  }, [salon?.name]);

  // Dark mode toggle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Close mobile menu on tab change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  const bookingUrl = useMemo(() => {
    if (!salonSlug) return '';
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/?salon=${salonSlug}&ref=qr_code&route=/book`;
  }, [salonSlug]);

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
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    try {
      const saved = localStorage.getItem('dashboard_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.length > 0) {
          setNotifications(parsed);
          parsed.forEach((n: any) => {
            if (n.id) seenAppointmentsRef.current.add(n.id);
          });
          setNotificationCount(parsed.length);
        }
      }
    } catch (e) {
      // Silently fail on iOS Safari localStorage issues
    }
    
    isInitializedRef.current = true;
  }, []);

  // iOS-Safe: Setup real-time notifications (deferred with proper cleanup)
  useEffect(() => {
    if (!supabase || !salonId || !userId || isInitializedRef.current === false) return;

    const setupNotifications = async () => {
      try {
        // Setup real-time subscription (iOS-safe, no bootstrap)
        const channel = supabase
          .channel(`notifications-${salonId}-${userId}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'appointments',
            filter: userRole === 'owner'
              ? `salon_id=eq.${salonId}`
              : `staff_id=eq.${userId}`,
          }, async (payload) => {
            const apt = payload.new as any;
            if (!apt?.id || seenAppointmentsRef.current.has(apt.id)) return;
            seenAppointmentsRef.current.add(apt.id);

            // Fetch appointment details safely
            try {
              const { data } = await supabase
                .from('appointments')
                .select('staff:staff_id(full_name), service:service_id(name, price)')
                .eq('id', apt.id)
                .single();

              const staffName = (data?.staff as any)?.full_name || 'Unassigned';
              const serviceName = (data?.service as any)?.name || 'Service';
              
              setNotifications((prev) => {
                const updated = [
                  {
                    id: apt.id,
                    title: `New appointment${apt.customer_name ? ` • ${apt.customer_name}` : ''}`,
                    subtitle: `${serviceName} • ${staffName}`,
                    timestamp: new Date().toLocaleString(),
                  },
                  ...prev.filter(n => n.id !== apt.id),
                ].slice(0, 10);
                
                // Persist to localStorage
                try {
                  localStorage.setItem('dashboard_notifications', JSON.stringify(updated));
                } catch (e) {
                  // Silently fail on iOS localStorage quota
                }
                
                return updated;
              });

              setNotificationCount((prev) => prev + 1);
            } catch (err) {
              // Silently handle fetch errors
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              channelRef.current = channel;
            }
          });
      } catch (err) {
        // Silently fail on subscription errors (iOS may not support all features)
      }
    };

    setupNotifications();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [salonId, userId, userRole]);

  const shouldShowOwnerDashboard = activeTab === 'dashboard' && userRole === 'owner';
  const shouldShowStaffDashboard = activeTab === 'dashboard' && userRole === 'staff';

  return (
    <div className={`flex h-screen w-full transition-colors duration-300 ${isDarkMode ? 'dark bg-treservi-bg-dark' : 'bg-treservi-bg-light'}`}>
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
            onNotificationsOpen={() => {
              // Clear notification count when opened
              setNotificationCount(0);
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
