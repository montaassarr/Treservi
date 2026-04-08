import React, { useMemo, useState } from 'react';
import { useSalon } from '../context/SalonContext';
import { useLanguage } from '../context/LanguageContext';
import {
  lookupPublicManagedBooking,
  cancelPublicManagedBooking,
  reschedulePublicManagedBooking
} from '../services/appointmentService';
import { AppointmentData } from '../types';
import { isValidTunisianPhone } from '../utils/validationUtils';
import { formatDisplayDate } from '../utils/format';
import { ArrowLeft, Calendar, Clock, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const toDateKeyTunis = (date: Date) => date.toLocaleDateString('en-CA', { timeZone: 'Africa/Tunis' });

const generateTimeSlots = (openingTime: string, closingTime: string) => {
  const slots: string[] = [];
  const [startHour, startMinute] = openingTime.split(':').map(Number);
  const [endHour, endMinute] = closingTime.split(':').map(Number);
  const endTotal = endHour * 60 + endMinute;

  let currentHour = startHour;
  let currentMinute = startMinute;

  while (currentHour * 60 + currentMinute < endTotal) {
    slots.push(`${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`);
    currentMinute += 30;
    if (currentMinute >= 60) {
      currentMinute = 0;
      currentHour += 1;
    }
  }

  return slots;
};

export default function ManageBookingPage() {
  const { salon, salonSlug } = useSalon();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isRTL = language === 'ar' || language === 'tn';

  const [bookingCode, setBookingCode] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [rescheduleDate, setRescheduleDate] = useState(toDateKeyTunis(new Date()));
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  const availableDates = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return [toDateKeyTunis(today), toDateKeyTunis(tomorrow)];
  }, []);

  const timeSlots = useMemo(
    () => generateTimeSlots(salon?.opening_time || '09:00', salon?.closing_time || '18:00'),
    [salon?.opening_time, salon?.closing_time]
  );
  const targetSalonSlug = salon?.slug || salonSlug;

  const canLookup = Boolean(salon?.id && bookingCode.trim() && customerPhone.trim());

  const handleLookup = async () => {
    if (!salon?.id) {
      setError('Salon is not loaded yet.');
      return;
    }

    if (!isValidTunisianPhone(customerPhone)) {
      setError('Please enter a valid Tunisian phone number.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const { data, error: lookupError } = await lookupPublicManagedBooking(salon.id, bookingCode.trim(), customerPhone.trim());

    if (lookupError || !data) {
      setAppointment(null);
      setError(lookupError?.message || 'Booking not found. Check your code and phone.');
      setLoading(false);
      return;
    }

    setAppointment(data);
    setRescheduleDate(data.appointment_date);
    setRescheduleTime(data.appointment_time.slice(0, 5));
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!salon?.id) {
      return;
    }

    if (!appointment) {
      setError('Lookup your booking first.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const { deleted, message, error: cancelError } = await cancelPublicManagedBooking(
      salon.id,
      bookingCode.trim(),
      customerPhone.trim()
    );

    if (cancelError || !deleted) {
      setError(cancelError?.message || message || 'Unable to cancel booking.');
      setLoading(false);
      return;
    }

    setAppointment(null);
    setBookingCode('');
    setCustomerPhone('');
    setSuccessMessage(message || 'Booking permanently deleted. Access code removed.');
    setLoading(false);
  };

  const handleReschedule = async () => {
    if (!salon?.id || !appointment) {
      return;
    }

    if (!rescheduleDate || !rescheduleTime) {
      setError('Please select date and time for rescheduling.');
      return;
    }

    setRescheduleLoading(true);
    setError(null);
    setSuccessMessage(null);

    const { data, error: rescheduleError } = await reschedulePublicManagedBooking(
      salon.id,
      bookingCode.trim(),
      customerPhone.trim(),
      rescheduleDate,
      rescheduleTime
    );

    if (rescheduleError || !data) {
      setError(rescheduleError?.message || 'Unable to reschedule booking.');
      setRescheduleLoading(false);
      return;
    }

    setAppointment(data);
    setSuccessMessage('Booking rescheduled successfully.');
    setRescheduleLoading(false);
  };

  const handleBack = () => {
    if (targetSalonSlug) {
      navigate(`/${targetSalonSlug}/book`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-gray-900" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 pt-[env(safe-area-inset-top)] px-6 bg-white/90 backdrop-blur-xl shadow-sm">
        <div className="flex items-center h-16 max-w-md mx-auto">
          <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition">
            <ArrowLeft className={`w-6 h-6 text-gray-900 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <h1 className="flex-1 text-center font-bold text-lg">Manage Booking</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-[calc(env(safe-area-inset-top)+4rem)] px-6 max-w-md mx-auto pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        {!appointment ? (
          // Lookup Form
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Enter your booking details to find your appointment</p>
            </div>

            <div className="bg-white rounded-[32px] p-6 space-y-4 shadow-sm">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600">Booking Code</label>
                <input
                  value={bookingCode}
                  onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A7K9Q2"
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 outline-none focus:border-gray-900 text-center font-mono text-lg font-bold uppercase"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600">Phone Number</label>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Your phone number"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 outline-none focus:border-gray-900"
                />
              </div>
            </div>

            {successMessage && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                <Check className="w-5 h-5" />
                {successMessage}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleLookup}
              disabled={!canLookup || loading}
              className={`w-full py-4 rounded-[24px] font-bold text-lg shadow-lg transition-all active:scale-95 ${
                canLookup && !loading
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? 'Finding...' : 'Find Booking'}
            </button>
          </div>
        ) : (
          // Booking Details & Actions
          <div className="space-y-6">
            {successMessage && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                <Check className="w-5 h-5" />
                {successMessage}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Booking Info Card */}
            <div className="bg-white rounded-[32px] p-6 space-y-4 shadow-sm">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase">Booking Code</p>
                <p className="text-2xl font-bold font-mono tracking-widest mt-1">{appointment.booking_code || bookingCode}</p>
              </div>

              <hr className="border-gray-100" />

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Name</p>
                  <p className="text-lg font-bold mt-1">{appointment.customer_name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase">Date</p>
                    <p className="text-base font-bold mt-1">{formatDisplayDate(appointment.appointment_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase">Time</p>
                    <p className="text-base font-bold mt-1">{appointment.appointment_time}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase">Status</p>
                  <p className={`text-base font-bold mt-1 ${
                    appointment.status === 'Cancelled' ? 'text-red-600' :
                    appointment.status === 'Completed' ? 'text-green-600' :
                    'text-gray-900'
                  }`}>
                    {appointment.status}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleCancel}
                disabled={loading || appointment.status === 'Cancelled' || appointment.status === 'Completed'}
                className={`w-full py-4 rounded-[24px] font-bold text-lg shadow-lg transition-all active:scale-95 ${
                  loading || appointment.status === 'Cancelled' || appointment.status === 'Completed'
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-red-600 text-white'
                }`}
              >
                {loading ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            </div>

            {/* Reschedule Section */}
            {appointment.status !== 'Cancelled' && appointment.status !== 'Completed' && (
              <div className="bg-white rounded-[32px] p-6 space-y-4 shadow-sm">
                <h3 className="font-bold text-lg">Reschedule</h3>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> New Date
                  </label>
                  <select
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 outline-none focus:border-gray-900"
                  >
                    {availableDates.map((date) => (
                      <option key={date} value={date}>{date}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> New Time
                  </label>
                  <select
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 outline-none focus:border-gray-900"
                  >
                    <option value="">Select time</option>
                    {timeSlots.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleReschedule}
                  disabled={rescheduleLoading || !rescheduleDate || !rescheduleTime}
                  className={`w-full py-4 rounded-[24px] font-bold text-lg shadow-lg transition-all active:scale-95 ${
                    rescheduleLoading || !rescheduleDate || !rescheduleTime
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-900 text-white'
                  }`}
                >
                  {rescheduleLoading ? 'Updating...' : 'Reschedule Booking'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
