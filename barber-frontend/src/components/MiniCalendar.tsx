import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useLanguage } from '../context/LanguageContext';

interface Appointment {
  id: string;
  customer_name: string;
  appointment_time: string;
  service_id: string;
  staff_id: string;
  status: string;
  amount?: number;
}

interface MiniCalendarProps {
  salonId: string;
  userRole?: 'owner' | 'staff';
  userId?: string;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ salonId, userRole = 'owner', userId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useLanguage();

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const getDaysArray = () => {
    const days = [];
    const total = daysInMonth(currentDate);
    const firstDay = firstDayOfMonth(currentDate);
    
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= total; i++) {
      days.push(i);
    }
    return days;
  };

  const loadAppointmentsForDate = async (date: Date) => {
    if (!supabase || !salonId) return;
    
    setLoading(true);
    try {
      const dateKey = date.toLocaleDateString('en-CA', { timeZone: 'Africa/Tunis' });
      
      const query = supabase
        .from('appointments')
        .select(`
          id,
          customer_name,
          appointment_time,
          service_id,
          staff_id,
          status,
          amount,
          staff:staff_id(full_name),
          service:service_id(name)
        `)
        .eq('appointment_date', dateKey)
        .order('appointment_time', { ascending: true });

      const { data, error } = userRole === 'owner'
        ? await query.eq('salon_id', salonId)
        : await query.eq('staff_id', userId);

      if (!error && data) {
        setAppointments(data as any);
      }
    } catch (err) {
      console.error('Error loading appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      loadAppointmentsForDate(selectedDate);
    }
  }, [selectedDate, isExpanded, salonId, userRole, userId]);

  // Real-time updates
  useEffect(() => {
    if (!supabase || !salonId || !isExpanded) return;

    const channel = supabase
      .channel('calendar-realtime-' + selectedDate.toDateString())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: userRole === 'owner'
          ? `salon_id=eq.${salonId}`
          : `staff_id=eq.${userId}`,
      }, () => {
        loadAppointmentsForDate(selectedDate);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [salonId, userRole, userId, isExpanded, selectedDate]);

  const formatTime = (time: string) => {
    if (!time) return '';
    return time.slice(0, 5);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() &&
           currentDate.getMonth() === today.getMonth() &&
           currentDate.getFullYear() === today.getFullYear();
  };

  const isSelected = (day: number) => {
    return day === selectedDate.getDate() &&
           currentDate.getMonth() === selectedDate.getMonth() &&
           currentDate.getFullYear() === selectedDate.getFullYear();
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleSelectDay = (day: number) => {
    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const selectedDateStr = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = getDaysArray();

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="relative bg-white dark:bg-treservi-card-dark rounded-2xl p-4 shadow-soft-glow hover:shadow-lg transition-all group border border-gray-100 dark:border-gray-800"
        title="View Calendar"
      >
        <div className="flex items-center gap-3">
          <div className="bg-treservi-accent/10 rounded-xl p-3 group-hover:bg-treservi-accent/20 transition-colors">
            <CalendarIcon className="w-6 h-6 text-treservi-accent" />
          </div>
          <div className="text-left">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Today</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{new Date().getDate()}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-treservi-card-dark rounded-t-[32px] sm:rounded-[32px] shadow-2xl w-full sm:max-w-3xl max-h-[95vh] overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in duration-300 flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-treservi-card-dark z-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{monthName}</h2>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Calendar Grid - Mobile and Desktop Layout */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          
          {/* Calendar Picker - Left Side */}
          <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-800 p-6 flex flex-col">
            
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="font-semibold text-gray-900 dark:text-white">
                {currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Day Names */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2 flex-1">
              {days.map((day, idx) => (
                <button
                  key={idx}
                  onClick={() => day && handleSelectDay(day)}
                  disabled={!day}
                  className={`
                    aspect-square rounded-full text-sm font-bold transition-all
                    ${!day ? 'invisible' : ''}
                    ${isToday(day!) ? 'bg-treservi-accent text-white ring-2 ring-treservi-accent ring-offset-1' : ''}
                    ${isSelected(day!) && !isToday(day!) ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : ''}
                    ${!isSelected(day!) && !isToday(day!) ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700' : ''}
                    disabled:cursor-default
                  `}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Appointments List - Right Side */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                {selectedDateStr}
              </h3>
              <p className="text-sm text-gray-500">
                {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-treservi-accent"></div>
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No appointments</p>
                <p className="text-sm text-gray-400 mt-1">This day is free!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="bg-gradient-to-br from-pink-100 to-pink-50 dark:from-pink-900/30 dark:to-pink-900/10 rounded-2xl p-4 border border-pink-200 dark:border-pink-800/30 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-white dark:bg-gray-800 rounded-lg px-3 py-1 text-center min-w-[60px]">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                              {formatTime(apt.appointment_time)}
                            </p>
                          </div>
                          <p className="font-bold text-gray-900 dark:text-white">
                            {apt.customer_name}
                          </p>
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-semibold">{(apt as any).service?.name || 'Service'}</span>
                          </p>
                          <p className="text-gray-600 dark:text-gray-400">
                            {(apt as any).staff?.full_name || 'Staff'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${
                            apt.status === 'Confirmed'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : apt.status === 'Pending'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {apt.status}
                        </span>
                        {apt.amount && (
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {apt.amount} DT
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiniCalendar;
