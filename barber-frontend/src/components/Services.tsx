import React, { useState, useEffect } from 'react';
import {
  Plus,
  Scissors,
  DollarSign,
  Clock,
  Pencil,
  Trash2,
  X,
  FileText,
} from 'lucide-react';
import { Service, CreateServiceInput } from '../types';
import {
  fetchServices,
  createService,
  updateService,
  deleteService,
} from '../services/serviceService';

interface ServicesProps {
  salonId: string;
}

const Services: React.FC<ServicesProps> = ({ salonId }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: '',
    description: '',
  });

  const loadServices = async () => {
    setLoading(true);
    const { data, error: fetchError } = await fetchServices(salonId);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadServices();
  }, [salonId]);

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      duration: '',
      description: '',
    });
    setEditingId(null);
  };

  const handleAddNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setFormData({
      name: service.name,
      price: service.price.toString(),
      duration: service.duration.toString(),
      description: service.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete service "${name}"?`)) return;

    const { error: deleteError } = await deleteService(id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setServices(prev => prev.filter(s => s.id !== id));
      setSuccess('Service deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (editingId) {
        // Update existing
        const { data, error: updateError } = await updateService(editingId, {
          name: formData.name,
          price: parseFloat(formData.price),
          duration: parseInt(formData.duration),
          description: formData.description,
        });

        if (updateError) throw updateError;

        setServices(prev => prev.map(s => (s.id === editingId ? data! : s)));
        setSuccess('Service updated successfully');
      } else {
        // Create new
        const newService: CreateServiceInput = {
          salonId,
          name: formData.name,
          price: parseFloat(formData.price),
          duration: parseInt(formData.duration),
          description: formData.description,
        };

        const { data, error: createError } = await createService(newService);

        if (createError) throw createError;

        setServices(prev => [data!, ...prev]);
        setSuccess('Service created successfully');
      }

      setIsModalOpen(false);
      resetForm();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">Manage Offerings</p>
          <h1 className="text-3xl font-black tracking-tight">Services</h1>
        </div>
        <button
          onClick={handleAddNew}
          className="group inline-flex items-center gap-3 px-5 py-3 rounded-full text-white font-bold bg-gradient-to-br from-[#3ad061] to-[#1e9c46] shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:scale-105 active:scale-95 transition-transform"
        >
          <span className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/20 shadow-inner shadow-white/30">
            <Plus className="w-5 h-5 text-white drop-shadow" />
          </span>
          Add Service
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

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Scissors className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-xl font-semibold text-gray-400">No services yet</p>
            <p className="text-sm text-gray-500">Add your first service to get started</p>
          </div>
        ) : (
          services.map(service => (
            <div
              key={service.id}
              className={`${clayCard} p-6 group hover:shadow-[0_25px_60px_rgba(0,0,0,0.1)] transition-all`}
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg flex items-center justify-center text-white mb-4">
                <Scissors className="w-7 h-7" />
              </div>

              {/* Service Name */}
              <h3 className="text-xl font-bold mb-2 truncate">{service.name}</h3>

              {/* Description */}
              {service.description && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                  {service.description}
                </p>
              )}

              {/* Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-emerald-600">
                    ${service.price.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>{service.duration} minutes</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => handleEdit(service)}
                  className="flex-1 px-3 py-2 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Pencil size={14} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(service.id, service.name)}
                  className="flex-1 px-3 py-2 rounded-full bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className={`${clayCard} w-full max-w-lg p-6 lg:p-8 relative`}>
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
                <Scissors className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-black">
                  {editingId ? 'Edit Service' : 'New Service'}
                </h3>
                <p className="text-sm text-gray-500">
                  {editingId ? 'Update service information' : 'Create a new service offering'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600">Service Name</label>
                <div className="relative">
                  <Scissors className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Haircut & Style"
                    className="w-full rounded-full bg-gray-50 border border-transparent focus:border-emerald-500 focus:bg-white py-3 pl-12 pr-4 outline-none shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600">Price ($)</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      placeholder="30.00"
                      className="w-full rounded-full bg-gray-50 border border-transparent focus:border-emerald-500 focus:bg-white py-3 pl-12 pr-4 outline-none shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600">Duration (min)</label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      required
                      type="number"
                      min="1"
                      value={formData.duration}
                      onChange={e => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="30"
                      className="w-full rounded-full bg-gray-50 border border-transparent focus:border-emerald-500 focus:bg-white py-3 pl-12 pr-4 outline-none shadow-inner"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600">
                  Description (Optional)
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-gray-400 absolute left-4 top-4" />
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the service..."
                    rows={4}
                    className="w-full rounded-[24px] bg-gray-50 border border-transparent focus:border-emerald-500 focus:bg-white py-3 pl-12 pr-4 outline-none shadow-inner resize-none"
                  />
                </div>
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
                  {editingId ? 'Update Service' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
