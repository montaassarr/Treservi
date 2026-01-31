import React, { useState } from 'react';
import { Scissors, Lock, Mail, ArrowRight } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface LoginProps {
  onLogin: (email: string) => void;
  title?: string;
  subtitle?: string;
  logoUrl?: string; // Optional logo override
}

const Login: React.FC<LoginProps> = ({ 
  onLogin, 
  title = "Barber Owner", 
  subtitle = "Manage your salon staff",
  logoUrl 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Sign in with Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Store the user session
        localStorage.setItem('user_email', data.user.email || '');
        onLogin(data.user.email || '');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-start justify-center pt-8 pb-12 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-treservi-accent/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-md p-4">
            <div className="bg-white dark:bg-treservi-card-dark rounded-[48px] shadow-2xl p-8 md:p-12 border border-gray-100 dark:border-gray-800/50 backdrop-blur-xl animate-in fade-in zoom-in duration-500">
                
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-10">
                    <div className="w-20 h-20 bg-treservi-accent rounded-[30px] flex items-center justify-center shadow-neon-glow mb-6 transform hover:rotate-6 transition-all duration-300 group cursor-pointer overflow-hidden">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Salon Logo" className="w-full h-full object-cover" />
                        ) : (
                          <Scissors className="text-white w-10 h-10 group-hover:scale-110 transition-transform" />
                        )}
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight text-center">{title}</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-center">{subtitle}</p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 text-sm">
                    {error}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <div className="relative group">
                            <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-treservi-accent transition-colors w-5 h-5" />
                            <input 
                              id="login-email"
                              name="email"
                              autoComplete="email"
                              type="email" 
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full bg-gray-50 dark:bg-[#121212] border border-transparent focus:bg-white dark:focus:bg-[#151515] focus:border-treservi-accent rounded-full py-4 pl-14 pr-6 outline-none transition-all dark:text-white font-medium shadow-inner"
                              placeholder="owner@barbershop.com"
                              required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="relative group">
                            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-treservi-accent transition-colors w-5 h-5" />
                            <input 
                              id="login-password"
                              name="password"
                              autoComplete="current-password"
                              type="password" 
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full bg-gray-50 dark:bg-[#121212] border border-transparent focus:bg-white dark:focus:bg-[#151515] focus:border-treservi-accent rounded-full py-4 pl-14 pr-6 outline-none transition-all dark:text-white font-medium shadow-inner"
                              placeholder="••••••••"
                              required
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-treservi-accent hover:bg-green-500 text-white font-bold py-4 rounded-full shadow-neon-glow transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 mt-6 group disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <span>Sign In</span>
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

            </div>
            
            <p className="text-center text-gray-400 text-xs mt-8">
                &copy; 2024 Barber Management. All rights reserved.
            </p>
        </div>
    </div>
  );
};

export default Login;
