import React from 'react';
import { useSalon } from '../context/SalonContext';
import { useParams, Navigate } from 'react-router-dom';
import { Scissors, Lock, Mail, ArrowRight } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface LoginPageProps {
  onLogin: (email: string) => void;
  isLoadingAuth: boolean;
  isAuthenticated?: boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, isLoadingAuth, isAuthenticated }) => {
  const { salonSlug } = useParams<{ salonSlug: string }>();
  const { salon, isLoading: isSalonLoading, error } = useSalon();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [loginError, setLoginError] = React.useState('');

  if (salonSlug && error) {
    return <Navigate to="/404" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setLoginError(signInError.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        localStorage.setItem('user_email', data.user.email || '');
        onLogin(data.user.email || '');
      }
    } catch (err) {
      setLoginError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  // Determine branding - use salon data if available, otherwise defaults
  const title = salon?.name || salonSlug || "Salon Login";
  const logoUrl = salon?.logo_url;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Simple Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8">
          
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg mb-4 overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Scissors className="text-white w-8 h-8" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center">{title}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Sign in to continue</p>
          </div>

          {/* Error */}
          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {loginError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-700 border-0 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                placeholder="Email"
                required
                autoComplete="email"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-700 border-0 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                placeholder="Password"
                required
                autoComplete="current-password"
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
