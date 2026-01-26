import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  UserRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Scissors,
  Sparkles,
  Loader2,
  RefreshCcw,
  Trash2,
  ShieldCheck,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { StaffMember } from '../types';
import {
  fetchStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  resetStaffPassword,
  getStaffStats,
  fetchClientsByStaff,
} from '../services/staffService';

interface StaffProps {
  salonId?: string;
  isOwner?: boolean;
}

const specialties = ['Haircut', 'Beard', 'Coloring', 'Styling'];
const emptyIllustration = 'https://illustrations.popsy.co/gray/barber.svg';

const Staff: React.FC<StaffProps> = ({ salonId, isOwner = true }) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [staffStats, setStaffStats] = useState<any>(null);
  const [staffClients, setStaffClients] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    specialty: specialties[0],
  });

  const resolvedSalonId = useMemo(
    () => salonId || (import.meta.env.VITE_SALON_ID as string | undefined) || 'salon-1',
    [salonId]
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error: err } = await fetchStaff(resolvedSalonId);
      if (err) setError(err.message);
      setStaff(data || []);
      setLoading(false);
    };
    load();
  }, [resolvedSalonId]);

  // Load stats for selected staff
  useEffect(() => {
    if (selectedStaff) {
      const loadStats = async () => {
        const stats = await getStaffStats(selectedStaff.id);
        setStaffStats(stats);

        const { data: clients } = await fetchClientsByStaff(selectedStaff.id);
        setStaffClients(clients || []);
      };
      loadStats();
    }
  }, [selectedStaff?.id]);

  const resetForm = () => {
    setForm({ fullName: '', email: '', password: '', specialty: specialties[0] });
    setEditingId(null);
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingId) {
        // Update existing
        const { data, error: err } = await updateStaff(editingId, {
          full_name: form.fullName,
          specialty: form.specialty,
        });
        if (err) {
          setError(err.message);
        } else {
          setStaff((prev) =>
            prev.map((s) => (s.id === editingId ? (data as StaffMember) : s))
          );
          setSuccess('Staff member updated successfully.');
          setModalOpen(false);
          resetForm();
        }
      } else {
        // Create new
        const { data, error: err } = await createStaff({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          specialty: form.specialty,
          salonId: resolvedSalonId,
        });

        if (err) {
          setError(err.message);
        } else {
          setStaff((prev) => [data as StaffMember, ...prev]);
          setSuccess('Staff member created successfully.');
          setModalOpen(false);
          resetForm();
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (member: StaffMember) => {
    setEditingId(member.id);
    setForm({
      fullName: member.full_name,
      email: member.email,
      password: '',
      specialty: member.specialty,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;

    const { error: err } = await deleteStaff(id);
    if (err) {
      setError(err.message);
    } else {
      setStaff((prev) => prev.filter((s) => s.id !== id));
      setSuccess(`${name} has been deleted.`);
    }
  };

  const handleResetPassword = async (email: string) => {
    const { error: err } = await resetStaffPassword(email);
    if (err) setError(err.message);
    else setSuccess('Password reset email sent.');
  };

  const clayCard =
    'bg-white dark:bg-treservi-card-dark rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100/60 dark:border-gray-800/60 backdrop-blur-sm';

  return (
    <div className="p-6 lg:p-10 w-full max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">Owner Dashboard</p>
          <h1 className="text-3xl font-black tracking-tight">Staff Management</h1>
        </div>
        <button
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="group inline-flex items-center gap-3 px-5 py-3 rounded-full text-white font-bold bg-gradient-to-br from-[#3ad061] to-[#1e9c46] shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:scale-105 active:scale-95 transition-transform"
        >
          <span className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/20 shadow-inner shadow-white/30">
            <Plus className="w-5 h-5 text-white drop-shadow" />
          </span>
          Add New Staff
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-200">
          {success}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Staff List */}
        <div className={`lg:col-span-2 ${clayCard} p-6`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-gray-50 via-white to-gray-200 shadow-inner shadow-white/60 flex items-center justify-center">
                <Users className="text-gray-800" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Staff Roster</h2>
                <p className="text-sm text-gray-500">{staff.length} members</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 gap-3 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-[28px] bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 gap-4">
              <img
                src={emptyIllustration}
                alt="Empty"
                className="w-48 h-48 object-contain drop-shadow-xl"
              />
              <div>
                <p className="text-xl font-semibold">Start your team</p>
                <p className="text-gray-500">Add your first staff member.</p>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {staff.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setSelectedStaff(member)}
                  className={`flex items-center gap-4 p-4 rounded-[28px] text-left transition-all border-2 ${
                    selectedStaff?.id === member.id
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500'
                      : 'bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-[#1c1c1c] dark:via-[#1a1a1a] dark:to-[#111] border-white/70 dark:border-gray-800 hover:border-emerald-500'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative w-14 h-14 rounded-[20px] bg-gradient-to-br from-gray-100 via-white to-gray-300 shadow-[6px_10px_18px_rgba(0,0,0,0.12)] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-black text-gray-700">
                        {member.full_name.charAt(0)}
                      </span>
                    )}
                    <div className="absolute inset-0 rounded-[20px] shadow-inner shadow-white/50" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate text-sm text-gray-900 dark:text-white">
                        {member.full_name}
                      </p>
                      <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    </div>
                    <p className="text-xs text-gray-500 truncate mb-2">{member.email}</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full bg-white text-gray-700 text-xs font-semibold shadow-inner shadow-white/70 border border-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 truncate">
                        {member.specialty}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold shadow-inner shadow-white/60 dark:bg-emerald-900/40 dark:text-emerald-200 flex-shrink-0">
                        Active
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {isOwner && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(member);
                        }}
                        className="p-1.5 rounded-full bg-white text-blue-600 hover:bg-blue-50 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(member.id, member.full_name);
                        }}
                        className="p-1.5 rounded-full bg-white text-red-500 hover:bg-red-50 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stats Panel */}
        {selectedStaff && staffStats && (
          <div className="space-y-4">
            {/* Staff Card */}
            <div className={`${clayCard} p-6`}>
              <div className="text-center mb-4">
                <div className="w-20 h-20 rounded-full mx-auto bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg flex items-center justify-center text-white text-2xl font-bold">
                  {selectedStaff.full_name.charAt(0)}
                </div>
                <h3 className="text-lg font-bold mt-3">{selectedStaff.full_name}</h3>
                <p className="text-sm text-gray-500">{selectedStaff.specialty}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  <strong>Email:</strong> {selectedStaff.email}
                </p>
                <p className="text-xs text-gray-500">
                  <strong>Status:</strong> {selectedStaff.status}
                </p>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleResetPassword(selectedStaff.email)}
                  className="flex-1 px-3 py-2 text-xs font-bold rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100"
                >
                  Reset Password
                </button>
                <button
                  onClick={() => handleDelete(selectedStaff.id, selectedStaff.full_name)}
                  className="flex-1 px-3 py-2 text-xs font-bold rounded-full bg-red-50 text-red-700 hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Today's Earnings */}
            <div className={`${clayCard} p-6`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white">
                  <DollarSign className="w-5 h-5" />
                </div>
                <h3 className="font-bold">Today's Earnings</h3>
              </div>
              <p className="text-3xl font-black text-emerald-600">${staffStats.today_earnings}</p>
              <p className="text-xs text-gray-500 mt-2">
                {staffStats.today_appointments} appointments
              </p>
            </div>

            {/* Total Earnings */}
            <div className={`${clayCard} p-6`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="font-bold">Total Earnings</h3>
              </div>
              <p className="text-3xl font-black text-green-600">${staffStats.total_earnings}</p>
              <p className="text-xs text-gray-500 mt-2">
                {staffStats.completed_appointments} completed appointments
              </p>
            </div>

            {/* Clients */}
            <div className={`${clayCard} p-6`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-bold">Clients ({staffClients.length})</h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {staffClients.length === 0 ? (
                  <p className="text-xs text-gray-500">No clients assigned yet</p>
                ) : (
                  staffClients.map((client) => (
                    <div key={client.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <img
                        src={client.avatar_url}
                        alt={client.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{client.name}</p>
                        <p className="text-xs text-gray-500">{client.phone}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className={`${clayCard} w-full max-w-lg p-6 lg:p-8 relative`}>
            <button
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-black flex items-center justify-center"
            >
              ×
            </button>

            <div className="flex items-start gap-3 mb-6">
              <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-emerald-400 to-green-600 shadow-[0_20px_50px_rgba(0,0,0,0.12)] flex items-center justify-center text-white">
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-2xl font-black">
                  {editingId ? 'Edit Staff Member' : 'Add New Staff'}
                </h3>
                <p className="text-sm text-gray-500">
                  {editingId
                    ? 'Update staff information'
                    : 'Create new staff account with login credentials'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600">Full Name</label>
                <div className="relative">
                  <UserRound className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="John Barber"
                    className="w-full rounded-full bg-gray-50 border border-transparent focus:border-emerald-500 focus:bg-white py-3 pl-12 pr-4 outline-none shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="john@barbershop.com"
                    disabled={!!editingId}
                    className="w-full rounded-full bg-gray-50 border border-transparent focus:border-emerald-500 focus:bg-white py-3 pl-12 pr-4 outline-none shadow-inner disabled:opacity-50"
                  />
                </div>
              </div>

              {!editingId && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full rounded-full bg-gray-50 border border-transparent focus:border-emerald-500 focus:bg-white py-3 pl-12 pr-12 outline-none shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-800"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600">Specialty</label>
                <div className="relative">
                  <Scissors className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <select
                    value={form.specialty}
                    onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                    className="w-full rounded-full bg-gray-50 border border-transparent focus:border-emerald-500 focus:bg-white py-3 pl-12 pr-4 outline-none shadow-inner"
                  >
                    {specialties.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="px-5 py-3 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 rounded-full text-white font-bold bg-gradient-to-br from-[#3ad061] to-[#1e9c46] shadow-[0_20px_50px_rgba(0,0,0,0.12)] hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </span>
                  ) : editingId ? (
                    'Update Staff'
                  ) : (
                    'Create Staff'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
