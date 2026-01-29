import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 text-center">
        <div className="mb-6">
          <AlertCircle className="w-20 h-20 mx-auto text-red-500" strokeWidth={1.5} />
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          404
        </h1>
        
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Salon Not Found
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          The salon you're looking for doesn't exist or the URL is incorrect.
        </p>
        
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-treservi-accent hover:bg-green-600 text-white font-semibold rounded-full transition-all transform hover:scale-105"
        >
          <Home size={20} />
          Go to Home
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
