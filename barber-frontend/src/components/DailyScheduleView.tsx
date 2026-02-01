import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar, Clock } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { getStaffAvatar } from '../utils/avatarGenerator';

interface Appointment {
  id: string;
  customer_name: string;
  appointment_time: string;
  status: string;
  amount?: number;
  service?: { name: string; duration?: number };
  staff?: { full_name: string; avatar_url?: string };
}

interface DailyScheduleViewProps {
  salonId: string;
  userRole?: 'owner' | 'staff';
  userId?: string;
  onClose?: () => void;
}

const DailyScheduleView: React.FC<DailyScheduleViewProps> = ({
  salonId,
  userRole = 'owner',
  userId,
  onClose,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAppointments = async (date: Date) => {
    if (!supabase || !salonId) return;
    setLoading(true);
    try {
      const dateKey = date.toLocaleDateString('en-CA');
      const query = supabase
        .from('appointments')
        .select(`
          id, customer_name, appointment_time, status, amount,
          staff:staff_id(full_name, avatar_url),
          service:service_id(name, duration)
        `)
        .eq('appointment_date', dateKey)
        .order('appointment_time', { ascending: true });

      const { data } = userRole === 'owner'
        ? await query.eq('salon_id', salonId)
        : await query.eq('staff_id', userId);

      if (data) setAppointments(data as any);
    } catch (err) {
      console.error('Error loading appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments(currentDate);
  }, [currentDate, salonId]);

  const navigateDay = (dir: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + dir);
    setCurrentDate(newDate);
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => navigateDay(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {formatDate(currentDate)}
            </h2>
            <p className="text-xs text-gray-500">
              {currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <button
            onClick={() => navigateDay(1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <ChevronRight size={20} />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No appointments</p>
              <p className="text-gray-400 text-sm">This day is free</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                >
                  {/* Time */}
                  <div className="text-center min-w-[60px]">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatTime(apt.appointment_time)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {apt.service?.duration || 30} min
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {apt.customer_name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {apt.service?.name || 'Service'}
                    </p>
                  </div>

                  {/* Staff Avatar */}
                  <img
                    src={apt.staff?.avatar_url || getStaffAvatar(apt.staff?.full_name || 'Staff')}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover"
                  />

                  {/* Amount */}
                  {apt.amount && (
                    <span className="text-sm font-bold text-emerald-600">
                      {apt.amount} DT
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex justify-around text-center">
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{appointments.length}</p>
              <p className="text-xs text-gray-500">Bookings</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-600">
                {appointments.reduce((sum, a) => sum + (a.amount || 0), 0)} DT
              </p>
              <p className="text-xs text-gray-500">Revenue</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyScheduleView;
