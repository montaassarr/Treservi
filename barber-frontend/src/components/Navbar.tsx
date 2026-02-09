import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Globe, LogOut, Home, Calendar, Users, Settings, Briefcase, User, Info, CreditCard } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../types';

import NotificationToggle from './NotificationToggle';
import Avatar from './Avatar';

interface NavbarProps {
  // Mobile Header Props
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  
  // Existing Props
  title?: string;
  onMenuClick?: () => void;
  userName?: string;
  userRole?: 'owner' | 'staff' | 'super_admin';
  salonName?: string;
  userId?: string;
  salonId?: string;
  isDarkMode: boolean;
  toggleTheme: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  onLogout: () => void;
  currentLanguage?: string;
  onLanguageToggle?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  setActiveTab, 
  title, 
  onMenuClick, 
  userName = 'User', 
  userRole = 'owner', 
  salonName = 'Salon',
  userId,
  salonId,
  isDarkMode, 
  toggleTheme,
  onLogout,
  currentLanguage = 'en',
  onLanguageToggle
}) => {
  const [showLanguage, setShowLanguage] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  // If onLogout is not passed (shouldn't happen in new App.tsx), use fallback
  const handleLogout = onLogout || (async () => {
    // Fallback if needed
    console.error("onLogout prop missing in Navbar");
    navigate('/');
  });
  
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
      setShowProfileMenu(false);
    }
    if (langRef.current && !langRef.current.contains(event.target as Node)) {
      setShowLanguage(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  const navItems = userRole === 'owner' 
  ? [
      { icon: Home, label: 'Home', tab: 'dashboard' },
      { icon: Calendar, label: 'Appointments', tab: 'appointments' },
      { icon: Briefcase, label: 'Services', tab: 'services' },
      { icon: Users, label: 'Staff', tab: 'staff' },
      { icon: Settings, label: 'Settings', tab: 'settings' },
    ]
  : [
      { icon: Home, label: 'Home', tab: 'dashboard' },
    ];

  return (
    <div className="fixed top-0 left-0 right-0 z-30 pt-[calc(env(safe-area-inset-top)+0.5rem)] px-4 pointer-events-none md:sticky md:top-0 md:pointer-events-auto md:px-0 md:pt-0">
      <header className="w-full bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl border border-gray-100 dark:border-gray-800 rounded-3xl shadow-lg px-4 py-3 flex justify-between items-center transition-all duration-300 pointer-events-auto md:rounded-none md:shadow-none md:border-b md:px-6 md:pt-4 md:pb-4">
        
        {/* Left: Mobile Profile & Greeting */}
        <div className="flex items-center gap-3 flex-1">
          <div className="flex flex-col">
              <h1 className="hidden md:flex text-xl md:text-2xl font-bold flex-col md:flex-row md:gap-2">
                  <span className="text-gray-900 dark:text-white capitalize">{salonName}</span>
              </h1>
              <p className="md:hidden text-sm text-gray-500 dark:text-gray-400 font-medium truncate">{salonName}</p>
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-3 md:gap-6">
          
          {/* Search Bar (Desktop) */}
          <div className="hidden md:block relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-treservi-accent transition-colors" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-gray-100 dark:bg-gray-800 text-sm rounded-full py-2.5 pl-10 pr-4 w-64 border-none outline-none focus:ring-2 focus:ring-treservi-accent/50 transition-all"
            />
          </div>

          {/* Actions Container */}
          <div className="flex items-center gap-2 md:gap-4">
            <NotificationToggle userId={userId} salonId={salonId} />
            
            {/* Profile Name / Toggle Menu */}
            <div className="relative" ref={profileRef}>
               <button 
                 onClick={() => setShowProfileMenu(!showProfileMenu)}
                 className="relative focus:outline-none px-3 py-2 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-white dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
               >
                  <Avatar
                    name={userName}
                    role={userRole}
                    size="sm"
                    showRing={false}
                  />
               </button>

               {/* Mobile Profile Dropdown Menu */}
               {showProfileMenu && (
                   <div className={`absolute mt-4 w-72 md:w-80 bg-white/90 dark:bg-treservi-card-dark/95 backdrop-blur-xl rounded-[32px] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 ring-1 ring-black/5 z-50 ${document.documentElement.dir === 'rtl' ? 'left-0' : 'right-0'}`}>
                       
                       <div className="p-6 pb-2 border-b border-gray-100 dark:border-gray-700/50">
                          <div className="flex items-center gap-4 mb-4">
                              <Avatar
                                name={userName}
                                role={userRole}
                                size="lg"
                              />
                               <div>
                                   <h3 className="font-bold text-lg dark:text-white">{userName}</h3>
                                   <p className="text-sm text-gray-500 capitalize">{userRole === 'super_admin' ? 'Super Admin' : userRole}</p>
                               </div>
                          </div>
                       </div>

                       {/* Menu Items */}
                       <div className="p-4 space-y-1">
                           {(navItems).map((item) => (
                               <button
                                  key={item.tab}
                                  onClick={() => { 
                                      if(setActiveTab) setActiveTab(item.tab); 
                                      setShowProfileMenu(false); 
                                  }}
                                  className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${
                                      activeTab === item.tab 
                                      ? 'bg-treservi-accent/10 text-treservi-accent font-bold' 
                                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                                  }`}
                               >
                                   <item.icon size={20} strokeWidth={activeTab === item.tab ? 2.5 : 2} />
                                   {item.label}
                               </button>
                           ))}

                           {/* Separator */}
                           <div className="my-2 border-t border-gray-100 dark:border-gray-700/50"></div>

                           {/* Language & Currency */}
                           <div className="grid grid-cols-2 gap-2">
                               <button 
                                  onClick={onLanguageToggle}
                                  className="flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-sm font-medium"
                               >
                                   <Globe size={16} /> {currentLanguage.toUpperCase()}
                               </button>
                               <button className="flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-sm font-medium">
                                   <CreditCard size={16} /> DT
                               </button>
                           </div>

                           {/* Logout */}
                           <button 
                              onClick={handleLogout}
                              className="w-full mt-2 flex items-center gap-4 p-3 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors font-medium"
                           >
                               <LogOut size={20} />
                               Logout
                           </button>
                       </div>
                   </div>
               )}
            </div>

          </div>
        </div>
      </header>
    </div>
  );
};

export default Navbar;