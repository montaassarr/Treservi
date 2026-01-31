import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import { LanguageProvider } from './context/LanguageContext';
import { SalonProvider } from './context/SalonContext';
import { parseDeepLink, saveAppState, restoreAppState, saveSalonPreference } from './utils/stateManager';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import DashboardPage from './pages/DashboardPage';
import LandingPage from './pages/LandingPage';
import NotFoundPage from './pages/NotFoundPage';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import BookingPage from './pages/BookingPage';
import PWAInstallPrompt from './components/PWAInstallPrompt';

const LoadingScreen: React.FC = () => (
  <div className="w-full min-h-screen flex items-center justify-center bg-white dark:bg-black">
    <div className="w-12 h-12 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin"></div>
  </div>
);

const AppRoutes: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState<'owner' | 'staff' | 'super_admin'>('owner');
  const [staffName, setStaffName] = useState('');
  const [salonId, setSalonId] = useState('');
  const [userSalonSlug, setUserSalonSlug] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]);
  };

  const fetchUserData = useCallback(async (userId: string, email: string) => {
    if (!supabase) return;
    try {
      // First, check if user is in staff table
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, full_name, role, salon_id, is_super_admin')
        .eq('id', userId)
        .single();
      if (staffData) {
        // User is a staff member or owner
        setUserRole(staffData.role);
        setStaffName(staffData.full_name);
        setSalonId(staffData.salon_id || '');
        setIsSuperAdmin(staffData.is_super_admin || false);
        
        // Fetch the salon slug
        if (staffData.salon_id) {
          try {
            const { data: salonData } = await supabase
                .from('salons')
                .select('slug')
                .eq('id', staffData.salon_id)
                .single();
            
            if (salonData?.slug) {
                setUserSalonSlug(salonData.slug);
            }
          } catch (e) {
            console.error(e);
          }
        }
      } else {
        // Fallback: check if owner by email
        const { data: salonData } = await supabase
          .from('salons')
          .select('id, slug')
          .eq('owner_email', email)
          .single();

        if (salonData) {
          setSalonId(salonData.id);
          setUserSalonSlug(salonData.slug || '');
          setUserRole('owner');
          setIsSuperAdmin(false);
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      console.log('[App] Starting initAuth');
      if (!supabase) {
        if (mounted) setIsLoadingAuth(false);
        return;
      }
      
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          4000,
          { data: { session: null } } as any
        );
        
        if (session?.user && mounted) {
           console.log('[App] Session found:', session.user.id);
           setUserEmail(session.user.email || '');
           setUserId(session.user.id);
           setIsAuthenticated(true);
           // Fetch user data asynchronously without blocking
            await withTimeout(fetchUserData(session.user.id, session.user.email || ''), 4000, undefined as any);
        } else if (mounted) {
           setIsAuthenticated(false);
        }
      } catch (error) {
         console.error('Auth check failed:', error);
         if (mounted) setIsAuthenticated(false);
      } finally {
         if (mounted) {
            console.log('[App] initAuth finished, setting isLoadingAuth false');
            setIsLoadingAuth(false);
         }
      }
    };

    // Start init
    initAuth();

     const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
       if (!mounted) return;
       
       if (session?.user) {
          setIsAuthenticated(true);
          setUserEmail(session.user.email || '');
          setUserId(session.user.id);
          // Don't set loading false immediately, wait for user data
         await withTimeout(fetchUserData(session.user.id, session.user.email || ''), 4000, undefined as any);
          setIsLoadingAuth(false);
       } else {
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
          setUserEmail('');
          setUserId('');
          // Logic for redirecting logged out users is handled by ProtectedRoute
       }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchUserData]);

  const handleLogin = useCallback(async (email: string) => {
    // This is essentially a callback for UI updates, but auth state is handled by listener
    setUserEmail(email);
  }, []);

  const handleLogout = useCallback(async () => {
    const wasSuperAdmin = isSuperAdmin;
    const previousSlug = userSalonSlug;

    if (supabase) {
      await supabase.auth.signOut();
    }
    
    setIsAuthenticated(false);
    setUserEmail('');
    setUserId('');
    setUserRole('owner');
    setStaffName('');
    setSalonId('');
    setUserSalonSlug('');
    setIsSuperAdmin(false);
    
    if (wasSuperAdmin) {
        navigate('/admin/login', { replace: true });
    } else if (previousSlug) {
        navigate(`/${previousSlug}/login`, { replace: true });
    } else {
        navigate('/', { replace: true });
    }
  }, [navigate, isSuperAdmin, userSalonSlug]);

  // Auto-redirect logic for root path with salon detection (Deep Linking)
  useEffect(() => {
    const path = location.pathname;
    
    // Root path - check for salon param or restore previous state
    if (path === '/') {
      const params = new URLSearchParams(location.search);
      const deepLink = parseDeepLink(params);
      
      // If salon param in URL (from QR code), save and redirect
      if (deepLink.salonSlug) {
        saveSalonPreference(deepLink.salonSlug);
        saveAppState(deepLink.route, deepLink.salonSlug, deepLink.params);
        // Redirect to booking page without params
        navigate(`/${deepLink.salonSlug}${deepLink.route}`, { replace: true });
        return;
      }
      
      // Try to restore previous app state (like Facebook does)
      const savedState = restoreAppState();
      if (savedState && savedState.salonSlug) {
        navigate(`/${savedState.salonSlug}${savedState.route}`, { replace: true });
        return;
      }
      
      // If user is authenticated, show dashboard
      if (isAuthenticated && !isLoadingAuth && userSalonSlug) {
        navigate(`/${userSalonSlug}/dashboard`, { replace: true });
        return;
      }
    }
    
    // Authenticated users redirect
    if (isAuthenticated && !isLoadingAuth) {
      // If super admin and on generic pages or salon pages
      if (isSuperAdmin && (path === '/' || path.endsWith('/login'))) {
          navigate('/admin/dashboard', { replace: true });
          return;
      }
      
      if (userSalonSlug && !isSuperAdmin) {
         if (path === '/' || path.endsWith('/login')) {
             navigate(`/${userSalonSlug}/dashboard`, { replace: true });
             return;
         }
      }
    }
  }, [isAuthenticated, isLoadingAuth, userSalonSlug, isSuperAdmin, location.pathname, location.search, navigate]);

  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Super Admin Routes */}
      <Route path="/admin/login" element={
        isAuthenticated && isSuperAdmin ? (
          <Navigate to="/admin/dashboard" replace />
        ) : (
          <AdminLoginPage onLogin={handleLogin} isLoadingAuth={isLoadingAuth} />
        )
      } />
      
      <Route path="/admin/dashboard" element={
        <SalonProvider>
          <ProtectedRoute
            isAuthenticated={isAuthenticated}
            isLoadingAuth={isLoadingAuth}
            userSalonSlug={userSalonSlug}
            requireAuth={true}
            requireSuperAdmin={true}
            isSuperAdmin={isSuperAdmin}
          >
            <SuperAdminDashboard />
          </ProtectedRoute>
        </SalonProvider>
      } />

      {/* Salon Routes Wrapper */}
      <Route path="/:salonSlug/*" element={
        <SalonProvider>
          <Routes>
            {/* Salon Login */}
            <Route path="login" element={
               isAuthenticated && userSalonSlug ? (
                 <Navigate to={`/${userSalonSlug}/dashboard`} replace />
               ) : (
                 <LoginPage onLogin={handleLogin} isLoadingAuth={isLoadingAuth} />
               )
            } />

            {/* Salon Dashboard */}
            <Route path="dashboard" element={
              <ProtectedRoute
                isAuthenticated={isAuthenticated}
                isLoadingAuth={isLoadingAuth}
                userSalonSlug={userSalonSlug}
                requireAuth={true}
                isSuperAdmin={isSuperAdmin}
              >
                  <DashboardPage 
                    salonId={salonId} 
                    userId={userId}
                    userRole={userRole}
                    staffName={staffName}
                    onLogout={handleLogout} 
                  />
              </ProtectedRoute>
            } />

            {/* Public Booking Page */}
            <Route path="book" element={
               <div className="w-full h-screen bg-[#FAFAFA] overflow-y-auto no-scrollbar">
                 <BookingPage />
               </div>
            } />
            
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </SalonProvider>
      } />

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <LanguageProvider>
    <BrowserRouter>
      <AppRoutes />
      <PWAInstallPrompt />
    </BrowserRouter>
  </LanguageProvider>
);

export default App;
