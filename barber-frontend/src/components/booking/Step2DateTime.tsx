import React, { useEffect } from 'react';
import { BookingStaff as Staff, Translations } from '../../types';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  staff: Staff;
  selectedDate: Date | null;
  selectedTime: string | null;
  onDateSelect: (date: Date) => void;
  onTimeSelect: (time: string) => void;
  t: Translations;
  lang: string;
}

export const Step2DateTime: React.FC<Props> = ({ staff, selectedDate, selectedTime, onDateSelect, onTimeSelect, t, lang }) => {
  // Automatically select today if not selected
  useEffect(() => {
    if (!selectedDate) {
      onDateSelect(new Date());
    }
  }, [selectedDate, onDateSelect]);

  const today = new Date();
  // Adjust locale for date formatting based on selected language
  const locale = lang === 'ar' ? 'ar-TN' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const dateString = today.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });

  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30"
  ];

  return (
    <div className="space-y-8">
      {/* Summary Card */}
      {/* @ts-ignore */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${staff.bgColor} p-4 rounded-3xl flex items-center gap-4 bg-opacity-50`}
      >
        <img src={staff.image} alt={staff.name} className="w-12 h-12 rounded-xl object-cover" />
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{t.specialist}</p>
          <h3 className="font-bold text-gray-900">{staff.name}</h3>
        </div>
      </motion.div>

      {/* Date Display (Fixed to Today) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{t.todaySchedule}</h2>
          <div className="flex gap-2">
             <div className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold flex items-center gap-1">
               <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
               {t.live}
             </div>
          </div>
        </div>
        
        <div className="p-6 bg-gray-900 text-white rounded-[24px] shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-full backdrop-blur-sm">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white/60 text-xs font-medium uppercase tracking-wider">{t.date}</p>
              <h3 className="text-xl font-bold capitalize">{dateString}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Time Selection */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">{t.availableSlots}</h2>
        <div className="grid grid-cols-3 gap-3">
          {timeSlots.map((time, idx) => {
            const isSelected = selectedTime === time;
            return (
              // @ts-ignore
              <motion.button
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => onTimeSelect(time)}
                className={`py-3 px-2 rounded-xl text-sm font-medium border transition-all ${
                  isSelected
                    ? 'bg-gray-900 text-white border-gray-900 shadow-md transform scale-105'
                    : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300'
                }`}
              >
                {time}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
