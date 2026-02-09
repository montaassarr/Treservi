import React, { useState } from 'react';
import { BookingStaff as Staff, Translations } from '../../types';
import { Star, ArrowUpRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import Avatar from '../Avatar';

interface Props {
  onSelect: (staff: Staff) => void;
  staffList: Staff[];
  t: Translations;
  selectedStaffId?: string;
}

export const Step1Specialist: React.FC<Props> = ({ onSelect, staffList, t, selectedStaffId }) => {
  const [filter, setFilter] = useState<'All' | 'Barber' | 'Colorist' | 'Stylist'>('All');

  const filteredStaff = filter === 'All' ? staffList : staffList.filter(s => s.category === filter);

  const categories = [
    { id: 'All', label: t.filters.all },
    { id: 'Barber', label: t.filters.barber },
    { id: 'Colorist', label: t.filters.colorist },
    { id: 'Stylist', label: t.filters.stylist },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-gray-900">{t.greeting} <span className="inline-block animate-wave">👋</span></h1>
        <p className="text-gray-500">{t.subtitle}</p>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id as any)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === cat.id 
                ? 'bg-gray-900 text-white shadow-md' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid gap-4">
        {filteredStaff.map((staff, idx) => {
          const isSelected = staff.id === selectedStaffId;
          return (
            // @ts-ignore
            <motion.div
              key={staff.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`${staff.bgColor} p-5 rounded-[32px] flex items-center justify-between relative group cursor-pointer transition-all duration-300 shadow-soft ${
                isSelected 
                  ? 'ring-2 ring-gray-900 ring-offset-4 scale-[1.02] shadow-xl bg-gradient-to-br from-gray-50 to-white' 
                  : 'hover:shadow-lg hover:scale-[1.01] bg-white'
              }`}
              onClick={() => onSelect(staff)}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar
                    name={staff.name}
                    role="staff"
                    avatarUrl={staff.avatarUrl}
                    size="xl"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{staff.name}</h3>
                  <p className="text-gray-500 text-sm font-medium">{staff.role}</p>
                </div>
              </div>
              
              <button className={`p-3 rounded-full shadow-sm transition-colors ${
                isSelected 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-white/80 backdrop-blur-sm group-hover:bg-white text-gray-900'
              }`}>
                {isSelected ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <ArrowUpRight className="w-5 h-5" />
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
