import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  Tooltip, 
  Cell 
} from 'recharts';
import { MoreHorizontal, ArrowUpRight, Plus, Pencil, Trash2, X, Store, User, DollarSign, Mail, AlertCircle } from 'lucide-react';
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

interface FormData {
  name: string;
  slug: string;
  owner_name: string;
  owner_email: string;
  owner_password?: string;
  status: 'active' | 'suspended' | 'cancelled';
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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    owner_name: '',
    owner_email: '',
    owner_password: '',
    status: 'active',
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Clear messages after 3s
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const fetchData = async () => {
    try {
      const { data: salonsData, error: salonsError } = await supabase
        .from('salons')
        .select('*');

      if (salonsError) throw salonsError;

      const richSalons = await Promise.all(salonsData.map(async (salon) => {
        const { count: staffCount } = await supabase.from('staff').select('id', { count: 'exact', head: true }).eq('salon_id', salon.id);
        const { count: apptCount } = await supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('salon_id', salon.id);
        const { data: owner } = await supabase.from('staff').select('email, full_name').eq('salon_id', salon.id).eq('role', 'owner').single();

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
      setError('Failed to load salons');
    }
  };

  const handleDeleteSalon = async (salonId: string, salonSlug: string) => {
    if (salonSlug === 'hamdisalon') {
      setError('Cannot delete the main salon (hamdisalon)');
      return;
    }

    if (!window.confirm('Are you sure? This will delete the salon, its URL, all staff accounts, and all related data.')) return;

    try {
      setIsSaving(true);
      
      // Use RPC function directly (bypasses edge function issues)
      const { data, error } = await supabase.rpc('delete_salon_by_super_admin', {
        p_salon_id: salonId
      });

      if (error) {
        console.error("RPC error:", error);
        throw error;
      }

      if (data && !data.success) {
        throw new Error(data.message || 'Delete operation failed');
      }

      setSuccess('Salon deleted successfully');
      await fetchData();
    } catch (err) {
      console.error("Error deleting salon:", err);
      setError((err as any)?.message || 'Failed to delete salon');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkDeleteTestSalons = async () => {
    const testSalons = salons.filter(s => 
      s.slug !== 'hamdisalon' && 
      (s.slug.includes('test-salon') || s.slug.includes('salon-'))
    );

    if (testSalons.length === 0) {
      setError('No test salons found to delete');
      return;
    }

    if (!window.confirm(`Delete ${testSalons.length} test salons? This will keep only hamdisalon.`)) return;

    try {
      setIsSaving(true);
      let deleted = 0;
      let failed = 0;

      for (const salon of testSalons) {
        try {
          const { data, error } = await supabase.rpc('delete_salon_by_super_admin', {
            p_salon_id: salon.id
          });

          if (error || (data && !data.success)) {
            console.error(`Failed to delete ${salon.slug}:`, error || data.message);
            failed++;
          } else {
            deleted++;
          }
        } catch (err) {
          console.error(`Error deleting ${salon.slug}:`, err);
          failed++;
        }
      }

      if (deleted > 0) {
        setSuccess(`Deleted ${deleted} test salons${failed > 0 ? ` (${failed} failed)` : ''}`);
      } else {
        setError(`Failed to delete test salons: ${failed} errors`);
      }

      await fetchData();
    } catch (err) {
      console.error("Bulk delete error:", err);
      setError('Failed to delete test salons');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.name || !formData.slug || !formData.owner_email || !formData.owner_name) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setIsSaving(true);

      if (editingId) {
        // UPDATE: only update salon fields
        const { error } = await supabase.from('salons').update({
          name: formData.name,
          slug: formData.slug,
          status: formData.status
        }).eq('id', editingId);

        if (error) throw error;
        setSuccess('Salon updated successfully');
      } else {
      // CREATE: Use Edge Function for atomic creation
      const { data, error } = await supabase.functions.invoke('create-salon-complete', {
          body: {
            salonName: formData.name,
            salonSlug: formData.slug,
            ownerName: formData.owner_name,
            ownerEmail: formData.owner_email,
            ownerPassword: formData.owner_password,
          }
      });

      if (error) {
        // Parse error message
        let errorMsg = error.message;
        try {
          const body = JSON.parse(await error.context.json());
          if (body.error) errorMsg = body.error;
        } catch (e) {
            // ignore
        }
        throw new Error(errorMsg || 'Failed to create salon');
      }

      setSuccess('Salon created successfully');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Error saving salon:", err);
      setError((err as any)?.message || 'Failed to save salon');
    } finally {
      setIsSaving(false);
    }
  };

  const openModal = (salon?: SalonStats) => {
    setError(null);
    if (salon) {
      setEditingId(salon.id);
      setFormData({
        name: salon.name,
        slug: salon.slug,
        owner_name: salon.owner_email.split('@')[0],
        owner_email: salon.owner_email,
        status: salon.status as any,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        slug: '',
        owner_name: '',
        owner_email: '',
        owner_password: '',
        status: 'active',
      });
    }
    setIsModalOpen(true);
  };

  const openResetPasswordModal = (salon: SalonStats) => {
    setError(null);
    setSelectedSalonForReset(salon);
    setNewPassword('');
    setIsResetPasswordModalOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedSalonForReset || !newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setIsSaving(true);
      const { data: ownerStaff, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('salon_id', selectedSalonForReset.id)
        .eq('role', 'owner')
        .single();

      if (staffError || !ownerStaff) {
        setError('Owner account not found');
        return;
      }

      const { data, error } = await supabase.functions.invoke('reset-staff-password', {
        body: { 
          staffId: ownerStaff.id, 
          newPassword: newPassword 
        }
      });

      if (error) throw error;

      setSuccess(`Password reset! Share credentials:\nEmail: ${selectedSalonForReset.owner_email}\nPassword: ${newPassword}`);
      setIsResetPasswordModalOpen(false);
      setNewPassword('');
    } catch (err) {
      console.error('Error resetting password:', err);
      setError((err as any)?.message || 'Failed to reset password');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-10 w-full max-w-[1600px] mx-auto space-y-4 sm:space-y-6 md:space-y-8 relative">
      
      {/* Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-green-500 flex-shrink-0 mt-0.5"></div>
          <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}
      
      {success === null && error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
        <div className="lg:col-span-3 space-y-4 sm:space-y-6 md:space-y-8">
          <ResponsiveGrid mobile={1} tablet={2} desktop={3} gap="gap-4 sm:gap-6 md:gap-8">
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

          <div className="bg-white dark:bg-treservi-card-dark rounded-[24px] p-4 sm:p-6 md:p-8 shadow-soft-glow">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 sm:gap-0 mb-6">
              <h3 className="font-bold text-xl">Tenant Management</h3>
              <div className="flex gap-2">
                <button onClick={handleBulkDeleteTestSalons} disabled={isSaving} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-full font-bold shadow-neon-glow transition-all">
                     <Trash2 size={18} /> Delete Test Salons
                </button>
                <button onClick={() => openModal()} disabled={isSaving} className="flex items-center gap-2 bg-treservi-accent hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-full font-bold shadow-neon-glow transition-all">
                     <Plus size={18} /> Add Tenant
                </button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto overflow-x-auto pr-1">
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
                          <button disabled={isSaving} onClick={() => openResetPasswordModal(salon)} className="p-2 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-full disabled:opacity-50" title="Reset Owner Password">
                            <Mail size={16} />
                          </button>
                          <button disabled={isSaving} onClick={() => openModal(salon)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full disabled:opacity-50">
                            <Pencil size={16} />
                          </button>
                          <button disabled={isSaving || salon.slug === 'hamdisalon'} onClick={() => handleDeleteSalon(salon.id, salon.slug)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full disabled:opacity-50" title={salon.slug === 'hamdisalon' ? 'Cannot delete main salon' : 'Delete salon'}>
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
               <button disabled={isSaving} onClick={() => setIsResetPasswordModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50">
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
                      disabled={isSaving}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 chars)"
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded-full py-3 px-4 outline-none border-transparent focus:border-treservi-accent border disabled:opacity-50"
                   />
                </div>
                <button 
                  disabled={isSaving || !newPassword}
                  onClick={handleResetPassword}
                  className="w-full bg-treservi-accent disabled:opacity-50 text-white py-3 rounded-full font-bold shadow-neon-glow hover:scale-105 transition-transform"
                >
                    {isSaving ? 'Resetting...' : 'Reset Password'}
                </button>
             </div>
          </div>
        </div>
       )}

       {/* Edit/Add Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-treservi-card-dark w-full max-w-md rounded-[32px] shadow-2xl p-8 animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-bold">{editingId ? 'Edit Tenant' : 'Add Tenant'}</h2>
               <button disabled={isSaving} onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50">
                 <X size={20} />
               </button>
             </div>
             <form onSubmit={handleSaveSalon} className="space-y-4">
                <div>
                   <label className="text-sm text-gray-500 ml-2 block mb-1">Salon Name *</label>
                   <input 
                      type="text" 
                      required 
                      disabled={isSaving}
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded-full py-3 px-4 outline-none border-transparent focus:border-treservi-accent border disabled:opacity-50"
                   />
                </div>
                <div>
                   <label className="text-sm text-gray-500 ml-2 block mb-1">Slug / URL *</label>
                   <div className="flex items-center">
                      <span className="text-gray-500 mr-2">/</span>
                      <input 
                         type="text" 
                         required 
                         disabled={isSaving}
                         value={formData.slug}
                         onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase()})}
                         className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-full py-3 px-4 outline-none border-transparent focus:border-treservi-accent border disabled:opacity-50"
                      />
                   </div>
                </div>
                <div>
                   <label className="text-sm text-gray-500 ml-2 block mb-1">Owner Name *</label>
                   <input 
                      type="text" 
                      required 
                      disabled={isSaving || !!editingId}
                      value={formData.owner_name}
                      onChange={e => setFormData({...formData, owner_name: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded-full py-3 px-4 outline-none border-transparent focus:border-treservi-accent border disabled:opacity-50"
                   />
                </div>
                <div>
                   <label className="text-sm text-gray-500 ml-2 block mb-1">Owner Email *</label>
                   <input 
                      type="email" 
                      required 
                      disabled={isSaving || !!editingId}
                      value={formData.owner_email}
                      onChange={e => setFormData({...formData, owner_email: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-800 rounded-full py-3 px-4 outline-none border-transparent focus:border-treservi-accent border disabled:opacity-50"
                   />
                </div>
                {!editingId && (
                  <div>
                     <label className="text-sm text-gray-500 ml-2 block mb-1">Owner Password * (min 6 chars)</label>
                     <input 
                        type="password" 
                        required 
                        disabled={isSaving}
                        minLength={6}
                        value={formData.owner_password || ''}
                        onChange={e => setFormData({...formData, owner_password: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-800 rounded-full py-3 px-4 outline-none border-transparent focus:border-treservi-accent border disabled:opacity-50"
                     />
                  </div>
                )}
                {editingId && (
                  <div>
                     <label className="text-sm text-gray-500 ml-2 block mb-1">Status *</label>
                     <select 
                        required 
                        disabled={isSaving}
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value as any})}
                        className="w-full bg-gray-50 dark:bg-gray-800 rounded-full py-3 px-4 outline-none border-transparent focus:border-treservi-accent border disabled:opacity-50"
                     >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="cancelled">Cancelled</option>
                     </select>
                  </div>
                )}
                <button disabled={isSaving} type="submit" className="w-full bg-treservi-accent disabled:opacity-50 text-white py-3 rounded-full font-bold shadow-neon-glow hover:scale-105 transition-transform">
                    {isSaving ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update Tenant' : 'Create Tenant')}
                </button>
             </form>
          </div>
        </div>
       )}

    </div>
  );
};

export default SuperAdminDashboard;
