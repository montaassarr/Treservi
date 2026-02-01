import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { getStaffAvatar } from '../utils/avatarGenerator';

interface Appointment {
  id: string;
  customer_name: string;
  appointment_time: string;
  service_id: string;
  staff_id: string;
  status: string;
  amount?: number;
  duration?: number;
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
  const [direction, setDirection] = useState(0);

  // Time slots from 8 AM to 8 PM
  const timeSlots = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 8;
    return {
      hour,
      label: hour <= 12 ? `${hour}:00 ${hour < 12 ? 'AM' : 'PM'}` : `${hour - 12}:00 PM`,
    };
  });

  const loadAppointments = async (date: Date) => {
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
          staff:staff_id(full_name, avatar_url),
          service:service_id(name, duration)
        `)
        .eq('appointment_date', dateKey)
        .order('appointment_time', { ascending: true });

      const { data, error } =
        userRole === 'owner'
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
    loadAppointments(currentDate);
  }, [currentDate, salonId, userRole, userId]);

  // Real-time updates
  useEffect(() => {
    if (!supabase || !salonId) return;

    const channel = supabase
      .channel('daily-schedule-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: userRole === 'owner' ? `salon_id=eq.${salonId}` : `staff_id=eq.${userId}`,
        },
        () => {
          loadAppointments(currentDate);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [salonId, userRole, userId, currentDate]);

  const navigateDay = (dir: number) => {
    setDirection(dir);
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + dir);
    setCurrentDate(newDate);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold) {
      navigateDay(-1);
    } else if (info.offset.x < -threshold) {
      navigateDay(1);
    }
  };

  const formatDateHeader = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const getYesterdayLabel = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('en-US', { month: 'long' });
  };

  const getTomorrowLabel = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-US', { month: 'long' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getTimePosition = (time: string) => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    const startHour = 8;
    return (hours - startHour) * 80 + (minutes / 60) * 80;
  };

  const getCardHeight = (duration?: number) => {
    const mins = duration || 30;
    return Math.max((mins / 60) * 80, 60);
  };

  const isNextAppointment = (apt: Appointment) => {
    const now = new Date();
    if (!isToday(currentDate)) return false;

    const [hours, minutes] = apt.appointment_time.split(':').map(Number);
    const aptTime = new Date(currentDate);
    aptTime.setHours(hours, minutes, 0, 0);

    return aptTime > now && appointments.findIndex(a => {
      const [h, m] = a.appointment_time.split(':').map(Number);
      const t = new Date(currentDate);
      t.setHours(h, m, 0, 0);
      return t > now;
    }) === appointments.indexOf(apt);
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />

      {/* Main Container - Proper sizing on all devices */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-[calc(100%-2rem)] max-w-lg sm:max-w-xl md:max-w-2xl h-[80vh] max-h-[700px] rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(180deg, #FFF9F0 0%, #FFF5E6 100%)',
        }}
      >
        {/* Header - Compact on mobile with better spacing */}
        <div className="relative z-10 px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-3 sm:gap-4">
          {/* Yesterday Pill */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigateDay(-1)}
            className="flex items-center justify-center gap-1 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-2.5 bg-white rounded-full shadow-md shadow-orange-900/5 text-[#8B7355] font-medium text-xs sm:text-sm hover:shadow-lg transition-shadow min-w-[70px] sm:min-w-[100px]"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">{getYesterdayLabel()}</span>
            <span className="sm:hidden">Prev</span>
          </motion.button>

          {/* Current Date */}
          <div className="text-center flex-1 px-2">
            <h2 className="text-lg sm:text-2xl font-bold text-[#1F1F1F] tracking-tight">
              {formatDateHeader(currentDate)}
            </h2>
            {isToday(currentDate) && (
              <span className="text-[10px] sm:text-xs text-[#8B7355] font-medium">Today</span>
            )}
          </div>

          {/* Tomorrow Pill + Close Button */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigateDay(1)}
              className="flex items-center justify-center gap-1 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-2.5 bg-white rounded-full shadow-md shadow-orange-900/5 text-[#8B7355] font-medium text-xs sm:text-sm hover:shadow-lg transition-shadow min-w-[70px] sm:min-w-[100px]"
            >
              <span className="hidden sm:inline">{getTomorrowLabel()}</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight size={16} />
            </motion.button>

            {/* Close Button */}
            {onClose && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-10 h-10 bg-white rounded-full shadow-md shadow-orange-900/5 flex items-center justify-center text-[#1F1F1F] font-bold text-lg hover:shadow-lg transition-shadow"
              >
                ×
              </motion.button>
            )}
          </div>
        </div>

        {/* Timeline Content */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="h-[calc(100%-80px)] overflow-y-auto overflow-x-hidden px-2 sm:px-6 pb-20 sm:pb-6"
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentDate.toDateString()}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
              }}
              className="relative"
            >
              {/* Time Grid */}
              <div className="relative" style={{ minHeight: '960px' }}>
                {/* Time Labels & Grid Lines */}
                {timeSlots.map((slot, idx) => (
                  <div
                    key={slot.hour}
                    className="absolute left-0 right-0 flex items-start"
                    style={{ top: idx * 80 }}
                  >
                    {/* Time Label */}
                    <div className="w-14 sm:w-20 flex-shrink-0 pr-2 sm:pr-4 text-right">
                      <span
                        className="text-xs sm:text-sm text-[#8B7355] font-medium"
                        style={{ fontFamily: 'Georgia, serif' }}
                      >
                        {slot.label}
                      </span>
                    </div>

                    {/* Dotted Line */}
                    <div className="flex-1 border-t-2 border-dotted border-orange-200/50 mt-2" />
                  </div>
                ))}

                {/* Appointments Area */}
                <div className="absolute left-14 sm:left-20 right-0 top-0" style={{ minHeight: '960px' }}>
                  {loading ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-200 border-t-[#8B7355]" />
                    </div>
                  ) : appointments.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute left-1/2 top-40 -translate-x-1/2 text-center"
                    >
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white shadow-lg flex items-center justify-center">
                        <Clock className="w-10 h-10 text-[#8B7355]" />
                      </div>
                      <p className="text-[#1F1F1F] font-bold text-lg">Free Day!</p>
                      <p className="text-[#8B7355] text-sm mt-1">No appointments scheduled</p>
                    </motion.div>
                  ) : (
                    appointments.map((apt, idx) => {
                      const isNext = isNextAppointment(apt);
                      const duration = apt.service?.duration || 30;
                      const topPosition = getTimePosition(apt.appointment_time);
                      const height = getCardHeight(duration);

                      return (
                        <motion.div
                          key={apt.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`absolute left-2 right-4 rounded-3xl overflow-hidden shadow-lg ${isNext
                              ? 'bg-[#1F1F1F] text-white shadow-orange-900/20'
                              : 'bg-white text-[#1F1F1F] shadow-orange-900/5'
                            }`}
                          style={{
                            top: topPosition,
                            height: height,
                            minHeight: 60,
                          }}
                        >
                          <div className="h-full p-4 flex items-center justify-between">
                            {/* Left Content */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-base truncate">
                                {apt.customer_name}
                              </h4>
                              <p
                                className={`text-sm mt-1 truncate ${isNext ? 'text-gray-300' : 'text-[#8B7355]'
                                  }`}
                              >
                                {apt.service?.name || 'Service'} • {duration} min
                              </p>
                              {height > 80 && (
                                <p
                                  className={`text-xs mt-2 ${isNext ? 'text-gray-400' : 'text-[#A89880]'
                                    }`}
                                >
                                  {apt.appointment_time.slice(0, 5)} -{' '}
                                  {(() => {
                                    const [h, m] = apt.appointment_time.split(':').map(Number);
                                    const endMinutes = h * 60 + m + duration;
                                    const endH = Math.floor(endMinutes / 60);
                                    const endM = endMinutes % 60;
                                    return `${endH.toString().padStart(2, '0')}:${endM
                                      .toString()
                                      .padStart(2, '0')}`;
                                  })()}
                                </p>
                              )}
                            </div>

                            {/* Right Side - Avatar Stack */}
                            <div className="flex items-center gap-2">
                              {apt.amount && (
                                <span
                                  className={`text-sm font-bold ${isNext ? 'text-green-400' : 'text-green-600'
                                    }`}
                                >
                                  {apt.amount} DT
                                </span>
                              )}

                              {/* Staff Avatar */}
                              <div className="flex -space-x-2">
                                <div
                                  className={`w-10 h-10 rounded-full border-2 ${isNext ? 'border-[#1F1F1F]' : 'border-white'
                                    } flex items-center justify-center overflow-hidden ${isNext ? 'bg-gray-700' : 'bg-gradient-to-br from-blue-100 to-purple-100'
                                    }`}
                                >
                                  <img
                                    src={apt.staff?.avatar_url || getStaffAvatar(apt.staff?.full_name || 'Staff')}
                                    alt={apt.staff?.full_name || 'Staff'}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Status Indicator */}
                          {isNext && (
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-400 to-green-600" />
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </div>

                {/* Current Time Indicator */}
                {isToday(currentDate) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute left-14 sm:left-20 right-2 sm:right-4 flex items-center z-10"
                    style={{
                      top: (() => {
                        const now = new Date();
                        const hours = now.getHours();
                        const minutes = now.getMinutes();
                        if (hours < 8 || hours > 20) return -100;
                        return (hours - 8) * 80 + (minutes / 60) * 80;
                      })(),
                    }}
                  >
                    <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                    <div className="flex-1 h-0.5 bg-red-500" />
                  </motion.div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Bottom Stats Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-[#FFF5E6] via-[#FFF5E6] to-transparent pt-8">
          <div className="flex justify-center gap-4 sm:gap-8">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-[#1F1F1F]">{appointments.length}</p>
              <p className="text-[10px] sm:text-xs text-[#8B7355]">Appointments</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {appointments.filter((a) => a.status === 'Confirmed').length}
              </p>
              <p className="text-[10px] sm:text-xs text-[#8B7355]">Confirmed</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-[#1F1F1F]">
                {appointments.reduce((sum, a) => sum + (a.amount || 0), 0)} DT
              </p>
              <p className="text-[10px] sm:text-xs text-[#8B7355]">Revenue</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DailyScheduleView;
