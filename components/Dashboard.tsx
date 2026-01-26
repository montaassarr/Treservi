import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  Tooltip, 
  Cell 
} from 'recharts';
import { MoreHorizontal, ArrowUpRight, ArrowRight, Star, Plus, Pencil, Trash2, X, Check, Calendar, User, DollarSign, Clock, Scissors } from 'lucide-react';
import { Barber, Appointment, Comment, ChartData } from '../types';

// Mock Data
const chartData: ChartData[] = [
  { name: 'Mon', value: 12 },
  { name: 'Tue', value: 19 },
  { name: 'Wed', value: 15 },
  { name: 'Thu', value: 25 },
  { name: 'Fri', value: 32 },
  { name: 'Sat', value: 45 },
  { name: 'Sun', value: 28 },
];

const topBarbers: Barber[] = [
  { id: '1', name: 'Elbert', avatarUrl: 'https://picsum.photos/id/64/100/100', rating: 4.9, earnings: '$1.2k' },
  { id: '2', name: 'Joyce', avatarUrl: 'https://picsum.photos/id/65/100/100', rating: 4.8, earnings: '$980' },
  { id: '3', name: 'Glad', avatarUrl: 'https://picsum.photos/id/91/100/100', rating: 4.7, earnings: '$850' },
];

const comments: Comment[] = [
  { id: '1', author: 'Joyce', text: "Great work! When is the next slot?", timeAgo: '09:00 AM', avatar: 'https://picsum.photos/id/103/50/50' },
  { id: '2', author: 'Mike', text: "Can we reschedule my cut?", timeAgo: '09:30 AM', avatar: 'https://picsum.photos/id/204/50/50' },
];

const initialAppointments: Appointment[] = [
  { id: '1', customerName: 'Alex Smith', customerAvatar: 'https://picsum.photos/id/338/50/50', service: 'Fade & Beard Trim', time: '10:00 AM', status: 'Confirmed', amount: '$45' },
  { id: '2', customerName: 'Jordan Lee', customerAvatar: 'https://picsum.photos/id/349/50/50', service: 'Classic Cut', time: '11:30 AM', status: 'Pending', amount: '$30' },
  { id: '3', customerName: 'Casey West', customerAvatar: 'https://picsum.photos/id/355/50/50', service: 'Hair Styling', time: '1:00 PM', status: 'Completed', amount: '$55' },
];

// Service Price Table
const SERVICE_MENU = [
  { name: 'Classic Cut', price: '$30' },
  { name: 'Fade & Beard Trim', price: '$45' },
  { name: 'Hair Styling', price: '$55' },
  { name: 'Hot Towel Shave', price: '$35' },
  { name: 'Kids Cut', price: '$25' },
  { name: 'Hair Coloring', price: '$70' },
  { name: 'Beard Sculpting', price: '$25' },
];

