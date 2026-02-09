import React from 'react';
import { BookingState, Translations } from '../../types';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { isValidTunisianPhone, getTunisianPhoneErrorMessage } from '../../utils/validationUtils';
import Avatar from '../Avatar';

interface Props {
  bookingData: BookingState;
  onNameChange: (val: string) => void;
  onPhoneChange: (val: string) => void;
  t: Translations;
  lang: string;
}

export const Step4Contact: React.FC<Props> = ({ bookingData, onNameChange, onPhoneChange, t, lang }) => {
  // Validate Tunisian phone number: 8 digits with valid carrier prefix
  const isPhoneValid = bookingData.customerPhone.length === 0 || isValidTunisianPhone(bookingData.customerPhone);
  const showPhoneError = bookingData.customerPhone.length > 0 && !isPhoneValid;
  const phoneErrorMessage = showPhoneError ? getTunisianPhoneErrorMessage(bookingData.customerPhone) : null;

  // Locale for date
  const locale = lang === 'ar' ? 'ar-TN' : lang === 'fr' ? 'fr-FR' : 'en-US';

  return (
    <div className="space-y-8">
      <div className="bg-gray-900 text-white p-6 rounded-[32px] shadow-xl">
        <h2 className="text-xl font-bold mb-6">{t.bookingSummary}</h2>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-gray-700">
            <div className="relative">
              <Avatar name={bookingData.selectedStaff?.name || 'Staff'} role="staff" size="xl" showRing />
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase font-medium">{t.specialist}</p>
              <p className="font-bold text-lg">{bookingData.selectedStaff?.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 p-3 rounded-2xl">
              <div className="flex items-center gap-2 mb-1 text-gray-400">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">{t.date}</span>
              </div>
              <p className="font-semibold">{bookingData.selectedDate?.toLocaleDateString(locale)}</p>
            </div>
            <div className="bg-gray-800 p-3 rounded-2xl">
              <div className="flex items-center gap-2 mb-1 text-gray-400">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium">{t.time}</span>
              </div>
              <p className="font-semibold">{bookingData.selectedTime}</p>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-2xl flex justify-between items-center">
            <div>
              <p className="text-gray-400 text-xs mb-1">{t.service}</p>
              <p className="font-bold">{bookingData.selectedService?.name}</p>
            </div>
            <p className="text-xl font-bold text-green-400">{bookingData.selectedService?.price} DT</p>
          </div>
          
          {bookingData.notes && (
             <div className="bg-gray-800 p-3 rounded-2xl">
                <p className="text-gray-400 text-xs mb-1">Notes</p>
                <p className="text-sm text-gray-300 italic">"{bookingData.notes}"</p>
             </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">{t.yourDetails}</h2>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 ml-1">{t.fullName}</label>
            <input
              type="text"
              value={bookingData.customerName}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all shadow-sm"
              placeholder="e.g. Robert Fox"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-gray-700 ml-1">{t.phoneNumber}</label>
              {showPhoneError && (
                <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {phoneErrorMessage || t.invalidPhone}
                </span>
              )}
            </div>
            <input
              type="tel"
              value={bookingData.customerPhone}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) onPhoneChange(val);
              }}
              className={`w-full bg-white border rounded-2xl p-4 text-gray-900 font-medium focus:outline-none focus:ring-2 transition-all shadow-sm ${
                showPhoneError ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-gray-900 focus:border-transparent'
              }`}
              placeholder="e.g. 50123456"
              maxLength={15}
            />
          </div>
        </div>
        
        <div className="bg-green-50 text-green-700 p-4 rounded-2xl text-xs font-semibold flex gap-2 items-center">
           <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
           {t.whatsappConfirm}
        </div>
      </div>
    </div>
  );
};
