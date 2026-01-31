import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, Calendar, Users, Sparkles } from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-treservi-accent/5 via-white to-green-50 dark:from-gray-900 dark:via-black dark:to-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8 inline-flex items-center justify-center w-20 h-20 bg-treservi-accent/10 rounded-3xl">
            <Scissors className="w-10 h-10 text-treservi-accent" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6">
            Welcome to <span className="text-treservi-accent">Reservi</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
            Modern salon management platform. Streamline appointments, manage staff, and grow your business.
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
              <Calendar className="w-12 h-12 text-treservi-accent mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2 dark:text-white">Smart Booking</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Effortless appointment scheduling
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
              <Users className="w-12 h-12 text-treservi-accent mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2 dark:text-white">Staff Management</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Organize your team efficiently
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
              <Sparkles className="w-12 h-12 text-treservi-accent mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2 dark:text-white">Modern Interface</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Beautiful, intuitive design
              </p>
            </div>
          </div>

          {/* Demo Button */}
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              To access your salon dashboard, use your salon's unique URL
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 font-mono">
              Example: reservi.app/<span className="text-treservi-accent font-bold">your-salon-name</span>/dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>&copy; 2026 Reservi. Modern Salon Management.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
