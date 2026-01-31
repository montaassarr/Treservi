import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, X, ChevronLeft, ChevronRight, Clock, User, DollarSign } from 'lucide-react';
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
  const [weekStartDate, setWeekStartDate] = useState(getWeekStart(new Date()));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useLanguage();

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate);
      date.setDate(date.getDate() + i);
      days.push(date);
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

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const handlePrevWeek = () => {
    const newDate = new Date(weekStartDate);
    newDate.setDate(newDate.getDate() - 7);
    setWeekStartDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(weekStartDate);
    newDate.setDate(newDate.getDate() + 7);
    setWeekStartDate(newDate);
  };

  const handleSelectDay = (date: Date) => {
    setSelectedDate(new Date(date));
  };

  const weekDays = getWeekDays();
  const selectedDateStr = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const monthYearRange = (() => {
    const start = weekStartDate.toLocaleDateString('en-US', { month: 'long' });
    const end = new Date(weekStartDate);
    end.setDate(end.getDate() + 6);
    const endStr = end.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return `${start} - ${endStr}`;
  })();

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
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">This Week</p>
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
      <div className="bg-white dark:bg-treservi-card-dark rounded-t-[32px] sm:rounded-[32px] shadow-2xl w-full sm:max-w-5xl max-h-[95vh] overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in duration-300 flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-treservi-card-dark z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevWeek}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{monthYearRange}</h2>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Week View + Appointments Layout */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          
          {/* Week Days - Top on Mobile, Left on Desktop */}
          <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-800 p-4 lg:p-6 flex flex-row lg:flex-col gap-2 lg:gap-3 overflow-x-auto lg:overflow-y-auto">
            {weekDays.map((date) => {
              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNum = date.getDate();
              const isTodayFlag = isToday(date);
              const isSelectedFlag = isSelected(date);

              return (
                <button
                  key={date.toDateString()}
                  onClick={() => handleSelectDay(date)}
                  className={`
                    flex-shrink-0 lg:flex-shrink p-3 lg:p-4 rounded-2xl transition-all min-w-20 lg:min-w-full text-center
                    ${isTodayFlag 
                      ? 'bg-treservi-accent text-white shadow-lg ring-2 ring-treservi-accent ring-offset-2 dark:ring-offset-treservi-card-dark' 
                      : isSelectedFlag 
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-treservi-accent' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 border-2 border-transparent'
                    }
                  `}
                >
                  <p className="text-xs font-semibold opacity-75">{dayName}</p>
                  <p className="text-2xl font-bold">{dayNum}</p>
                </button>
              );
            })}
          </div>

          {/* Appointments List - Right Side */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {selectedDateStr}
              </h3>
              <p className="text-sm text-gray-500">
                {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} today
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-treservi-accent"></div>
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No appointments scheduled</p>
                <p className="text-sm text-gray-400 mt-1">This day is completely free!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((apt, idx) => (
                  <div
                    key={apt.id}
                    className="bg-gradient-to-br from-pink-50 to-white dark:from-pink-900/20 dark:to-gray-900/40 rounded-2xl overflow-hidden border border-pink-200 dark:border-pink-800/30 hover:shadow-md transition-all duration-200"
                  >
                    {/* Time Bar */}
                    <div className="h-1 bg-gradient-to-r from-treservi-accent to-pink-500"></div>
                    
                    <div className="p-5 lg:p-6">
                      {/* Top Row: Time and Status */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-treservi-accent/10 rounded-lg px-4 py-2">
                            <p className="text-lg font-bold text-treservi-accent">
                              {formatTime(apt.appointment_time)}
                            </p>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-lg">
                              {apt.customer_name}
                            </p>
                            <p className="text-sm text-gray-500">Client #{idx + 1}</p>
                          </div>
                        </div>
                        <span
                          className={`inline-block px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${
                            apt.status === 'Confirmed'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : apt.status === 'Pending'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : apt.status === 'Completed'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {apt.status}
                        </span>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Service */}
                        <div className="bg-white dark:bg-gray-800/50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">SERVICE</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {(apt as any).service?.name || 'Service'}
                          </p>
                        </div>

                        {/* Staff */}
                        <div className="bg-white dark:bg-gray-800/50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1 flex items-center gap-2">
                            <User size={14} /> STAFF
                          </p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {(apt as any).staff?.full_name || 'Staff'}
                          </p>
                        </div>

                        {/* Amount */}
                        {apt.amount && (
                          <div className="bg-white dark:bg-gray-800/50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1 flex items-center gap-2">
                              <DollarSign size={14} /> AMOUNT
                            </p>
                            <p className="font-bold text-treservi-accent text-lg">
                              {apt.amount} DT
                            </p>
                          </div>
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
