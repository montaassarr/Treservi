import React from 'react';
import { Home, Calendar, Users, Briefcase, Plus } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onAddClick: () => void;
  userRole?: 'owner' | 'staff';
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ 
  activeTab, 
  setActiveTab,
  onAddClick,
  userRole = 'owner'
}) => {
  const navItems = userRole === 'owner' 
  ? [
      { icon: Home, label: 'Home', tab: 'dashboard' },
      { icon: Calendar, label: 'Appts', tab: 'appointments' },
      { icon: Briefcase, label: 'Services', tab: 'services' },
      { icon: Users, label: 'Staff', tab: 'staff' },
    ]
  : [
      { icon: Home, label: 'Home', tab: 'dashboard' },
      // Staff view is simplified
    ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pb-[calc(env(safe-area-inset-bottom)+1rem)] px-4 pointer-events-none">
      <div className="bg-white/90 dark:bg-[#121212]/95 backdrop-blur-xl border border-gray-100 dark:border-gray-800 rounded-[2rem] shadow-xl p-2 pointer-events-auto">
        <div className="flex justify-around items-center w-full relative">
        
        {navItems.map((item, index) => (
           <React.Fragment key={item.tab}>
              {index === 2 && (
                   <div className="relative -top-8 -mt-4">
                      <button 
                        onClick={onAddClick}
                        className="w-14 h-14 bg-treservi-accent rounded-full text-white shadow-xl shadow-treservi-accent/30 flex items-center justify-center transform transition-transform active:scale-95 border-4 border-white dark:border-[#121212]"
                      >
                         <Plus size={28} strokeWidth={2.5} />
                      </button>
                   </div>
              )}

              <button
                onClick={() => setActiveTab(item.tab)}
                className={`flex flex-col items-center gap-1 transition-all py-2 rounded-xl flex-1 ${
                  activeTab === item.tab 
                  ? 'text-treservi-accent' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <item.icon size={24} strokeWidth={activeTab === item.tab ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
           </React.Fragment>
        ))}
        </div>
      </div>
    </div>
  );
};

export default BottomNavigation;
