import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  Tooltip, 
  Cell 
} from 'recharts';
import { MoreHorizontal, ArrowUpRight, ArrowRight, Star, Plus, Pencil, Trash2, X, Check, Calendar, User, DollarSign, Clock, Scissors } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../services/supabaseClient';
import { StationManager } from './StationManager';
import { Barber, Appointment, Comment, ChartData } from '../types';
import { formatPrice } from '../utils/format';
import { DashboardSkeleton } from './SkeletonLoader';

// Default/placeholder data while loading
const defaultChartData: ChartData[] = [
  { name: 'Mon', value: 0 },
  { name: 'Tue', value: 0 },
  { name: 'Wed', value: 0 },
  { name: 'Thu', value: 0 },
  { name: 'Fri', value: 0 },
  { name: 'Sat', value: 0 },
  { name: 'Sun', value: 0 },
];

const defaultTopBarbers: Barber[] = [];
const defaultComments: Comment[] = [];
const defaultAppointments: Appointment[] = [];

// Service Price Table - Now using numbers for consistency
const SERVICE_MENU = [
  { name: 'Classic Cut', price: 30.0 },
  { name: 'Fade & Beard Trim', price: 45.0 },
  { name: 'Hair Styling', price: 55.0 },
  { name: 'Hot Towel Shave', price: 35.0 },
  { name: 'Kids Cut', price: 25.0 },
  { name: 'Hair Coloring', price: 70.0 },
  { name: 'Beard Sculpting', price: 25.0 },
];

interface DashboardProps {
  userRole?: string;
  // ...existing code...
}

