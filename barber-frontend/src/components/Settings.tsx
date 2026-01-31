import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { useLanguage } from '../context/LanguageContext';

interface SalonSettings {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  opening_time: string;
  closing_time: string;
  open_days: number[];
  latitude?: number;
  longitude?: number;
}

const Settings = () => {
  const { t, language } = useLanguage();
  const [salon, setSalon] = useState<SalonSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logo_url: '',
    opening_time: '09:00',
    closing_time: '18:00',
    open_days: [1, 2, 3, 4, 5, 6] as number[],
    latitude: '',
    longitude: ''
  });

  // Day names translations
  const getDayNames = () => {
    if (language === 'ar' || language === 'tn') {
      return [
        t('settings.days.sunday'),
        t('settings.days.monday'),
        t('settings.days.tuesday'),
        t('settings.days.wednesday'),
        t('settings.days.thursday'),
        t('settings.days.friday'),
        t('settings.days.saturday')
      ];
    }
    return [
      t('settings.days.sunday'),
      t('settings.days.monday'),
      t('settings.days.tuesday'),
      t('settings.days.wednesday'),
      t('settings.days.thursday'),
      t('settings.days.friday'),
      t('settings.days.saturday')
    ];
  };

  useEffect(() => {
    fetchSalonSettings();
  }, []);

  const fetchSalonSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get staff record to find salon_id
      const { data: staffData } = await supabase
        .from('staff')
        .select('salon_id')
        .eq('user_id', user.id)
        .single();

      if (!staffData) return;

      // Get salon settings
      const { data: salonData, error } = await supabase
        .from('salons')
        .select('id, name, slug, logo_url, opening_time, closing_time, open_days, latitude, longitude')
        .eq('id', staffData.salon_id)
        .single();

      if (error) throw error;

      setSalon(salonData);
      setFormData({
        name: salonData.name || '',
        slug: salonData.slug || '',
        logo_url: salonData.logo_url || '',
        opening_time: salonData.opening_time || '09:00',
        closing_time: salonData.closing_time || '18:00',
        open_days: salonData.open_days || [1, 2, 3, 4, 5, 6],
        latitude: salonData.latitude?.toString() || '',
        longitude: salonData.longitude?.toString() || ''
      });
    } catch (error) {
      console.error('Error fetching salon settings:', error);
      setMessage({ type: 'error', text: t('settings.errorLoading') });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !salon) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: t('settings.invalidImage') });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: t('settings.imageTooLarge') });
      return;
    }

    setUploadingLogo(true);
    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${salon.id}-logo-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('salon-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('salon-logos')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, logo_url: urlData.publicUrl }));
      setMessage({ type: 'success', text: t('settings.logoUploaded') });
    } catch (error) {
      console.error('Error uploading logo:', error);
      setMessage({ type: 'error', text: t('settings.logoUploadError') });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      open_days: prev.open_days.includes(day)
        ? prev.open_days.filter(d => d !== day)
        : [...prev.open_days, day].sort()
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon) return;

    setSaving(true);
    setMessage(null);

    try {
      const updateData: any = {
        name: formData.name,
        slug: formData.slug,
        logo_url: formData.logo_url || null,
        opening_time: formData.opening_time,
        closing_time: formData.closing_time,
        open_days: formData.open_days
      };

      // Only include coordinates if they're valid numbers
      if (formData.latitude && formData.longitude) {
        const lat = parseFloat(formData.latitude);
        const lng = parseFloat(formData.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          updateData.latitude = lat;
          updateData.longitude = lng;
        }
      }

      const { error } = await supabase
        .from('salons')
        .update(updateData)
        .eq('id', salon.id);

      if (error) throw error;

      setMessage({ type: 'success', text: t('settings.saveSuccess') });
      
      // Refresh salon data
      fetchSalonSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: t('settings.saveError') });
    } finally {
      setSaving(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          }));
          setMessage({ type: 'success', text: t('settings.locationUpdated') });
        },
        (error) => {
          console.error('Error getting location:', error);
          setMessage({ type: 'error', text: t('settings.locationError') });
        }
      );
    } else {
      setMessage({ type: 'error', text: t('settings.locationNotSupported') });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const dayNames = getDayNames();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto p-4 sm:p-6"
      dir={language === 'ar' || language === 'tn' ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {t('common.settings')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('settings.manageSalon')}
        </p>
      </div>

      {/* Success/Error Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-6 p-4 rounded-xl ${
              message.type === 'success' 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Salon Logo */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('settings.salonLogo')}
          </h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              {formData.logo_url ? (
                <img
                  src={formData.logo_url}
                  alt="Salon logo"
                  className="w-24 h-24 rounded-xl object-cover border-2 border-gray-200 dark:border-gray-600"
                />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">
                    {formData.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {uploadingLogo && (
                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {uploadingLogo ? t('settings.uploading') : t('settings.uploadLogo')}
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {t('settings.logoHint')}
              </p>
            </div>
          </div>
        </div>

        {/* Salon Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('settings.salonInfo')}
          </h2>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.salonName')}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.bookingUrl')}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 text-sm">reservi.app/</span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('settings.location')}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.latitude')}
              </label>
              <input
                type="text"
                value={formData.latitude}
                onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                placeholder="36.8065"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.longitude')}
              </label>
              <input
                type="text"
                value={formData.longitude}
                onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                placeholder="10.1815"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={getCurrentLocation}
            className="mt-4 flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t('settings.useCurrentLocation')}
          </button>
        </div>

        {/* Working Hours */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('settings.workingHours')}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.openingTime')}
              </label>
              <input
                type="time"
                value={formData.opening_time}
                onChange={(e) => setFormData(prev => ({ ...prev, opening_time: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('settings.closingTime')}
              </label>
              <input
                type="time"
                value={formData.closing_time}
                onChange={(e) => setFormData(prev => ({ ...prev, closing_time: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Open Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('settings.openDays')}
            </label>
            <div className="flex flex-wrap gap-2">
              {dayNames.map((day, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDayToggle(index)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    formData.open_days.includes(index)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <motion.button
          type="submit"
          disabled={saving}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {t('settings.saving')}
            </div>
          ) : (
            t('common.save')
          )}
        </motion.button>
      </form>
    </motion.div>
  );
};

export default Settings;
