import React, { useState, useEffect } from 'react';
import {
  Plus,
  Calendar,
  User,
  Clock,
  Scissors,
  DollarSign,
  Pencil,
  Trash2,
  X,
  Users,
  Filter,
} from 'lucide-react';
import { AppointmentData, Service, StaffMember, CreateAppointmentInput } from '../types';
import {
  fetchAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from '../services/appointmentService';
import { fetchServices } from '../services/serviceService';
import { fetchStaff } from '../services/staffService';
import { formatPrice } from '../utils/format';
import { supabase } from '../services/supabaseClient';
import DailyScheduleView from './DailyScheduleView';

interface AppointmentsProps {
  salonId: string;
}

const Appointments: React.FC<AppointmentsProps> = ({ salonId }) => {
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showScheduleView, setShowScheduleView] = useState(false);

  const [formData, setFormData] = useState<Partial<CreateAppointmentInput>>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    staff_id: '',
    service_id: '',
    appointment_date: '',
    appointment_time: '',
    status: 'Pending',
    amount: 0,
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [appointmentsRes, servicesRes, staffRes] = await Promise.all([
        fetchAppointments(salonId),
        fetchServices(salonId),
        fetchStaff(salonId),
      ]);

      if (appointmentsRes.error) throw appointmentsRes.error;
      if (servicesRes.error) throw servicesRes.error;
      if (staffRes.error) throw staffRes.error;

      setAppointments(appointmentsRes.data || []);
      setServices(servicesRes.data || []);
      setStaff(staffRes.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    if (!supabase) return;
    const channel = supabase
      .channel('appointments-owner')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `salon_id=eq.${salonId}`,
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [salonId]);

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      staff_id: '',
      service_id: '',
      appointment_date: '',
      appointment_time: '',
      status: 'Pending',
      amount: 0,
      notes: '',
    });
    setEditingId(null);
  };

  const handleAddNew = () => {
    resetForm();
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({ ...prev, appointment_date: today }));
    setIsModalOpen(true);
  };

  const handleEdit = (apt: AppointmentData) => {
    setEditingId(apt.id);
    setFormData({
      customer_name: apt.customer_name,
      customer_email: apt.customer_email,
      customer_phone: apt.customer_phone,
      staff_id: apt.staff_id,
      service_id: apt.service_id,
      appointment_date: apt.appointment_date,
      appointment_time: apt.appointment_time,
      status: apt.status,
      amount: Number(apt.amount),
      notes: apt.notes,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, customerName: string) => {
    if (!window.confirm(`Delete appointment for ${customerName}?`)) return;

    const { error: deleteError } = await deleteAppointment(id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setAppointments(prev => prev.filter(a => a.id !== id));
      setSuccess('Appointment deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    setFormData({
      ...formData,
      service_id: serviceId,
      amount: service ? service.price : 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (editingId) {
        // Update existing
        const { data, error: updateError } = await updateAppointment(editingId, {
          customer_name: formData.customer_name!,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone,
          staff_id: formData.staff_id,
          service_id: formData.service_id,
          appointment_date: formData.appointment_date!,
          appointment_time: formData.appointment_time!,
          status: formData.status!,
          amount: formData.amount!,
          notes: formData.notes,
        });

        if (updateError) throw updateError;

        setAppointments(prev =>
          prev.map(a => (a.id === editingId ? data! : a))
        );
        setSuccess('Appointment updated successfully');
      } else {
        // Create new
        const newAppointment: CreateAppointmentInput = {
          salon_id: salonId,
          staff_id: formData.staff_id,
          service_id: formData.service_id,
          customer_name: formData.customer_name!,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone,
          appointment_date: formData.appointment_date!,
          appointment_time: formData.appointment_time!,
          status: formData.status!,
          amount: formData.amount!,
          notes: formData.notes,
        };

        const { data, error: createError } = await createAppointment(newAppointment);

        if (createError) throw createError;

        setAppointments(prev => [data!, ...prev]);
        setSuccess('Appointment created successfully');
      }

      setIsModalOpen(false);
      resetForm();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredAppointments =
    filterStatus === 'all'
      ? appointments
      : appointments.filter(apt => apt.status === filterStatus);

  const clayCard =
    'bg-white dark:bg-treservi-card-dark rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100/60 dark:border-gray-800/60 backdrop-blur-sm';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 w-full max-w-[1600px] mx-auto space-y-6">
      {/* Header with Mini Calendar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm text-gray-500">Manage Bookings</p>
          <h1 className="text-3xl font-black tracking-tight">Appointments</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Schedule View Button */}
          <button
            onClick={() => setShowScheduleView(true)}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-br from-[#FFF9F0] to-[#FFF5E6] dark:from-gray-800 dark:to-gray-900 border border-orange-200 dark:border-gray-700 text-[#8B7355] dark:text-gray-300 font-medium hover:shadow-lg transition-all"
          >
            <Calendar className="w-5 h-5" />
            <span className="hidden sm:inline">Schedule</span>
          </button>
          
          {/* Add Button */}
          <button
            onClick={handleAddNew}
            className="group inline-flex items-center gap-3 px-5 py-3 rounded-full text-white font-bold bg-gradient-to-br from-[#3ad061] to-[#1e9c46] shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:scale-105 active:scale-95 transition-transform"
          >
            <span className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/20 shadow-inner shadow-white/30">
              <Plus className="w-5 h-5 text-white drop-shadow" />
            </span>
            <span className="hidden sm:inline">New Appointment</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
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

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-5 h-5 text-gray-400" />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 border-none outline-none text-sm font-medium"
        >
          <option value="all">All Appointments</option>
          <option value="Pending">Pending</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Appointments - Table on Desktop, Cards on Mobile */}
      <div className={`${clayCard} p-6 md:p-8`}>
        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-400 text-sm border-b border-gray-100 dark:border-gray-800">
                <th className="pb-4 font-normal pl-4">Customer</th>
                <th className="pb-4 font-normal">Staff</th>
                <th className="pb-4 font-normal">Service</th>
                <th className="pb-4 font-normal">Date & Time</th>
                <th className="pb-4 font-normal">Status</th>
                <th className="pb-4 font-normal text-right">Amount</th>
                <th className="pb-4 font-normal pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-xl font-semibold text-gray-400">No appointments found</p>
                  </td>
                </tr>
              ) : (
                filteredAppointments.map(apt => (
                  <tr
                    key={apt.id}
                    className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 pl-4 first:rounded-l-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                          {apt.customer_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {apt.customer_name}
                          </p>
                          {apt.customer_phone && (
                            <p className="text-xs text-gray-500">{apt.customer_phone}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-gray-500">
                      {apt.staff?.full_name || 'Unassigned'}
                    </td>
                    <td className="py-4 text-gray-500 whitespace-nowrap">
                      {apt.service?.name || 'N/A'}
                    </td>
                    <td className="py-4 text-gray-500 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {apt.appointment_date}
                      </div>
                      <div className="flex items-center gap-1 text-xs mt-1">
                        <Clock className="w-3 h-3" />
                        {apt.appointment_time}
                      </div>
                    </td>
                    <td className="py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
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
                    </td>
                    <td className="py-4 text-right font-bold whitespace-nowrap">
                      {formatPrice(Number(apt.amount))}
                    </td>
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
                          onClick={() => handleDelete(apt.id, apt.customer_name)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-3">
          {filteredAppointments.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-semibold text-gray-400">No appointments</p>
            </div>
          ) : (
            filteredAppointments.map(apt => (
              <div key={apt.id} className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                {/* Header: Time, Name, Status */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{apt.appointment_time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {apt.customer_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{apt.customer_name}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${
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

                {/* Details: Service, Staff, Phone - Vertical Stack */}
                <div className="space-y-2 text-sm border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">Service</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{apt.service?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">Staff</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{apt.staff?.full_name || 'Unassigned'}</span>
                  </div>
                  {apt.customer_phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">Phone</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{apt.customer_phone}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">Date</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{apt.appointment_date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">Amount</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(Number(apt.amount))}</span>
                  </div>
                </div>

                {/* Actions: Edit/Delete at Bottom */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleEdit(apt)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Pencil size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(apt.id, apt.customer_name)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className={`${clayCard} w-full max-w-2xl p-6 lg:p-8 relative max-h-[90vh] overflow-y-auto`}>
            <button
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-black flex items-center justify-center"
            >
              <X size={20} />
            </button>

            <div className="flex items-start gap-3 mb-6">
              <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg flex items-center justify-center text-white">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-black">
                  {editingId ? 'Edit Appointment' : 'New Appointment'}
                </h3>
                <p className="text-sm text-gray-500">
                  {editingId ? 'Update appointment details' : 'Schedule a new booking'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Name */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600">Customer Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      required
                      value={formData.customer_name}
                      onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full rounded-full bg-gray-50 border border-transparent focus:border-emerald-500 focus:bg-white py-3 pl-12 pr-4 outline-none shadow-inner"
                    />
                  </div>
                </div>

                {/* Customer Phone */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600">Phone</label>
                  <input
                    value={formData.customer_phone}
                    onChange={e => setFormData({ ...formData, customer_phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                    className="w-full rounded-full bg-gray-50 border border-transparent focus:border-emerald-500 focus:bg-white py-3 px-4 outline-none shadow-inner"
                  />
                </div>
              </div>

              {/* Email removed as per requirement */}
              {/* <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600">Email (Optional)</label>
                <input
                  type="email"
                  value={formData.customer_email}
                  onChange={e => setFormData({ ...formData, customer_email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full rounded-full bg-gray-50 border border-transparent focus:border-emerald-500 focus:bg-white py-3 px-4 outline-none shadow-inner"
                />
              </div> */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Staff */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600">Assign to Staff</label>
                  <div className="relative">
                    <Users className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 z-10" />
                    <select
                      value={formData.staff_id}
                      onChange={e => setFormData({ ...formData, staff_id: e.target.value })}
                      className="w-full rounded-full bg-gray-50 border border-transparent focus:border-emerald-500 focus:bg-white py-3 pl-12 pr-4 outline-none shadow-inner appearance-none"
                    >
                      <option value="">Select Staff</option>
                      {staff.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Service */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600">Service</label>
                  <div className="relative">
                    <Scissors className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 z-10" />
                    <select
                      required
                      value={formData.service_id}
                      onChange={e => handleServiceChange(e.target.value)}
                      className="w-full rounded-full bg-gray-50 border border-transparent focus:border-emerald-500 focus:bg-white py-3 pl-12 pr-4 outline-none shadow-inner appearance-none"
                    >
                      <option value="">Select Service</option>
                      {services.map(service => (
                        <option key={service.id} value={service.id}>
                          {service.name} ({formatPrice(service.price)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600">Date</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      required
                      type="date"
                      value={formData.appointment_date}
                      onChange={e => setFormData({ ...formData, appointment_date: e.target.value })}
                      className="w-full rounded-full bg-gray-50 border border-transparent focus:border-emerald-500 focus:bg-white py-3 pl-12 pr-4 outline-none shadow-inner"
                    />
                  </div>
                </div>

                {/* Time */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600">Time</label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      required
                      type="time"
                      value={formData.appointment_time}
                      onChange={e => setFormData({ ...formData, appointment_time: e.target.value })}
                      className="w-full rounded-full bg-gray-50 border border-transparent focus:border-emerald-500 focus:bg-white py-3 pl-12 pr-4 outline-none shadow-inner"
                    />
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600">Amount</label>
                  <div className="relative">
                     <span className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold">DT</span>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                      placeholder="0.000"
                      className="w-full rounded-full bg-gray-50 border border-transparent focus:border-emerald-500 focus:bg-white py-3 pl-12 pr-4 outline-none shadow-inner"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full rounded-full bg-gray-50 border border-transparent focus:border-emerald-500 focus:bg-white py-3 px-4 outline-none shadow-inner appearance-none"
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any special requests or notes..."
                  rows={3}
                  className="w-full rounded-[24px] bg-gray-50 border border-transparent focus:border-emerald-500 focus:bg-white p-4 outline-none shadow-inner resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-5 py-3 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-full text-white font-bold bg-gradient-to-br from-[#3ad061] to-[#1e9c46] shadow-lg hover:scale-[1.02] active:scale-95 transition-transform"
                >
                  {editingId ? 'Update Appointment' : 'Create Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Daily Schedule View Modal */}
      {showScheduleView && (
        <DailyScheduleView
          salonId={salonId}
          userRole="owner"
          onClose={() => setShowScheduleView(false)}
        />
      )}
    </div>
  );
};

export default Appointments;