const Dashboard: React.FC<DashboardProps> = ({ userRole = 'owner' }) => {
  const { t } = useLanguage();
  
  // State management
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [salonId, setSalonId] = useState<string>('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'7d' | '30d' | '90d' | '1y'>('7d');
  
  // Data states with default values
  const [chartData, setChartData] = useState<ChartData[]>(defaultChartData);
  const [stats, setStats] = useState({ bookings: 0, revenue: 0 });
  const [topBarbers, setTopBarbers] = useState<Barber[]>(defaultTopBarbers);
  const [comments, setComments] = useState<Comment[]>(defaultComments);
  const [appointments, setAppointments] = useState<Appointment[]>(defaultAppointments);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Appointment>>({
    customerName: '',
    service: '',
    time: '',
    status: 'Pending',
    amount: ''
  });

  // Load data on component mount - Security: Verify owner role and fetch real data
  useEffect(() => {
    let subscription: any;

    const loadDashboardData = async () => {
      try {
        setIsLoadingData(true);
        setDataError(null);

        // Security check: Verify user is owner
        if (!supabase) throw new Error('Database connection failed');

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) throw new Error('Unauthorized access');

        const { data: userData, error: userError } = await supabase
          .from('staff')
          .select('role, salon_id')
          .eq('id', session.user.id)
          .single();

        if (userError || !userData || userData.role !== 'owner') throw new Error('Access denied: Not an owner');
        setSalonId(userData.salon_id);

        const calculateStartDate = () => {
          const now = new Date();
          switch(dateFilter) {
            case '7d': now.setDate(now.getDate() - 7); break;
            case '30d': now.setDate(now.getDate() - 30); break;
            case '90d': now.setDate(now.getDate() - 90); break;
            case '1y': now.setFullYear(now.getFullYear() - 1); break;
          }
          return now.toISOString();
        };

        // Fetch All Stats Data (Aggregated)
        const { data: statsData, error: statsError } = await supabase
          .from('appointments')
          .select('amount, appointment_date, status')
          .eq('salon_id', userData.salon_id)
          .gte('appointment_date', calculateStartDate())
          .neq('status', 'Cancelled');

        if (statsError) throw statsError;

        // Calculate Totals
        const totalBookings = statsData.length;
        const totalRevenue = statsData.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        setStats({ bookings: totalBookings, revenue: totalRevenue });

        // Calculate Chart Data (Group by Day)
        const groupedData = statsData.reduce((acc: any, curr) => {
          const date = curr.appointment_date; // YYYY-MM-DD
          // Format Date to Day Name (e.g., "Mon") if 7d, or "DD MMM" otherwise
          const d = new Date(date);
          const key = dateFilter === '7d' 
            ? d.toLocaleDateString('en-US', { weekday: 'short' }) 
            : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
          
          acc[key] = (acc[key] || 0) + 1; // Count bookings
          return acc;
        }, {});

        // Fill chart data structure
        const newChartData = Object.keys(groupedData).map(key => ({
            name: key,
            value: groupedData[key]
        }));
        
        // If empty (no assignments), provide at least placeholders or empty state
        setChartData(newChartData.length ? newChartData : defaultChartData);

        // Fetch Staff & Calculate Performance
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .eq('salon_id', userData.salon_id)
          .eq('status', 'Active');

        if (staffData) {
            // Group stats by staff_id
            const staffStats: Record<string, { count: number; revenue: number }> = {};
            statsData.forEach((apt: any) => {
                const sid = apt.staff_id;
                if (!sid) return;
                if (!staffStats[sid]) staffStats[sid] = { count: 0, revenue: 0 };
                staffStats[sid].count++;
                staffStats[sid].revenue += (Number(apt.amount) || 0);
            });

            const rankedStaff = staffData.map((s: any) => ({
                id: s.id,
                name: s.full_name,
                avatarUrl: s.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.full_name)}&background=random`,
                rating: 5.0, // Placeholder
                earnings: formatPrice(staffStats[s.id]?.revenue || 0),
                clientCount: staffStats[s.id]?.count || 0
            })).sort((a, b) => {
                // Sort by revenue desc
                const revA = parseFloat(a.earnings.replace(/[^0-9.]/g, ''));
                const revB = parseFloat(b.earnings.replace(/[^0-9.]/g, ''));
                return revB - revA;
            }).slice(0, 4);
            
            setTopBarbers(rankedStaff);
        }

        // Fetch Recent Appointments (Limit 10)
        const { data: listData, error: listError } = await supabase
          .from('appointments')
          .select('*')
          .eq('salon_id', userData.salon_id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (listData) {
          const transformedAppointments: Appointment[] = listData.map((apt: any) => ({
            id: apt.id,
            customerName: apt.customer_name,
            customerAvatar: apt.customer_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(apt.customer_name)}&background=random`,
            service: 'Service', // Join fetching usually better, keeping simple for now
            time: apt.appointment_time || '00:00',
            status: apt.status,
            amount: formatPrice(apt.amount)
          }));
          setAppointments(transformedAppointments);
        }

        setIsLoadingData(false);
      } catch (error: any) {
        console.error('Dashboard data loading error:', error);
        setDataError(error.message);
        setIsLoadingData(false);
      }
    };

    if (userRole === 'owner') {
      loadDashboardData();
    
       // Realtime Subscription
       subscription = supabase
       .channel('dashboard-realtime')
       .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
         loadDashboardData(); // Refresh all data on any change
       })
       .subscribe();
    }

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [userRole, dateFilter]); // Re-run when filter changes

  // Security: Prevent staff from accessing this component
  if (userRole !== 'owner') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-white dark:bg-treservi-card-dark rounded-[32px] shadow-soft-glow">
          <h2 className="text-2xl font-bold mb-2 text-red-600">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingData) {
    return <DashboardSkeleton />;
  }

  // Error state
  if (dataError) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-[32px] border border-red-200 dark:border-red-800">
          <h2 className="text-2xl font-bold mb-2 text-red-600">Error Loading Dashboard</h2>
          <p className="text-red-600 dark:text-red-400 mb-4">{dataError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({
      customerName: '',
      service: SERVICE_MENU[0].name,
      amount: formatPrice(SERVICE_MENU[0].price),
      time: '09:00 AM',
      status: 'Pending',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (apt: Appointment) => {
    setEditingId(apt.id);
    setFormData(apt);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      setAppointments(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const serviceName = e.target.value;
    const service = SERVICE_MENU.find(s => s.name === serviceName);
    setFormData({
        ...formData,
        service: serviceName,
        amount: service ? formatPrice(service.price) : ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      // Update existing
      setAppointments(prev => prev.map(a => 
        a.id === editingId 
          ? { ...a, ...formData } as Appointment 
          : a
      ));
    } else {
      // Create new
      const newApt: Appointment = {
        id: Date.now().toString(),
        customerName: formData.customerName || 'New Client',
        customerAvatar: `https://picsum.photos/id/${Math.floor(Math.random() * 500) + 10}/50/50`, // Random avatar
        service: formData.service || 'Classic Cut',
        time: formData.time || '09:00 AM',
        status: (formData.status as any) || 'Pending',
        amount: formData.amount || formatPrice(30)
      };
      setAppointments(prev => [newApt, ...prev]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 lg:p-10 w-full max-w-[1600px] mx-auto space-y-8 relative">
      
      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Top Left: Overview & Stats */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Top Row Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Total Bookings Card */}
            <div className="bg-white dark:bg-treservi-card-dark rounded-pill p-8 shadow-soft-glow relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{t('dashboard.totalBookings')}</h3>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white">
                        {stats.bookings.toLocaleString()}
                    </div>
                 </div>
                 <span className="flex items-center gap-1 text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full text-xs font-bold">
                    <ArrowUpRight className="rotate-90" size={12} /> --%
                 </span>
              </div>
              
              <div className="flex items-center justify-between mt-8">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-treservi-card-dark bg-gray-200 dark:bg-gray-700" />
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-white dark:border-treservi-card-dark bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500">
                    ...
                  </div>
                </div>
              </div>
            </div>

            {/* Balance Card */}
            <div className="bg-white dark:bg-treservi-card-dark rounded-[32px] p-8 shadow-soft-glow relative overflow-hidden">
               <div className="flex justify-between items-start mb-6">
                 <div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">{t('dashboard.todayRevenue')}</h3>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white">
                        {formatPrice(stats.revenue)}
                    </div>
                 </div>
                 <span className="flex items-center gap-1 text-treservi-accent bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full text-xs font-bold">
                    <ArrowUpRight size={12} /> --%
                 </span>
              </div>
              <p className="text-gray-400 text-sm mt-8">{stats.bookings} {t('dashboard.newCustomers')}</p>
            </div>
          </div>

          {/* Analytics Chart */}
          <div className="bg-white dark:bg-treservi-card-dark rounded-[32px] p-8 shadow-soft-glow h-[400px] min-h-[320px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">{t('dashboard.bookingAnalytics')}</h3>
              <select 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 text-sm border-none outline-none cursor-pointer"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last Month</option>
                <option value="90d">Last 3 Months</option>
                <option value="1y">Last Year</option>
              </select>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height={260}>
                 <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }} onMouseMove={(state) => {
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
                     {chartData.map((entry, index) => (
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

          {/* Appointments Table */}
          <div className="bg-white dark:bg-treservi-card-dark rounded-[32px] p-8 shadow-soft-glow">
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
                        <div className="flex items-center gap-3">
                          <img src={apt.customerAvatar} className="w-10 h-10 rounded-full object-cover" alt={apt.customerName} />
                          <span className="font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{apt.customerName}</span>
                        </div>
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
                      <td className="py-4 text-right font-bold whitespace-nowrap">{apt.amount}</td>
                      <td className="py-4 pr-4 text-right rounded-r-2xl">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

        </div>

        {/* Right Sidebar: Top Barbers & Comments */}
        {userRole === 'owner' && (
        <div className="space-y-8">
          
          {/* Top Barbers */}
          <div className="bg-black text-white dark:bg-treservi-card-dark rounded-[32px] p-8 shadow-soft-glow h-auto relative flex flex-col justify-between min-h-[420px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">{t('dashboard.topBarbers')}</h3>
              <MoreHorizontal className="text-gray-500 cursor-pointer" />
            </div>

            {/* List Only - No Circular Graph */}
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {topBarbers.length === 0 ? (
                  <div className="text-gray-500 text-center py-10">No data available</div>
              ) : (
                topBarbers.map(barber => (
                    <div key={barber.id} className="flex items-center justify-between p-4 bg-white/10 rounded-2xl border border-white/5 hover:bg-white/15 transition-colors">
                    <div className="flex items-center gap-3">
                        <img src={barber.avatarUrl} alt={barber.name} className="w-12 h-12 rounded-full border-2 border-white/20" />
                        <div>
                        <p className="text-base font-bold">{barber.name}</p>
                        <div className="text-sm font-medium text-gray-400">
                            {(barber as any).clientCount} Clients
                        </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-base font-bold text-treservi-accent">
                            {barber.earnings}
                        </div>
                    </div>
                    </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Comments - Removed as per user request */}
          {/* <div className="bg-white dark:bg-treservi-card-dark rounded-[32px] p-8 shadow-soft-glow">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">Comments</h3>
            </div>
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-3xl rounded-tl-none relative">
                   <div className="flex items-center gap-3 mb-2">
                      <img src={comment.avatar} alt="author" className="w-8 h-8 rounded-full" />
                      <div>
                        <h4 className="text-sm font-bold">{comment.author}</h4>
                        <span className="text-xs text-gray-400">{comment.timeAgo}</span>
                      </div>
                   </div>
                   <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed pl-11">
                      {comment.text}
                   </p>
                </div>
              ))}
            </div>
          </div> */}

          {/* Station Manager / Live Salon Map - Made Full Width */}
          <div className="w-full">
             {salonId && <StationManager salonId={salonId} userRole="owner" />}
          </div>

        </div>
        )}
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
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
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
                      {SERVICE_MENU.map((s, idx) => (
                        <option key={idx} value={s.name}>{s.name} ({formatPrice(s.price)})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                   <label className="text-sm font-medium ml-2 text-gray-500">Amount</label>
                   <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="text" 
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      placeholder="0 TND"
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
                      type="text" 
                      required
                      value={formData.time}
                      onChange={(e) => setFormData({...formData, time: e.target.value})}
                      placeholder="10:00 AM"
                      className="w-full bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-treservi-accent focus:bg-white dark:focus:bg-black rounded-full py-3 pl-10 pr-4 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium ml-2 text-gray-500">Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    className="w-full bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-treservi-accent focus:bg-white dark:focus:bg-black rounded-full py-3 px-4 outline-none transition-all appearance-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-full font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 rounded-full bg-treservi-accent text-white font-bold shadow-neon-glow hover:scale-105 transition-transform"
                >
                  {editingId ? 'Save Changes' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;