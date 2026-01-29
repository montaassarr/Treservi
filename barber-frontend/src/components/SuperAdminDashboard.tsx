import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  Tooltip, 
  Cell 
} from 'recharts';
import { MoreHorizontal, ArrowUpRight, Plus, Pencil, Trash2, X, Store, User, DollarSign, Mail } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import ResponsiveGrid from './ResponsiveGrid';
import { formatPrice } from '../utils/format';

interface SalonStats {
  id: string;
  name: string;
  slug: string;
  owner_email: string; 
  status: 'active' | 'suspended' | 'cancelled';
  subscription_plan: string;
  total_revenue: number;
  staff_count: number;
  appointment_count: number;
  created_at: string;
}

interface ChartData {
  name: string;
  value: number;
}

const SuperAdminDashboard: React.FC = () => {
  const [globalStats, setGlobalStats] = useState({
    total_salons: 0,
    active_salons: 0,
    total_revenue: 0,
    total_appointments: 0,
    total_staff: 0
  });
  
  const [salons, setSalons] = useState<SalonStats[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedSalonForReset, setSelectedSalonForReset] = useState<SalonStats | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    owner_email: '',
    status: 'active',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch Salons
      const { data: salonsData, error: salonsError } = await supabase
        .from('salons')
        .select('*');

      if (salonsError) throw salonsError;

      const richSalons = await Promise.all(salonsData.map(async (salon) => {
        const { count: staffCount } = await supabase.from('staff').select('id', { count: 'exact', head: true }).eq('salon_id', salon.id);
        const { count: apptCount } = await supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('salon_id', salon.id);
        const { data: owner } = await supabase.from('staff').select('email').eq('salon_id', salon.id).eq('role', 'owner').single();

        return {
          ...salon,
          staff_count: staffCount || 0,
          appointment_count: apptCount || 0,
          owner_email: owner?.email || 'N/A',
          total_revenue: salon.total_revenue || 0,
        };
      }));

      setSalons(richSalons);

      const totalRevenue = richSalons.reduce((acc, s) => acc + (s.total_revenue || 0), 0);
      const activeCnt = richSalons.filter(s => s.status === 'active').length;
      
      setGlobalStats({
        total_salons: richSalons.length,
        active_salons: activeCnt,
        total_revenue: totalRevenue,
        total_appointments: richSalons.reduce((acc, s) => acc + s.appointment_count, 0),
        total_staff: richSalons.reduce((acc, s) => acc + s.staff_count, 0),
      });

    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleDeleteSalon = async (salonId: string) => {
    if (!window.confirm('Are you sure? This will delete the salon, its staff, and all appointments.')) return;

    try {
      await supabase.from('appointments').delete().eq('salon_id', salonId);
      await supabase.from('staff').delete().eq('salon_id', salonId);
      await supabase.from('stations').delete().eq('salon_id', salonId);
      await supabase.from('services').delete().eq('salon_id', salonId);
      const { error } = await supabase.from('salons').delete().eq('id', salonId);

      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error("Error deleting salon:", err);
      alert("Failed to delete salon");
    }
  };

  const handleSaveSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
         await supabase.from('salons').update({
            name: formData.name,
            slug: formData.slug,
            status: formData.status
         }).eq('id', editingId);
      } else {
        const { data: newSalon, error: salonError } = await supabase.from('salons').insert({
            name: formData.name,
            slug: formData.slug,
            status: 'active',
            total_revenue: 0
        }).select().single();

        if (salonError) throw salonError;

        if (formData.owner_email && newSalon) {
            await supabase.from('staff').insert({
                salon_id: newSalon.id,
                email: formData.owner_email,
                full_name: `${formData.name} Owner`,
                role: 'owner',
                specialty: 'Management',
                status: 'Active'
            });
        }
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
        console.error("Error saving salon:", err);
        alert("Error saving salon");
    }
  };

  const openModal = (salon?: SalonStats) => {
    if (salon) {
        setEditingId(salon.id);
        setFormData({
            name: salon.name,
            slug: salon.slug,
            owner_email: salon.owner_email,
            status: salon.status
        });
    } else {
        setEditingId(null);
        setFormData({
            name: '',
            slug: '',
            owner_email: '',
            status: 'active'
        });
    }
    setIsModalOpen(true);
  };

  const openResetPasswordModal = (salon: SalonStats) => {
    setSelectedSalonForReset(salon);
    setNewPassword('');
    setIsResetPasswordModalOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedSalonForReset || !newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      // Find the owner staff record
      const { data: ownerStaff, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('salon_id', selectedSalonForReset.id)
        .eq('role', 'owner')
        .single();

      if (staffError || !ownerStaff) {
        alert('Owner account not found');
        return;
      }

      // Call the reset-staff-password edge function
      const { data, error } = await supabase.functions.invoke('reset-staff-password', {
        body: { 
          staffId: ownerStaff.id, 
          newPassword: newPassword 
        }
      });

      if (error) throw error;

      alert(`Password reset successful!\n\nSalon: ${selectedSalonForReset.name}\nURL: /${selectedSalonForReset.slug}\nEmail: ${selectedSalonForReset.owner_email}\nNew Password: ${newPassword}\n\nPlease share these credentials with the salon owner.`);
      setIsResetPasswordModalOpen(false);
      setNewPassword('');
    } catch (err) {
      console.error('Error resetting password:', err);
      alert('Failed to reset password: ' + (err as any)?.message);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-10 w-full max-w-[1600px] mx-auto space-y-4 sm:space-y-6 md:space-y-8 relative">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
        
        {/* Left Column: Stats & List */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-6 md:space-y-8">
          
          <ResponsiveGrid mobile={1} tablet={2} desktop={3} gap="gap-4 sm:gap-6 md:gap-8">
            
            {/* Total Salons */}
            <div className="bg-white dark:bg-treservi-card-dark rounded-[24px] p-4 sm:p-6 md:p-8 shadow-soft-glow relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                 <div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Total Salons</h3>
                    <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                        {globalStats.total_salons}
                    </div>
                 </div>
                 <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-500">
                    <Store size={24} />
                 </div>
              </div>
              <p className="text-gray-400 text-sm">{globalStats.active_salons} Active</p>
            </div>

            {/* Total Revenue */}
            <div className="bg-white dark:bg-treservi-card-dark rounded-[24px] p-4 sm:p-6 md:p-8 shadow-soft-glow relative overflow-hidden">
               <div className="flex justify-between items-start mb-4">
                 <div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Total Revenue</h3>
                    <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                        {formatPrice(globalStats.total_revenue)}
                    </div>
                 </div>
                 <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full text-green-500">
                    <DollarSign size={24} />
                 </div>
              </div>
            </div>

            {/* Total Staff */}
            <div className="bg-white dark:bg-treservi-card-dark rounded-[24px] p-4 sm:p-6 md:p-8 shadow-soft-glow relative overflow-hidden">
               <div className="flex justify-between items-start mb-4">
                 <div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Total Staff</h3>
                    <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                        {globalStats.total_staff}
                    </div>
                 </div>
                 <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-full text-purple-500">
                    <User size={24} />
                 </div>
              </div>
            </div>

          </ResponsiveGrid>

          {/* Tenants List */}
          <div className="bg-white dark:bg-treservi-card-dark rounded-[24px] p-4 sm:p-6 md:p-8 shadow-soft-glow">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-0 mb-6">
              <h3 className="font-bold text-xl">Tenant Management</h3>
              <button onClick={() => openModal()} className="flex items-center gap-2 bg-treservi-accent hover:bg-green-600 text-white px-4 py-2 rounded-full font-bold shadow-neon-glow transition-all">
                   <Plus size={18} /> Add Tenant
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="text-gray-400 text-sm border-b border-gray-100 dark:border-gray-800">
                    <th className="pb-4 font-normal pl-4">Salon Name</th>
                    <th className="pb-4 font-normal">Slug (URL)</th>
                    <th className="pb-4 font-normal">Owner Email</th>
                    <th className="pb-4 font-normal">Status</th>
                    <th className="pb-4 font-normal text-right">Staff</th>
                    <th className="pb-4 font-normal pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {salons.map((salon) => (
                    <tr key={salon.id} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-4 pl-4 first:rounded-l-2xl last:rounded-r-2xl font-bold">
                        {salon.name}
                      </td>
                      <td className="py-4 text-gray-500">/{salon.slug}</td>
                      <td className="py-4 text-gray-500">{salon.owner_email}</td>
                      <td className="py-4">
                         <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            salon.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                         }`}>
                             {salon.status}
                         </span>
                      </td>
                      <td className="py-4 text-right font-bold">{salon.staff_count}</td>
                      <td className="py-4 pr-4 text-right rounded-r-2xl">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openResetPasswordModal(salon)} className="p-2 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-full" title="Reset Owner Password">
                            <Mail size={16} />
                          </button>
                          <button onClick={() => openModal(salon)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDeleteSalon(salon.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full">
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
      </div>

       {/* Reset Password Modal */}
       {isResetPasswordModalOpen && selectedSalonForReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-treservi-card-dark w-full max-w-md rounded-[32px] shadow-2xl p-8 animate-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-bold">Reset Owner Password</h2>
               <button onClick={() => setIsResetPasswordModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                 <X size={20} />
               </button>
             </div>
             <div className="space-y-4">
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl">
                  <p className="text-sm text-orange-800 dark:text-orange-200 mb-2"><strong>Salon:</strong> {selectedSalonForReset.name}</p>
                  <p className="text-sm text-orange-800 dark:text-orange-200 mb-2"><strong>Owner Email:</strong> {selectedSalonForReset.owner_email}</p>
                  <p className="text-sm text-orange-800 dark:text-orange-200"><strong>URL:</strong> /{selectedSalonForReset.slug}</p>
                </div>
                <div>
                   <label className="text-sm text-gray-500 ml-2">New Password</label>
                   <input 
                      type="text" 
                      required 
                      minLength={6}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 chars)"
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded-full py-3 px-4 outline-none border-transparent focus:border-treservi-accent border"
                   />
                </div>
                <button 
                  onClick={handleResetPassword}
                  className="w-full bg-treservi-accent text-white py-3 rounded-full font-bold shadow-neon-glow hover:scale-105 transition-transform"
                >
                    Reset Password & Show Credentials
                </button>
             </div>
          </div>
        </div>
       )}

       {/* Edit/Add Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-treservi-card-dark w-full max-w-md rounded-[32px] shadow-2xl p-8 animate-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-bold">{editingId ? 'Edit Tenant' : 'Add Tenant'}</h2>
               <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                 <X size={20} />
               </button>
             </div>
             <form onSubmit={handleSaveSalon} className="space-y-4">
                <div>
                   <label className="text-sm text-gray-500 ml-2">Salon Name</label>
                   <input 
                      type="text" 
                      required 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded-full py-3 px-4 outline-none border-transparent focus:border-treservi-accent border"
                   />
                </div>
                <div>
                   <label className="text-sm text-gray-500 ml-2">Slug (URL Path)</label>
                   <input 
                      type="text" 
                      required 
                      value={formData.slug}
                      onChange={e => setFormData({...formData, slug: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded-full py-3 px-4 outline-none border-transparent focus:border-treservi-accent border"
                   />
                </div>
                <div>
                   <label className="text-sm text-gray-500 ml-2">Owner Email</label>
                   <input 
                      type="email" 
                      required 
                      value={formData.owner_email}
                      disabled={!!editingId}
                      onChange={e => setFormData({...formData, owner_email: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded-full py-3 px-4 outline-none border-transparent focus:border-treservi-accent border disabled:opacity-50"
                   />
                </div>
                <button type="submit" className="w-full bg-treservi-accent text-white py-3 rounded-full font-bold shadow-neon-glow hover:scale-105 transition-transform">
                    {editingId ? 'Update Tenant' : 'Create Tenant'}
                </button>
             </form>
          </div>
        </div>
       )}

    </div>
  );
};

export default SuperAdminDashboard;