const Dashboard: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  
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

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({
      customerName: '',
      service: SERVICE_MENU[0].name,
      amount: SERVICE_MENU[0].price,
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
        amount: service ? service.price : ''
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
        amount: formData.amount || '$30'
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
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Total Bookings</h3>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white">1,293</div>
                 </div>
                 <span className="flex items-center gap-1 text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full text-xs font-bold">
                    <ArrowUpRight className="rotate-90" size={12} /> 36.8%
                 </span>
              </div>
              
              <div className="flex items-center justify-between mt-8">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <img key={i} src={`https://picsum.photos/id/${100 + i}/50/50`} alt="user" className="w-10 h-10 rounded-full border-2 border-white dark:border-treservi-card-dark" />
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-white dark:border-treservi-card-dark bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500">
                    +8k
                  </div>
                </div>
                <button className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Balance Card */}
            <div className="bg-white dark:bg-treservi-card-dark rounded-pill p-8 shadow-soft-glow relative overflow-hidden">
               <div className="flex justify-between items-start mb-6">
                 <div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Today's Revenue</h3>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white">$256k</div>
                 </div>
                 <span className="flex items-center gap-1 text-treservi-accent bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full text-xs font-bold">
                    <ArrowUpRight size={12} /> 36.8%
                 </span>
              </div>
              <p className="text-gray-400 text-sm mt-8">857 new customers today!</p>
            </div>
          </div>

          {/* Analytics Chart */}
          <div className="bg-white dark:bg-treservi-card-dark rounded-pill p-8 shadow-soft-glow h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">Booking Analytics</h3>
              <select className="bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 text-sm border-none outline-none cursor-pointer">
                <option>Last 7 days</option>
                <option>Last Month</option>
              </select>
            </div>
            <div className="flex-1 w-full min-h-0">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} onMouseMove={(state) => {
                   if (state.isTooltipActive) setActiveIndex(state.activeTooltipIndex ?? null);
                   else setActiveIndex(null);
                 }}>
                   <XAxis 
                     dataKey="name" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                     dy={10}
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
          <div className="bg-white dark:bg-treservi-card-dark rounded-pill p-8 shadow-soft-glow">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">Upcoming Appointments</h3>
              <div className="flex items-center gap-2">
                 <button onClick={handleAddNew} className="flex items-center gap-2 bg-treservi-accent hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-neon-glow transition-all transform hover:scale-105">
                   <Plus size={16} /> <span className="hidden sm:inline">New Appointment</span>
                 </button>
                 <button className="text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white px-3 py-2">View all</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-gray-400 text-sm border-b border-gray-100 dark:border-gray-800">
                    <th className="pb-4 font-normal pl-4">Customer</th>
                    <th className="pb-4 font-normal">Service</th>
                    <th className="pb-4 font-normal">Time</th>
                    <th className="pb-4 font-normal">Status</th>
                    <th className="pb-4 font-normal text-right">Amount</th>
                    <th className="pb-4 font-normal pr-4 text-right">Actions</th>
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
        <div className="space-y-8">
          
          {/* Top Barbers */}
          <div className="bg-black text-white dark:bg-treservi-card-dark rounded-pill p-8 shadow-soft-glow h-[420px] relative flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-xl">Top Barbers</h3>
              <MoreHorizontal className="text-gray-500 cursor-pointer" />
            </div>

            {/* Circular Progress Placeholder */}
            <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="80" fill="transparent" stroke="#333" strokeWidth="24" />
                <circle cx="96" cy="96" r="80" fill="transparent" stroke="#22C55E" strokeWidth="24" strokeDasharray="502" strokeDashoffset="100" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-3xl font-bold">12.5%</span>
                 <span className="text-xs text-gray-400">Growth</span>
              </div>
              <div className="absolute -top-2 right-4 bg-white text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                 Target
              </div>
            </div>
            
            <div className="space-y-4">
              {topBarbers.map(barber => (
                <div key={barber.id} className="flex items-center justify-between p-3 bg-white/10 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <img src={barber.avatarUrl} alt={barber.name} className="w-10 h-10 rounded-full border border-white/20" />
                    <div>
                      <p className="text-sm font-bold">{barber.name}</p>
                      <div className="flex items-center text-xs text-yellow-400">
                         <Star size={10} fill="currentColor" /> {barber.rating}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-treservi-accent">{barber.earnings}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Comments */}
          <div className="bg-white dark:bg-treservi-card-dark rounded-pill p-8 shadow-soft-glow">
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
          </div>

          {/* Promotional Card */}
          <div className="bg-gradient-to-br from-treservi-accent to-green-700 rounded-pill p-8 shadow-neon-glow text-white relative overflow-hidden">
             <div className="relative z-10">
               <h3 className="font-bold text-2xl mb-2">Pro Features</h3>
               <p className="text-sm opacity-90 mb-6">Upgrade to manage multi-location salons.</p>
               <button className="bg-white text-green-700 px-6 py-3 rounded-full font-bold text-sm hover:scale-105 transition-transform">
                 View Plans
               </button>
             </div>
             {/* Decorative Background Elements */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
             <div className="absolute bottom-0 left-0 w-24 h-24 bg-black opacity-10 rounded-full blur-xl transform -translate-x-5 translate-y-5"></div>
          </div>

        </div>
      </div>

      {/* Appointment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-treservi-card-dark w-full max-w-md rounded-pill shadow-2xl p-6 lg:p-8 animate-in fade-in zoom-in duration-200">
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
                        <option key={idx} value={s.name}>{s.name} ({s.price})</option>
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
                      placeholder="$0.00"
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