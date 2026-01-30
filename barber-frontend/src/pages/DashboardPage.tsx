import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Dashboard from '../components/Dashboard';
import StaffDashboard from '../components/StaffDashboard';
import Appointments from '../components/Appointments';
import Services from '../components/Services';
import Staff from '../components/Staff';
import BottomNavigation from '../components/BottomNavigation';
import { useSalon } from '../context/SalonContext';
import { Sparkles } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Update page title with salon name
  useEffect(() => {
    if (salon?.name) {
      document.title = `${salon.name} - Dashboard | Reservi`;
    }
  }, [salon]);

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

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

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
      <div className="sticky top-0 z-30">
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
          />
      </div>

        {/* Main Content - scrollable with bottom padding for mobile nav */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 py-4 md:py-6 pb-24 md:pb-6">
          {shouldShowOwnerDashboard && <Dashboard salonId={salonId} userId={userId} />}
          {shouldShowStaffDashboard && <StaffDashboard salonId={salonId} staffId={userId} staffName={staffName} />}
          {activeTab === 'appointments' && userRole === 'owner' && <Appointments salonId={salonId} />}
          {activeTab === 'services' && userRole === 'owner' && <Services salonId={salonId} />}
          {activeTab === 'staff' && userRole === 'owner' && <Staff salonId={salonId} />}
          {/* AI Assistant removed */}
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
