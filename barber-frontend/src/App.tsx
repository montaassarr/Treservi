import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { apiClient, authStorage, AuthUser } from './services/apiClient';
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

  const applyUserState = useCallback((user: AuthUser) => {
    setUserEmail(user.email || '');
    setUserId(user.id || '');
    setUserRole(user.role || 'owner');
    setStaffName(user.fullName || '');
    setSalonId(user.salonId || '');
    setUserSalonSlug(user.salonSlug || '');
    setIsSuperAdmin(Boolean(user.isSuperAdmin || user.role === 'super_admin'));
  }, []);

  const resetAuthState = useCallback(() => {
    setIsAuthenticated(false);
    setUserEmail('');
    setUserId('');
    setUserRole('owner');
    setStaffName('');
    setSalonId('');
    setUserSalonSlug('');
    setIsSuperAdmin(false);
  }, []);

  // Track route changes to save state for PWA restoration
  useEffect(() => {
    if (location.pathname === '/' || location.pathname.includes('/login') || location.pathname.startsWith('/admin')) {
      return; // Skip saving state for these paths
    }

    const pathParts = location.pathname.split('/').filter(Boolean);
    // Expected format: /salonSlug/route
    if (pathParts.length >= 2) {
      const possibleSlug = pathParts[0];
      const route = '/' + pathParts.slice(1).join('/');

      if (possibleSlug) {
        saveAppState(route, possibleSlug);
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      console.log('[App] Starting initAuth');
      try {
        const token = authStorage.getToken();
        if (!token) {
          if (mounted) resetAuthState();
          return;
        }

        const me = await withTimeout(apiClient.getMe(), 4000, null as any);
        if (me && mounted) {
          setIsAuthenticated(true);
          applyUserState(me);
        } else if (mounted) {
          authStorage.clearToken();
          resetAuthState();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        if (mounted) {
          authStorage.clearToken();
          resetAuthState();
        }
      } finally {
        if (mounted) {
          console.log('[App] initAuth finished, setting isLoadingAuth false');
          setIsLoadingAuth(false);
        }
      }
    };

    // Start init
    initAuth();

    return () => {
      mounted = false;
    };
  }, [applyUserState, resetAuthState, withTimeout]);

  // Save current route for PWA state restoration
  useEffect(() => {
    const path = location.pathname;
    // Extract salon slug from path like /hamdi/dashboard (not /hamdi-salon/dashboard)
    const match = path.match(/^\/([^\/]+)\/(dashboard|book|appointments|staff|services|settings)$/);
    if (match) {
      const [, salonSlug, route] = match;
      saveAppState(`/${route}`, salonSlug);
    }
  }, [location.pathname]);

  const handleLogin = useCallback(async (_email: string) => {
    setIsLoadingAuth(true);
    try {
      const me = await withTimeout(apiClient.getMe(), 4000, null as any);
      if (me) {
        setIsAuthenticated(true);
        applyUserState(me);
      }
    } catch (error) {
      console.error('Login sync failed:', error);
    } finally {
      setIsLoadingAuth(false);
    }
  }, [applyUserState, withTimeout]);

  const handleLogout = useCallback(async () => {
    const wasSuperAdmin = isSuperAdmin;
    const previousSlug = userSalonSlug;
    authStorage.clearToken();
    resetAuthState();

    if (wasSuperAdmin) {
      navigate('/admin/login', { replace: true });
    } else if (previousSlug) {
      navigate(`/${previousSlug}/login`, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate, isSuperAdmin, userSalonSlug, resetAuthState]);

  // Auto-redirect logic for root path with salon detection (Deep Linking)
  useEffect(() => {
    const path = location.pathname;
    const params = new URLSearchParams(location.search);
    const isPWALaunch = params.get('source') === 'pwa' || window.matchMedia('(display-mode: standalone)').matches;

    // Root path - check for salon param or restore previous state (PWA only)
    if (path === '/') {
      const deepLink = parseDeepLink(params);

      // If salon param in URL (from QR code), save and redirect
      if (deepLink.salonSlug) {
        saveSalonPreference(deepLink.salonSlug);
        saveAppState(deepLink.route, deepLink.salonSlug, deepLink.params);
        // Redirect to booking page without params
        navigate(`/${deepLink.salonSlug}${deepLink.route}`, { replace: true });
        return;
      }

      // ONLY restore previous app state for PWA launches (home screen icon)
      // Regular web visits should always show the generic landing page
      if (isPWALaunch) {
        const savedState = restoreAppState();
        if (savedState && savedState.salonSlug) {
          console.log('[App] Restoring PWA state to:', savedState);
          navigate(`/${savedState.salonSlug}${savedState.route}`, { replace: true });
          return;
        }
      }

      // If user is authenticated and PWA, go to dashboard
      if (isPWALaunch && isAuthenticated && !isLoadingAuth && userSalonSlug) {
        navigate(`/${userSalonSlug}/dashboard`, { replace: true });
        return;
      }

      // If user is authenticated (but not PWA), show dashboard
      if (isAuthenticated && !isLoadingAuth && userSalonSlug) {
        navigate(`/${userSalonSlug}/dashboard`, { replace: true });
        return;
      }
      
      // Otherwise, stay on landing page (generic, no redirect)
    }

    // Authenticated users redirect
    if (isAuthenticated && !isLoadingAuth) {
      // If super admin and on generic pages or salon pages
      if (isSuperAdmin) {
        // Force redirect to admin dashboard if on root, login, or any tenant dashboard
        if (path === '/' || path.endsWith('/login') || path.includes('/dashboard')) {
          // Only redirect if NOT already on the admin dashboard
          if (path !== '/admin/dashboard') {
            navigate('/admin/dashboard', { replace: true });
            return;
          }
        }
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
            <SuperAdminDashboard onLogout={handleLogout} />
          </ProtectedRoute>
        </SalonProvider>
      } />

      {/* Salon Login - Direct route without nesting */}
      <Route path="/:salonSlug/login" element={
        <SalonProvider>
          {isAuthenticated && userSalonSlug ? (
            <Navigate to={`/${userSalonSlug}/dashboard`} replace />
          ) : (
            <LoginPage onLogin={handleLogin} isLoadingAuth={isLoadingAuth} />
          )}
        </SalonProvider>
      } />

      {/* Salon Dashboard - Direct route without nesting */}
      <Route path="/:salonSlug/dashboard" element={
        <SalonProvider>
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
        </SalonProvider>
      } />

      {/* Public Booking Page - Direct route without nesting */}
      <Route path="/:salonSlug/book" element={
        <SalonProvider>
          <div className="w-full h-screen bg-[#FAFAFA] overflow-y-auto no-scrollbar">
            <BookingPage />
          </div>
        </SalonProvider>
      } />

      {/* 404 Routes */}
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
