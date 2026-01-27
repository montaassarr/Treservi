import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Dashboard from '../components/Dashboard';
import StaffDashboard from '../components/StaffDashboard';
import Appointments from '../components/Appointments';
import Services from '../components/Services';
import AIAssistant from '../components/AIAssistant';
import Staff from '../components/Staff';
import { Sparkles, X } from 'lucide-react';

interface DashboardPageProps {
  salonId: string;
  userId: string;
  userRole: 'owner' | 'staff';
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

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

  // Staff Restricted Access - Force to dashboard and prevent tab switching
  useEffect(() => {
    if (userRole === 'staff') {
      setIsLoadingContent(true);
      // Force staff to dashboard tab only
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
      }
      setIsLoadingContent(false);
    }
  }, [userRole, activeTab]);

  // Guard: Prevent rendering owner dashboard for staff users
  const shouldShowOwnerDashboard = activeTab === 'dashboard' && userRole === 'owner';
  const shouldShowStaffDashboard = activeTab === 'dashboard' && userRole === 'staff';
  return (
    <div className={`flex h-screen w-full transition-colors duration-300 ${isDarkMode ? 'dark bg-treservi-bg-dark' : 'bg-treservi-bg-light'}`}>
      {/* Sidebar - Desktop */}
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

      {/* Sidebar - Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          <div className="relative w-72 h-full bg-white dark:bg-treservi-card-dark shadow-2xl animate-in slide-in-from-left duration-300">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full z-50"
            >
              <X size={24} />
            </button>
            <Sidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
              mobileMode={true}
              userRole={userRole}
              onLogout={onLogout}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto relative flex flex-col">
        <Navbar title={activeTab} onMenuClick={() => setIsMobileMenuOpen(true)} userName={staffName || 'Admin'} userRole={userRole} />

        <div className="flex-1">
          {/* Owner Dashboard - guarded */}
          {shouldShowOwnerDashboard && !isLoadingContent && <Dashboard userRole={userRole} />}
          
          {/* Staff Dashboard - guarded */}
          {shouldShowStaffDashboard && !isLoadingContent && (
            <StaffDashboard staffId={userId} salonId={salonId} staffName={staffName} />
          )}

          {/* Appointments - Owner only */}
          {activeTab === 'appointments' && userRole === 'owner' && !isLoadingContent && (
            <Appointments salonId={salonId} />
          )}

          {/* Services - Owner only */}
          {activeTab === 'services' && userRole === 'owner' && !isLoadingContent && (
            <Services salonId={salonId} />
          )}

          {/* Staff Management - Owner only */}
          {activeTab === 'staff' && userRole === 'owner' && !isLoadingContent && (
            <Staff salonId={salonId} isOwner={true} />
          )}

          {/* Income - Owner only */}
          {activeTab === 'income' && userRole === 'owner' && !isLoadingContent && (
            <div className="flex items-center justify-center h-full text-gray-400 animate-in fade-in zoom-in duration-300">
              <div className="text-center p-8 bg-white dark:bg-treservi-card-dark rounded-[32px] shadow-soft-glow">
                <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
                <p>The income module is under development.</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoadingContent && (
            <div className="flex items-center justify-center h-full">
              <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-treservi-accent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsAIOpen(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-treservi-accent hover:bg-green-500 rounded-full shadow-neon-glow flex items-center justify-center z-40 transition-all hover:scale-110 active:scale-95 group"
        >
          <Sparkles className="text-white w-8 h-8 group-hover:rotate-12 transition-transform" />
        </button>
      </main>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
};

export default DashboardPage;
