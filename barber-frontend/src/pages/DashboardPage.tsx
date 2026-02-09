import React, { useEffect, useMemo, useState } from 'react';
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
            userId={userId}
            salonId={salonId}
            currentLanguage={language}
            onLanguageToggle={toggleLanguage}
          />
        </div>

        {/* Main Content - scrollable with bottom padding for mobile nav */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-4 md:px-6 pt-[calc(env(safe-area-inset-top)+5rem)] md:pt-6 pb-[calc(env(safe-area-inset-bottom)+6rem)] md:pb-6">
          {bookingUrl && userRole === 'owner' && (
            <div className="mb-6 bg-white dark:bg-treservi-card-dark rounded-[20px] sm:rounded-[28px] p-4 sm:p-5 border border-gray-100 dark:border-gray-800 shadow-soft-glow max-w-full">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Booking QR Code</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Share this link for online booking.</p>
                  <a href={bookingUrl} className="text-xs sm:text-sm text-emerald-600 break-all block overflow-hidden" target="_blank" rel="noreferrer">
                    {bookingUrl}
                  </a>
                </div>
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex-shrink-0 self-center">
                  <QRCodeCanvas value={bookingUrl} size={100} />
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
