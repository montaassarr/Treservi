import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const today = new Date();
  const dateKey = today.toLocaleDateString('en-CA', { timeZone: 'Africa/Tunis' });

  const loadTodayAppointments = async () => {
    if (!supabase || !salonId) return;
    
    setLoading(true);
    try {
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
        setTodayAppointments(data as any);
      }
    } catch (err) {
      console.error('Error loading today appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      loadTodayAppointments();
    }
  }, [isExpanded, salonId, userRole, userId]);

  // Real-time updates
  useEffect(() => {
    if (!supabase || !salonId || !isExpanded) return;

    const channel = supabase
      .channel('calendar-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: userRole === 'owner'
          ? `salon_id=eq.${salonId}`
          : `staff_id=eq.${userId}`,
      }, () => {
        loadTodayAppointments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [salonId, userRole, userId, isExpanded]);

  const formatTime = (time: string) => {
    if (!time) return '';
    return time.slice(0, 5); // HH:MM
  };

  return (
    <>
      {/* Mini Calendar Button */}
      <button
        onClick={() => setIsExpanded(true)}
        className="relative bg-white dark:bg-treservi-card-dark rounded-2xl p-4 shadow-soft-glow hover:shadow-lg transition-all group border border-gray-100 dark:border-gray-800"
        title="View Today's Schedule"
      >
        <div className="flex items-center gap-3">
          <div className="bg-treservi-accent/10 rounded-xl p-3 group-hover:bg-treservi-accent/20 transition-colors">
            <CalendarIcon className="w-6 h-6 text-treservi-accent" />
          </div>
          <div className="text-left">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Today</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{today.getDate()}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {today.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
        {todayAppointments.length > 0 && (
          <div className="absolute -top-2 -right-2 bg-treservi-accent text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ring-2 ring-white dark:ring-treservi-card-dark">
            {todayAppointments.length}
          </div>
        )}
      </button>

      {/* Expanded Calendar Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-treservi-card-dark rounded-[32px] shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-in zoom-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-treservi-card-dark z-10">
              <div className="flex items-center gap-3">
                <div className="bg-treservi-accent/10 rounded-xl p-2">
                  <CalendarIcon className="w-5 h-5 text-treservi-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Today's Schedule
                  </h2>
                  <p className="text-sm text-gray-500">
                    {today.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Appointments List */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-treservi-accent"></div>
                </div>
              ) : todayAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No appointments today</p>
                  <p className="text-sm text-gray-400 mt-1">Enjoy your free time!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/10 hover:border-treservi-accent transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="bg-treservi-accent/10 rounded-xl px-3 py-2 min-w-[70px] text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Time</p>
                            <p className="text-lg font-bold text-treservi-accent">
                              {formatTime(apt.appointment_time)}
                            </p>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {apt.customer_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                              <span>{(apt as any).service?.name || 'Service'}</span>
                              <span>•</span>
                              <span>{(apt as any).staff?.full_name || 'Staff'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
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
                            <p className="text-sm font-bold text-gray-900 dark:text-white mt-2">
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

            {/* Footer Stats */}
            {todayAppointments.length > 0 && (
              <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/5">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {todayAppointments.length}
                    </p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {todayAppointments.filter(a => a.status === 'Confirmed').length}
                    </p>
                    <p className="text-xs text-gray-500">Confirmed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {todayAppointments.filter(a => a.status === 'Pending').length}
                    </p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MiniCalendar;
