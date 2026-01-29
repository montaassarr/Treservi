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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-[#121212]/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 pb-safe-area pt-2 px-6 md:hidden shadow-lg safe-area-inset-bottom h-24">
      <div className="flex justify-between items-center max-w-md mx-auto relative">
        
        {/* Navigation Items (Left & Right of FAB) */}
        {navItems.map((item, index) => {
             // Create a space in the middle for the FAB
             const isMiddle = index === Math.floor(navItems.length / 2);
             
             return (
               <React.Fragment key={item.tab}>
                  {/* Insert FAB in the middle if we have 4 items */}
                  {index === 2 && (
                       <div className="relative -top-8">
                          <button 
                            onClick={onAddClick}
                            className="w-14 h-14 bg-treservi-accent rounded-full text-white shadow-xl shadow-treservi-accent/30 flex items-center justify-center transform transition-transform active:scale-95"
                          >
                             <Plus size={28} strokeWidth={2.5} />
                          </button>
                       </div>
                  )}

                  <button
                    onClick={() => setActiveTab(item.tab)}
                    className={`flex flex-col items-center gap-1 transition-colors ${
                      activeTab === item.tab 
                      ? 'text-treservi-accent' 
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                  >
                    <item.icon size={24} strokeWidth={activeTab === item.tab ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </button>
               </React.Fragment>
             );
        })}

        {/* If fewer items, just put FAB at end or float it? 
            Let's stick to a standard 5-item grid layout or similar.
            The user wants the "Previous" state which likely had the FAB.
        */}
      </div>
    </div>
  );
};

export default BottomNavigation;
