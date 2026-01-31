import React, { useEffect, useState } from 'react';
import { BookingStaff as Staff, Translations } from '../../types';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  staff: Staff;
  selectedDate: Date | null;
  selectedTime: string | null;
  bookedTimes: string[];
  onDateSelect: (date: Date) => void;
  onTimeSelect: (time: string) => void;
  t: Translations;
  lang: string;
}

export const Step2DateTime: React.FC<Props> = ({ staff, selectedDate, selectedTime, bookedTimes, onDateSelect, onTimeSelect, t, lang }) => {
  const [dateIndex, setDateIndex] = useState(0); // 0 = today, 1 = tomorrow, etc.
  
  // Get available dates (today and next 6 days)
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };
  
  const availableDates = getAvailableDates();
  
  // Automatically select today if not selected
  useEffect(() => {
    if (!selectedDate) {
      onDateSelect(availableDates[0]);
    }
  }, [selectedDate, onDateSelect]);

  const tunisNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Tunis' }));
  const todayKey = tunisNow.toLocaleDateString('en-CA');
  const selectedKey = selectedDate ? selectedDate.toLocaleDateString('en-CA', { timeZone: 'Africa/Tunis' }) : todayKey;
  const nowMinutes = tunisNow.getHours() * 60 + tunisNow.getMinutes();
  const isSameDay = selectedKey === todayKey;
  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  // Adjust locale for date formatting based on selected language
  const locale = lang === 'ar' ? 'ar-TN' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const dateString = selectedDate 
    ? selectedDate.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })
    : tunisNow.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });

  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30"
  ];

  const handleDateChange = (index: number) => {
    setDateIndex(index);
    onDateSelect(availableDates[index]);
    // Clear time selection when changing date
    onTimeSelect('');
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isTomorrow = (date: Date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return t.today || 'Today';
    if (isTomorrow(date)) return t.tomorrow || 'Tomorrow';
    return date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' });
  };

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

      {/* Date Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{t.selectDate || 'Select Date'}</h2>
          <div className="flex gap-2">
             <div className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold flex items-center gap-1">
               <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
               {t.live}
             </div>
          </div>
        </div>
        
        {/* Date Picker - Horizontal Scroll */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
          {availableDates.map((date, idx) => (
            <button
              key={idx}
              onClick={() => handleDateChange(idx)}
              className={`flex-shrink-0 px-4 py-3 rounded-2xl text-center min-w-[80px] transition-all ${
                dateIndex === idx
                  ? 'bg-gray-900 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-100 hover:border-gray-300'
              }`}
            >
              <p className={`text-xs font-medium ${dateIndex === idx ? 'text-gray-300' : 'text-gray-500'}`}>
                {date.toLocaleDateString(locale, { weekday: 'short' })}
              </p>
              <p className="text-lg font-bold">{date.getDate()}</p>
              {isToday(date) && (
                <p className={`text-[10px] font-bold ${dateIndex === idx ? 'text-green-400' : 'text-green-600'}`}>
                  {t.today || 'Today'}
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Selected Date Display */}
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
            const isBooked = bookedTimes.includes(time);
            const isPast = isSameDay && toMinutes(time) <= nowMinutes;
            const isUnavailable = isBooked || isPast;
            return (
              // @ts-ignore
              <motion.button
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => !isUnavailable && onTimeSelect(time)}
                disabled={isUnavailable}
                className={`py-3 px-2 rounded-xl text-sm font-medium border transition-all ${
                  isSelected
                    ? 'bg-gray-900 text-white border-gray-900 shadow-md transform scale-105'
                    : isUnavailable
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
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
