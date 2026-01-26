import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

const LoadingScreen: React.FC = () => (
  <div className="w-full h-screen flex items-center justify-center bg-white dark:bg-black">
    <div className="w-12 h-12 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin"></div>
  </div>
);

const AppRoutes: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [salonId, setSalonId] = useState('salon-1');
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const navigate = useNavigate();

  const fetchOwnerSalon = useCallback(async (email: string) => {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from('salons')
        .select('id')
        .eq('owner_email', email)
        .single();

      if (data) {
        setSalonId(data.id);
      }
    } catch (err) {
      console.error('Error fetching salon:', err);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        console.error('Supabase client is not configured.');
        setIsLoadingAuth(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setOwnerEmail(session.user.email);
        setIsAuthenticated(true);
        await fetchOwnerSalon(session.user.email);
      }
      setIsLoadingAuth(false);
    };

    checkAuth();
  }, [fetchOwnerSalon]);

  const handleLogin = useCallback(async (email: string) => {
    setOwnerEmail(email);
    setIsAuthenticated(true);
    await fetchOwnerSalon(email);
    navigate('/dashboard', { replace: true });
  }, [fetchOwnerSalon, navigate]);

  const handleLogout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsAuthenticated(false);
    setOwnerEmail('');
    setSalonId('salon-1');
    navigate('/login', { replace: true });
  }, [navigate]);

  const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    if (isLoadingAuth) return <LoadingScreen />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return children;
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to="/dashboard" replace />
            : <LoginPage onLogin={handleLogin} isLoadingAuth={isLoadingAuth} />
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage salonId={salonId} onLogout={handleLogout} />
          </RequireAuth>
        }
      />
      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

export default App;
