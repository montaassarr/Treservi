import React from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  Scissors, 
  DollarSign, 
  LogOut, 
  Sun, 
  Moon,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  mobileMode?: boolean;
  onLogout: () => void;
  userRole?: 'owner' | 'staff';
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  isDarkMode, 
  toggleTheme, 
  mobileMode = false, 
  onLogout,
  userRole = 'owner'
}) => {
  // Define all navigation items
  const allNavItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['owner', 'staff'] },
    { id: 'appointments', icon: CalendarDays, label: 'Appointments', roles: ['owner'] },
    { id: 'staff', icon: Users, label: 'Staff', roles: ['owner'] },
    { id: 'services', icon: Scissors, label: 'Services', roles: ['owner'] },
    { id: 'income', icon: DollarSign, label: 'Income', roles: ['owner'] },
  ];

  // Filter navigation items based on user role
  const navItems = allNavItems.filter(item => item.roles.includes(userRole));

  return (
    <div className={`
      ${mobileMode ? 'w-full' : 'w-20 lg:w-72'} 
      h-full flex flex-col justify-between py-8 px-4 
      ${!mobileMode && 'border-r border-gray-200 dark:border-gray-800'} 
      transition-all duration-300
    `}>
      
      {/* Top Section */}
      <div className="flex flex-col gap-10">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-treservi-accent rounded-full flex items-center justify-center shadow-neon-glow flex-shrink-0">
            <Scissors className="text-white w-5 h-5" />
          </div>
          <span className={`text-2xl font-bold tracking-tight ${mobileMode ? 'block' : 'hidden lg:block'}`}>Treservi</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`
                  flex items-center gap-4 px-4 py-4 rounded-pill transition-all duration-300 group whitespace-nowrap
                  ${isActive 
                    ? 'bg-treservi-card-dark text-white dark:bg-white dark:text-black shadow-lg scale-105' 
                    : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}
                `}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-treservi-accent' : ''}`} />
                <span className={`font-medium ${mobileMode ? 'block' : 'hidden lg:block'}`}>{item.label}</span>
                {isActive && <div className={`ml-auto w-2 h-2 rounded-full bg-treservi-accent shadow-neon-glow ${mobileMode ? 'block' : 'hidden lg:block'}`}></div>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-4">
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="flex items-center gap-4 px-4 py-4 rounded-pill bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 transition-all hover:scale-105 whitespace-nowrap"
        >
          {isDarkMode ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
          <span className={`font-medium ${mobileMode ? 'block' : 'hidden lg:block'}`}>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* Logout */}
        <button 
          onClick={onLogout}
          className="flex items-center gap-4 px-4 py-4 rounded-pill text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all whitespace-nowrap"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className={`font-medium ${mobileMode ? 'block' : 'hidden lg:block'}`}>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
