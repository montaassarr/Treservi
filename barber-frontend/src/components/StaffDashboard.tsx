import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Cell,
} from 'recharts';
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Calendar,
  User,
  DollarSign,
  Clock,
  Scissors,
  TrendingUp,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../services/supabaseClient';
import { Appointment, AppointmentData, Service, CreateAppointmentInput } from '../types';

import DailyScheduleView from './DailyScheduleView';
import {
  fetchTodayAppointments,
  fetchUpcomingAppointments,
  getStaffAppointmentStats,
  createAppointment,
  updateAppointment,
} from '../services/appointmentService';
import { fetchServices } from '../services/serviceService';

interface StaffDashboardProps {
  staffId: string;
  salonId: string;
  staffName: string;
}

// Mock Data removed in favor of real data

const StaffDashboard: React.FC<StaffDashboardProps> = ({ staffId, salonId, staffName }) => {
  const { t, formatCurrency } = useLanguage();
  
  // State management
  const [isAuthVerified, setIsAuthVerified] = useState(false);
  const [todayAppointments, setTodayAppointments] = useState<AppointmentData[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentData[]>([]);
  const [stats, setStats] = useState({
    today_appointments: 0,
    today_earnings: 0,
    completed_appointments: 0,
    total_earnings: 0,
    chartData: [] as { name: string; value: number }[],
  });
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showScheduleView, setShowScheduleView] = useState(false);

  const [formData, setFormData] = useState<Partial<Appointment>>({
    customerName: '',
    service: '',
    time: '',
    status: 'Pending',
    amount: ''
  });

  // Security: Verify user is staff member and has access to this data
  useEffect(() => {
    const verifyAccess = async () => {
      try {
        if (!supabase) {
          throw new Error('Database connection failed');
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
          throw new Error('Session expired - Please login again');
        }

        // Verify user is staff and matches the staffId
        const { data: userData, error: userError } = await supabase
          .from('staff')
          .select('role, id, salon_id')
          .eq('id', session.user.id)
          .single();

        if (userError || !userData) {
          throw new Error('User data not found');
        }

        if (userData.role !== 'staff') {
          throw new Error('Access denied: This page is for staff only');
        }

        if (userData.id !== staffId) {
          throw new Error('Access denied: Cannot view other staff data');
        }

        setIsAuthVerified(true);
      } catch (err: any) {
        console.error('Auth verification error:', err);
        setAuthError(err.message || 'Authorization failed');
        setLoading(false);
      }
    };

    verifyAccess();
  }, [staffId]);

  const loadData = async () => {
    if (!isAuthVerified) return;
    
    setLoading(true);
    try {
      const [appointmentsRes, upcomingRes, statsRes, servicesRes] = await Promise.all([
        fetchTodayAppointments(staffId),
        fetchUpcomingAppointments(staffId),
        getStaffAppointmentStats(staffId),
        fetchServices(salonId),
      ]);

      if (appointmentsRes.error) throw appointmentsRes.error;
      if (upcomingRes.error) console.error("Error fetching upcoming:", upcomingRes.error); // Non-blocking
      if (statsRes.error) throw statsRes.error;
      if (servicesRes.error) throw servicesRes.error;

      setTodayAppointments(appointmentsRes.data || []);
      setUpcomingAppointments(upcomingRes.data || []);

      // Map for the table view
      const mapped = (upcomingRes.data || []).map((apt: any) => ({
        id: apt.id,
        customerName: apt.customer_name,
        customerFirstName: apt.customer_name.split(' ')[0],
        service: apt.service?.name || 'Unknown Service',
        time: apt.appointment_time?.slice(0, 5) || '00:00',
        status: apt.status,
        amount: apt.amount,
        date: apt.appointment_date // Keep date for sorting/display
      }));
      setAppointments(mapped);

      setStats(statsRes.data || stats);
      setServices(servicesRes.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only load data after auth is verified
    if (isAuthVerified) {
      loadData();
    }

    if (!supabase || !isAuthVerified) return;
    const channel = supabase
      .channel('appointments-staff')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `staff_id=eq.${staffId}`,
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [staffId, salonId, isAuthVerified]);

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({
      customerName: '',
      service: '',
      time: '',
      status: 'Pending',
      amount: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (apt: Appointment) => {
    setEditingId(apt.id);
    setFormData(apt);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setAppointments(appointments.filter(a => a.id !== id));
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const serviceId = e.target.value;
    const service = services.find(s => s.id === serviceId);
    setFormData({
      ...formData,
      service: serviceId,
      amount: service ? `${service.price}` : ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.customerName || !formData.service) return;

      const selectedService = services.find(s => s.id === formData.service);
      const amount = selectedService ? selectedService.price : 0;

      const appointmentInput: CreateAppointmentInput = {
        salon_id: salonId,
        staff_id: staffId,
        service_id: formData.service,
        customer_name: formData.customerName,
        customer_phone: '', // Can add phone field
        appointment_date: new Date().toISOString().split('T')[0], // Default to today
        appointment_time: formData.time || '09:00',
        status: 'Pending', // Enforced Pending status
        amount: amount,
        notes: ''
      };

      if (editingId) {
        // Update existing appointment (including status changes)
        // Only sending needed fields to update
         const updatePayload: any = {
           service_id: formData.service,
           customer_name: formData.customerName,
           appointment_time: formData.time,
           status: formData.status,
           amount: Number(amount)
         };
         
         const { error } = await updateAppointment(editingId, updatePayload);
         if (error) throw new Error(error.message);
      } else {
        const { error } = await createAppointment(appointmentInput);
        if (error) throw new Error(error);
      }
      
      loadData();
      setIsModalOpen(false);
      setSuccess('Appointment request sent for approval');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Auth error - access denied
  if (authError) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-[32px] border border-red-200 dark:border-red-800">
          <h2 className="text-2xl font-bold mb-2 text-red-600">Access Denied</h2>
          <p className="text-red-600 dark:text-red-400 mb-4">{authError}</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading || !isAuthVerified) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-treservi-accent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Verifying access and loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 w-full max-w-[1600px] mx-auto">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Today's Earnings */}
        <div className="bg-white dark:bg-treservi-card-dark rounded-[32px] p-8 shadow-soft-glow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{t('dashboard.todayEarnings')}</h3>
              <div className="text-4xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.today_earnings)}</div>
            </div>
          </div>
          <p className="text-gray-400 text-sm">{stats.today_appointments} {t('common.appointments')}</p>
        </div>

        {/* Total Earnings */}
        <div className="bg-white dark:bg-treservi-card-dark rounded-[32px] p-8 shadow-soft-glow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{t('dashboard.totalEarnings')}</h3>
              <div className="text-4xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.total_earnings)}</div>
            </div>
            <span className="flex items-center gap-1 text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full text-xs font-bold">
              <TrendingUp size={12} /> {t('common.allTime')}
            </span>
          </div>
          <p className="text-gray-400 text-sm">{stats.completed_appointments} {t('dashboard.completed_appointments')}</p>
        </div>

        {/* Completed Count */}
        <div className="bg-white dark:bg-treservi-card-dark rounded-[32px] p-8 shadow-soft-glow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{t('dashboard.completed_today')}</h3>
              <div className="text-4xl font-bold text-gray-900 dark:text-white">{stats.completed_appointments}</div>
            </div>
            <span className="text-treservi-accent bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full text-xs font-bold">
              ✓ {t('common.status')}
            </span>
          </div>
          <p className="text-gray-400 text-sm">{t('dashboard.successfully_completed')}</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-treservi-card-dark rounded-[32px] p-8 shadow-soft-glow h-[400px] min-h-[320px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-xl">{t('dashboard.bookingAnalytics')}</h3>
            <select className="bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 text-sm border-none outline-none cursor-pointer">
              <option>{t('dashboard.last7Days')}</option>
              <option>{t('dashboard.lastMonth')}</option>
            </select>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }} onMouseMove={(state) => {
                if (state.isTooltipActive) setActiveIndex(state.activeTooltipIndex ?? null);
                else setActiveIndex(null);
              }}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-black text-white text-xs py-1 px-3 rounded-full mb-2 shadow-lg">
                          {payload[0].value} bookings
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[20, 20, 20, 20]} barSize={40}>
                  {stats.chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === activeIndex ? '#22C55E' : '#E5E7EB'}
                      className="transition-all duration-300 dark:fill-opacity-20 hover:dark:fill-opacity-100"
                      style={{
                        fill: index === activeIndex ? '#22C55E' : (document.documentElement.classList.contains('dark') ? '#333' : '#E5E7EB')
                      }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Sidebar - Calendar */}
        <div className="space-y-6">
          {/* Today's Schedule Card */}
          <div 
            onClick={() => setShowScheduleView(true)}
            className="bg-white dark:bg-treservi-card-dark rounded-[24px] p-6 shadow-soft-glow cursor-pointer hover:shadow-lg transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{t('dashboard.todaySchedule')}</h3>
                <div className="text-4xl font-bold text-gray-900 dark:text-white">
                  {new Date().getDate()}
                </div>
                <p className="text-gray-400 text-sm mt-1">
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 group-hover:text-treservi-accent transition-colors">
              <Calendar size={16} />
              <span>{t('common.viewAll') || 'View Schedule'}</span>
              <ArrowRight size={14} className="ml-auto group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-treservi-card-dark w-full max-w-4xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden">
            <DailyScheduleView 
              salonId={salonId} 
              userRole="staff"
              userId={staffId}
              onClose={() => setShowScheduleView(false)} 
            />
          </div>
        </div>
      )}

      {/* Appointments Table */}
      <div className="bg-white dark:bg-treservi-card-dark rounded-[32px] p-8 shadow-soft-glow mt-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-xl">{t('dashboard.upcomingAppointments')}</h3>
          <div className="flex items-center gap-2">
            <button onClick={handleAddNew} className="flex items-center gap-2 bg-treservi-accent hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-neon-glow transition-all transform hover:scale-105">
              <Plus size={16} /> <span className="hidden sm:inline">{t('appointments.newAppointment')}</span>
            </button>
            <button className="text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white px-3 py-2">{t('common.viewAll')}</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-400 text-sm border-b border-gray-100 dark:border-gray-800">
                <th className="pb-4 font-normal pl-4">{t('appointments.customer')}</th>
                <th className="pb-4 font-normal">{t('appointments.service')}</th>
                <th className="pb-4 font-normal">{t('appointments.time')}</th>
                <th className="pb-4 font-normal">{t('common.status')}</th>
                <th className="pb-4 font-normal text-right">{t('appointments.amount')}</th>
                <th className="pb-4 font-normal pr-4 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {appointments.map((apt) => (
                <tr key={apt.id} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <td className="py-4 pl-4 first:rounded-l-2xl last:rounded-r-2xl">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{apt.customerFirstName}</span>
                  </td>
                  <td className="py-4 text-gray-500 whitespace-nowrap">{apt.service}</td>
                  <td className="py-4 text-gray-500 whitespace-nowrap">{apt.time}</td>
                  <td className="py-4 whitespace-nowrap">
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-bold
                      ${apt.status === 'Confirmed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}
                      ${apt.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                      ${apt.status === 'Completed' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' : ''}
                    `}>
                      {apt.status}
                    </span>
                  </td>
                  <td className="py-4 text-right font-bold whitespace-nowrap">{formatCurrency(apt.amount)}</td>
                  <td className="py-4 pr-4 text-right rounded-r-2xl">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {apt.status !== 'Completed' && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm('Mark this appointment as Completed?')) {
                                try {
                                    await updateAppointment(apt.id, { status: 'Completed' });
                                    loadData();
                                } catch (err) {
                                    console.error('Failed to complete', err);
                                }
                            }
                          }}
                          className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors"
                          title="Mark as Completed"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(apt)}
                        className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(apt.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Appointment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-treservi-card-dark w-full max-w-md rounded-[32px] shadow-2xl p-6 lg:p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{editingId ? 'Edit Appointment' : 'New Appointment'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium ml-2 text-gray-500">Customer Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="John Doe"
                    className="w-full bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-treservi-accent focus:bg-white dark:focus:bg-black rounded-full py-3 pl-12 pr-4 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium ml-2 text-gray-500">Service</label>
                  <div className="relative">
                    <Scissors className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                    <select
                      required
                      value={formData.service}
                      onChange={handleServiceChange}
                      className="w-full bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-treservi-accent focus:bg-white dark:focus:bg-black rounded-full py-3 pl-10 pr-4 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Select Service</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.price} DT)</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium ml-2 text-gray-500">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">DT</span>
                    <input
                      type="text"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0 DT"
                      className="w-full bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-treservi-accent focus:bg-white dark:focus:bg-black rounded-full py-3 pl-10 pr-4 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium ml-2 text-gray-500">Time</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="time"
                      required
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-treservi-accent focus:bg-white dark:focus:bg-black rounded-full py-3 pl-10 pr-4 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium ml-2 text-gray-500">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-treservi-accent focus:bg-white dark:focus:bg-black rounded-full py-3 px-4 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-full bg-treservi-accent text-white font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Check size={18} /> {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
