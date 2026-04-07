import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Edit3 } from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [salonSlug, setSalonSlug] = useState('');

  const handleNavigateToSalon = (route: string) => {
    if (!salonSlug.trim()) {
      alert('Please enter your salon name');
      return;
    }
    navigate(`/${salonSlug.trim().toLowerCase()}${route}`);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo Section */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-3xl bg-white shadow-soft-glow flex items-center justify-center">
              <Calendar className="w-8 h-8 text-gray-900" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Reservi</h1>
            <p className="text-sm text-gray-600 mt-2">Book or manage your salon appointment</p>
          </div>
        </div>

        {/* Salon Input Card */}
        <div className="bg-white rounded-[32px] p-6 shadow-soft-glow space-y-4">
          <label className="text-sm font-semibold text-gray-700">Salon Name</label>
          <input
            type="text"
            value={salonSlug}
            onChange={(e) => setSalonSlug(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleNavigateToSalon('/book')}
            placeholder="e.g. my-barber-shop"
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 outline-none focus:border-gray-900 focus:ring-0 transition-colors text-gray-900 placeholder:text-gray-400"
          />
          <p className="text-xs text-gray-500">Enter your salon's name to continue</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleNavigateToSalon('/book')}
            className="w-full bg-gray-900 text-white font-bold py-4 rounded-[24px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-gray-800"
          >
            <Calendar className="w-5 h-5" />
            Book Appointment
          </button>

          <button
            onClick={() => handleNavigateToSalon('/manage')}
            className="w-full bg-white text-gray-900 font-bold py-4 rounded-[24px] border-2 border-gray-900 shadow-soft-glow active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-gray-50"
          >
            <Edit3 className="w-5 h-5" />
            Manage Booking
          </button>
        </div>

        {/* Info Section */}
        <div className="text-center">
          <p className="text-xs text-gray-500 font-mono">
            reservi.app/<span className="text-gray-900 font-semibold">salon-name</span>/book
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
