import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Globe, LogOut, Home, Calendar, Users, Settings, Briefcase, User, Info, CreditCard } from 'lucide-react';
import { useLanguage, Language } from '../context/LanguageContext';

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
  isDarkMode: boolean;
  toggleTheme: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  setActiveTab, 
  title, 
  onMenuClick, 
  userName = 'User', 
  userRole = 'owner', 
  salonName = 'Salon',
  isDarkMode, 
  toggleTheme,
  onLogout
}) => {
  const [showLanguage, setShowLanguage] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();

  // If onLogout is not passed (shouldn't happen in new App.tsx), use fallback
  const handleLogout = onLogout || (async () => {
    // Fallback if needed
    console.error("onLogout prop missing in Navbar");
    navigate('/');
  });  const handleClickOutside = useCallback((event: MouseEvent) => {
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
    ]
  : [
      { icon: Home, label: 'Home', tab: 'dashboard' },
    ];

  return (
    <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center transition-colors duration-300">
      
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
          
          {/* Notification Bell */}
           <button 
              className="p-2.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors relative"
            >
              <Bell size={24} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-[#121212]"></span>
            </button> 

          {/* Profile Avatar / Toggle Menu */}
          <div className="relative" ref={profileRef}>
             <button 
               onClick={() => setShowProfileMenu(!showProfileMenu)}
               className="relative focus:outline-none"
             >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                    <img 
                        src={`https://ui-avatars.com/api/?name=${userName}&background=10b981&color=fff`} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                    />
                </div>
             </button>

             {/* Mobile Profile Dropdown Menu */}
             {showProfileMenu && (
                 <div className="absolute right-0 mt-4 w-72 md:w-80 bg-white/90 dark:bg-treservi-card-dark/95 backdrop-blur-xl rounded-[32px] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 ring-1 ring-black/5 z-50">
                     
                     <div className="p-6 pb-2 border-b border-gray-100 dark:border-gray-700/50">
                        <div className="flex items-center gap-4 mb-4">
                             <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-treservi-accent padding-1">
                                <img src={`https://ui-avatars.com/api/?name=${userName}&background=10b981&color=fff`} alt="Profile" className="w-full h-full object-cover" />
                             </div>
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
                             <button className="flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-sm font-medium">
                                 <Globe size={16} /> {language.toUpperCase()}
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
  );
};

export default Navbar;