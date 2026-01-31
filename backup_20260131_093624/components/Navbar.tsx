import React, { useState, useEffect, useRef } from 'react';
import { Bell, Mail, Search, Menu, X } from 'lucide-react';
import { Comment } from '../types';

interface NavbarProps {
  title: string;
  onMenuClick: () => void;
}

// Mock Data for the Navbar
const mockMessages: Comment[] = [
  { id: '1', author: 'Joyce', text: "Great work! When is the next slot?", timeAgo: '2m ago', avatar: 'https://picsum.photos/id/103/50/50' },
  { id: '2', author: 'Mike', text: "Can we reschedule my cut?", timeAgo: '15m ago', avatar: 'https://picsum.photos/id/204/50/50' },
  { id: '3', author: 'Sarah', text: "Loved the style, thanks!", timeAgo: '1h ago', avatar: 'https://picsum.photos/id/338/50/50' },
];

const mockNotifications = [
  { id: 1, text: 'New booking from Alex Smith', time: '5m ago', type: 'booking' },
  { id: 2, text: 'Revenue target reached!', time: '2h ago', type: 'success' },
  { id: 3, text: 'System maintenance scheduled', time: '1d ago', type: 'system' },
];

const Navbar: React.FC<NavbarProps> = ({ title, onMenuClick }) => {
  const [showMessages, setShowMessages] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const msgRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (msgRef.current && !msgRef.current.contains(event.target as Node)) {
        setShowMessages(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex justify-between items-center transition-colors duration-300">
      
      {/* Left: Mobile Menu & Title */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-bold capitalize text-gray-900 dark:text-white">{title}</h1>
      </div>

      {/* Right: Search & Actions */}
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
          
          {/* Messages */}
          <div className="relative" ref={msgRef}>
            <button 
              onClick={() => { setShowMessages(!showMessages); setShowNotifications(false); }}
              className="p-2.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors relative"
            >
              <Mail size={20} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#121212]"></span>
            </button>

            {/* Messages Dropdown */}
            {showMessages && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-treservi-card-dark rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-black/5">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                  <h3 className="font-bold text-sm">Messages</h3>
                  <button className="text-xs text-treservi-accent font-medium hover:underline">Mark all read</button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {mockMessages.map((msg) => (
                    <div key={msg.id} className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer border-b border-gray-50 dark:border-gray-800/50 last:border-0 flex gap-3">
                      <img src={msg.avatar} alt={msg.author} className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-treservi-card-dark" />
                      <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-baseline mb-1">
                           <h4 className="font-bold text-sm truncate text-gray-900 dark:text-gray-100">{msg.author}</h4>
                           <span className="text-xs text-gray-400 whitespace-nowrap">{msg.timeAgo}</span>
                         </div>
                         <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-gray-50 dark:bg-black/20 text-center border-t border-gray-100 dark:border-gray-700">
                   <button className="text-xs font-bold hover:text-treservi-accent uppercase tracking-wide">View all messages</button>
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => { setShowNotifications(!showNotifications); setShowMessages(false); }}
              className="p-2.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors relative"
            >
              <Bell size={20} />
              <span className="absolute top-2.5 right-3 w-2 h-2 bg-treservi-accent rounded-full animate-pulse"></span>
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-white dark:bg-treservi-card-dark rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-black/5">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                  <h3 className="font-bold text-sm">Notifications</h3>
                  <span className="text-[10px] font-bold bg-treservi-accent text-white px-2 py-0.5 rounded-full">3 New</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {mockNotifications.map((notif) => (
                    <div key={notif.id} className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer border-b border-gray-50 dark:border-gray-800/50 last:border-0 flex gap-3 items-start">
                      <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 shadow-sm ${notif.type === 'booking' ? 'bg-blue-500' : notif.type === 'success' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                      <div>
                         <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug mb-1 font-medium">{notif.text}</p>
                         <span className="text-xs text-gray-400">{notif.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="ml-2 flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
             <img src="https://picsum.photos/id/433/100/100" alt="Profile" className="w-9 h-9 rounded-full border-2 border-white dark:border-gray-800 shadow-sm cursor-pointer hover:scale-105 transition-transform" />
             <div className="hidden lg:block">
                <p className="text-xs font-bold text-gray-900 dark:text-gray-100">Admin</p>
                <p className="text-[10px] text-gray-500">Salon Owner</p>
             </div>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Navbar;