import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import { LanguageProvider } from './context/LanguageContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

const LoadingScreen: React.FC = () => (
  <div className="w-full h-screen flex items-center justify-center bg-white dark:bg-black">
    <div className="w-12 h-12 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin"></div>
  </div>
);

const AppRoutes: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState<'owner' | 'staff'>('owner');
  const [staffName, setStaffName] = useState('');
  const [salonId, setSalonId] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUserData = useCallback(async (userId: string, email: string) => {
    if (!supabase) return;
    try {
      // First, check if user is in staff table
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, full_name, role, salon_id')
        .eq('id', userId)
        .single();

      if (staffData) {
        // User is a staff member or owner
        setUserRole(staffData.role);
        setStaffName(staffData.full_name);
        setSalonId(staffData.salon_id || '');
      } else {
        // Fallback: check if owner by email
        const { data: salonData } = await supabase
          .from('salons')
          .select('id')
          .eq('owner_email', email)
          .single();

        if (salonData) {
          setSalonId(salonData.id);
          setUserRole('owner');
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let initTimeout: NodeJS.Timeout;

    const initAuth = async () => {
      if (!supabase) return;
      
      try {
        // Check active session with 5s timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );

        const { data: { session } } = (await Promise.race([
          sessionPromise,
          timeoutPromise,
        ])) as any;
        
        if (session?.user && mounted) {
           setUserEmail(session.user.email || '');
           setUserId(session.user.id);
           setIsAuthenticated(true);
           // Fetch user data asynchronously without blocking
           fetchUserData(session.user.id, session.user.email || '').catch(err =>
             console.error('Failed to fetch user data:', err)
           );
        } else if (mounted) {
           setIsAuthenticated(false);
        }
      } catch (error) {
         console.error('Auth check failed:', error);
         if (mounted) setIsAuthenticated(false);
      } finally {
         if (mounted) setIsLoadingAuth(false);
      }
    };

    // Start init immediately
    initAuth();

    // Also set up listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
       if (!mounted) return;
       
       if (session?.user) {
          setIsAuthenticated(true);
          setUserEmail(session.user.email || '');
          setUserId(session.user.id);
          setIsLoadingAuth(false);
          // Fetch user data without blocking
          fetchUserData(session.user.id, session.user.email || '').catch(err =>
            console.error('Failed to fetch user data:', err)
          );
          
          // Auto-redirect to dashboard if on login page and authenticated
          if (location.pathname === '/login' || location.pathname === '/') {
              navigate('/dashboard', { replace: true });
          }

       } else {
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
          setUserEmail('');
          setUserId('');
          if (location.pathname !== '/login') {
             navigate('/login', { replace: true });
          }
       }
    });

    return () => {
      mounted = false;
      clearTimeout(initTimeout);
      subscription?.unsubscribe();
    };
  }, []);

  const handleLogin = useCallback(async (email: string) => {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserEmail(email);
      setUserId(session.user.id);
      setIsAuthenticated(true);
      await fetchUserData(session.user.id, email);
      // Navigate to dashboard or stay on current route
      const currentPath = location.pathname;
      if (currentPath === '/login' || currentPath === '/') {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [fetchUserData, navigate, location.pathname]);

  const handleLogout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsAuthenticated(false);
    setUserEmail('');
    setUserId('');
    setUserRole('owner');
    setStaffName('');
    setSalonId('');
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
            <DashboardPage 
              salonId={salonId} 
              userId={userId}
              userRole={userRole}
              staffName={staffName}
              onLogout={handleLogout} 
            />
          </RequireAuth>
        }
      />
      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <LanguageProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </LanguageProvider>
);

export default App;
