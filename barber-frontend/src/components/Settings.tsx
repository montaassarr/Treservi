import React, { useState, useEffect } from 'react';
import { 
  Save, 
  MapPin, 
  Clock, 
  Calendar, 
  Upload,
  User,
  Store,
  Phone,
  Mail,
  Globe,
  CheckCircle,
  X
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useLanguage } from '../context/LanguageContext';

interface SettingsProps {
  salonId: string;
}

interface SalonSettings {
  name: string;
  address: string;
  city: string;
  country: string;
  contact_phone: string;
  contact_email: string;
  logo_url: string;
  opening_time: string;
  closing_time: string;
  open_days: string[];
  latitude: number | null;
  longitude: number | null;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday', 
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const Settings: React.FC<SettingsProps> = ({ salonId }) => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar' || language === 'tn';

  // Translated day names
  const getDayName = (day: string) => {
    const dayKey = day.toLowerCase();
    return t(`settings.days.${dayKey}`) || day.slice(0, 3);
  };

  const [settings, setSettings] = useState<SalonSettings>({
    name: '',
    address: '',
    city: '',
    country: 'Tunisia',
    contact_phone: '',
    contact_email: '',
    logo_url: '',
    opening_time: '09:00',
    closing_time: '18:00',
    open_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    latitude: null,
    longitude: null,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [salonId]);

  const loadSettings = async () => {
    if (!supabase || !salonId) return;
    
    try {
      const { data, error } = await supabase
        .from('salons')
        .select('*')
        .eq('id', salonId)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          name: data.name || '',
          address: data.address || '',
          city: data.city || '',
          country: data.country || 'Tunisia',
          contact_phone: data.contact_phone || '',
          contact_email: data.contact_email || '',
          logo_url: data.logo_url || '',
          opening_time: data.opening_time || '09:00',
          closing_time: data.closing_time || '18:00',
          open_days: data.open_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          latitude: data.latitude || null,
          longitude: data.longitude || null,
        });
      }
    } catch (err: any) {
      console.error('Error loading settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!supabase || !salonId) return;
    
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('salons')
        .update({
          name: settings.name,
          address: settings.address,
          city: settings.city,
          country: settings.country,
          contact_phone: settings.contact_phone,
          contact_email: settings.contact_email,
          logo_url: settings.logo_url,
          opening_time: settings.opening_time,
          closing_time: settings.closing_time,
          open_days: settings.open_days,
          latitude: settings.latitude,
          longitude: settings.longitude,
        })
        .eq('id', salonId);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setSettings(prev => ({
      ...prev,
      open_days: prev.open_days.includes(day)
        ? prev.open_days.filter(d => d !== day)
        : [...prev.open_days, day]
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${salonId}-logo.${fileExt}`;
      const filePath = `salon-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      setSettings(prev => ({ ...prev, logo_url: publicUrl }));
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image');
    }
  };

  const clayCard = 'bg-white dark:bg-treservi-card-dark rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100/60 dark:border-gray-800/60';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 w-full max-w-[1200px] mx-auto space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">{t('settings.manageSalon')}</p>
          <h1 className="text-3xl font-black tracking-tight">{t('common.settings')}</h1>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="group inline-flex items-center gap-3 px-6 py-3 rounded-full text-white font-bold bg-gradient-to-br from-[#3ad061] to-[#1e9c46] shadow-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saving ? t('settings.saving') : t('settings.saveChanges')}
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">{t('settings.saveSuccess')}</span>
        </div>
      )}
      
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
          <X className="w-5 h-5" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Salon Information */}
        <div className={`${clayCard} p-6 md:p-8 space-y-6`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
              <Store className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold">{t('settings.salonInfo')}</h2>
          </div>

          {/* Logo Upload */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-600">{t('settings.salonLogo')}</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <Upload className="w-4 h-4" />
                  {t('settings.uploadLogo')}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                <p className="text-xs text-gray-500 mt-1">{t('settings.logoHint')}</p>
              </div>
            </div>
          </div>

          {/* Salon Name */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">{t('settings.salonName')}</label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-2xl bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 p-4 outline-none transition-all"
              placeholder="My Awesome Salon"
            />
          </div>

          {/* Contact Phone */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              <Phone className="w-4 h-4" /> {t('settings.contactPhone')}
            </label>
            <input
              type="tel"
              value={settings.contact_phone}
              onChange={(e) => setSettings(prev => ({ ...prev, contact_phone: e.target.value }))}
              className="w-full rounded-2xl bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 p-4 outline-none transition-all"
              placeholder="+216 XX XXX XXX"
            />
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              <Mail className="w-4 h-4" /> {t('settings.contactEmail')}
            </label>
            <input
              type="email"
              value={settings.contact_email}
              onChange={(e) => setSettings(prev => ({ ...prev, contact_email: e.target.value }))}
              className="w-full rounded-2xl bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 p-4 outline-none transition-all"
              placeholder="contact@salon.com"
            />
          </div>
        </div>

        {/* Location */}
        <div className={`${clayCard} p-6 md:p-8 space-y-6`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl">
              <MapPin className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold">{t('settings.location')}</h2>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">{t('settings.streetAddress')}</label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => setSettings(prev => ({ ...prev, address: e.target.value }))}
              className="w-full rounded-2xl bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-red-500 focus:bg-white dark:focus:bg-gray-900 p-4 outline-none transition-all"
              placeholder="123 Main Street"
            />
          </div>

          {/* City */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">{t('settings.city')}</label>
            <input
              type="text"
              value={settings.city}
              onChange={(e) => setSettings(prev => ({ ...prev, city: e.target.value }))}
              className="w-full rounded-2xl bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-red-500 focus:bg-white dark:focus:bg-gray-900 p-4 outline-none transition-all"
              placeholder="Tunis"
            />
          </div>

          {/* Country */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">{t('settings.country')}</label>
            <input
              type="text"
              value={settings.country}
              onChange={(e) => setSettings(prev => ({ ...prev, country: e.target.value }))}
              className="w-full rounded-2xl bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-red-500 focus:bg-white dark:focus:bg-gray-900 p-4 outline-none transition-all"
              placeholder="Tunisia"
            />
          </div>

          {/* Google Maps Coordinates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">{t('settings.latitude')}</label>
              <input
                type="number"
                step="any"
                value={settings.latitude || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, latitude: parseFloat(e.target.value) || null }))}
                className="w-full rounded-2xl bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-red-500 focus:bg-white dark:focus:bg-gray-900 p-4 outline-none transition-all"
                placeholder="36.8065"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-600">{t('settings.longitude')}</label>
              <input
                type="number"
                step="any"
                value={settings.longitude || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, longitude: parseFloat(e.target.value) || null }))}
                className="w-full rounded-2xl bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-red-500 focus:bg-white dark:focus:bg-gray-900 p-4 outline-none transition-all"
                placeholder="10.1815"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            💡 {t('settings.getCoordinates')} <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">Google Maps</a>
          </p>
        </div>

        {/* Working Hours */}
        <div className={`${clayCard} p-6 md:p-8 space-y-6 lg:col-span-2`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold">{t('settings.workingHours')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Opening & Closing Time */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600">{t('settings.openingTime')}</label>
                <input
                  type="time"
                  value={settings.opening_time}
                  onChange={(e) => setSettings(prev => ({ ...prev, opening_time: e.target.value }))}
                  className="w-full rounded-2xl bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-purple-500 focus:bg-white dark:focus:bg-gray-900 p-4 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600">{t('settings.closingTime')}</label>
                <input
                  type="time"
                  value={settings.closing_time}
                  onChange={(e) => setSettings(prev => ({ ...prev, closing_time: e.target.value }))}
                  className="w-full rounded-2xl bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-purple-500 focus:bg-white dark:focus:bg-gray-900 p-4 outline-none transition-all"
                />
              </div>
            </div>

            {/* Open Days */}
            <div className="space-y-4">
              <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> {t('settings.openDays')}
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      settings.open_days.includes(day)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {getDayName(day)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
