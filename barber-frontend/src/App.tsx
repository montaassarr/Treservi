import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SalonProvider } from './context/SalonContext';
import { parseDeepLink, saveAppState, restoreAppState, saveSalonPreference } from './utils/stateManager';
import SalonLoginPage from './pages/SalonLoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import DashboardPage from './pages/DashboardPage';
import LandingPage from './pages/LandingPage';
import NotFoundPage from './pages/NotFoundPage';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import BookingPage from './pages/BookingPage';
import ManageBookingPage from './pages/ManageBookingPage';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { SUPERADMIN_DASHBOARD_PATH, SUPERADMIN_LOGIN_PATH, SUPERADMIN_ROUTE_BASE } from './config/securityRoutes';


const AppRoutes: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();


  // Extract user properties from auth context
  const isAuthenticated = auth.status === 'authenticated';
  const userEmail = auth.user?.email || '';
  const userId = auth.user?.id || '';
  const userRole = auth.user?.role || 'owner';
  const staffName = auth.user?.fullName || '';
  const salonId = auth.user?.salonId || '';
  const userSalonSlug = auth.user?.salonSlug || '';
  const isSuperAdmin = Boolean(auth.user?.isSuperAdmin || auth.user?.role === 'super_admin');

  // Track route changes to save state for PWA restoration
  useEffect(() => {
    if (location.pathname === '/' || location.pathname.includes('/login') || location.pathname.startsWith(SUPERADMIN_ROUTE_BASE)) {
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

  // Auto-redirect logic for authenticated and guest users
  useEffect(() => {
    const path = location.pathname;
    const params = new URLSearchParams(location.search);
    const isPWALaunch = params.get('source') === 'pwa' || window.matchMedia('(display-mode: standalone)').matches;

    // Root path handling
    if (path === '/') {
      const deepLink = parseDeepLink(params);

      // If salon param in URL (from QR code), save and redirect
      if (deepLink.salonSlug) {
        saveSalonPreference(deepLink.salonSlug);
        saveAppState(deepLink.route, deepLink.salonSlug, deepLink.params);
        navigate(`/${deepLink.salonSlug}${deepLink.route}`, { replace: true });
        return;
      }

      // ONLY restore previous app state for PWA launches (home screen icon)
      if (isPWALaunch) {
        const savedState = restoreAppState();
        if (savedState && savedState.salonSlug) {
          console.log('[App] Restoring PWA state to:', savedState);
          navigate(`/${savedState.salonSlug}${savedState.route}`, { replace: true });
          return;
        }
      }

      // If authenticated, go to dashboard
      if (isAuthenticated && userSalonSlug) {
        navigate(`/${userSalonSlug}/dashboard`, { replace: true });
        return;
      }

      // If super admin, go to admin dashboard
      if (isAuthenticated && isSuperAdmin) {
        navigate(SUPERADMIN_DASHBOARD_PATH, { replace: true });
        return;
      }

      // Otherwise stay on landing page
      return;
    }

    // Authenticated users only
    if (isAuthenticated) {
      // Super admin redirects
      if (isSuperAdmin) {
        if (path === '/' || path.endsWith('/login') || path.includes('/dashboard')) {
          if (path !== SUPERADMIN_DASHBOARD_PATH) {
            navigate(SUPERADMIN_DASHBOARD_PATH, { replace: true });
          }
        }
        return;
      }

      // Regular user redirects
      if (userSalonSlug) {
        if (path === '/' || path.endsWith('/login')) {
          navigate(`/${userSalonSlug}/dashboard`, { replace: true });
        }
      }
    }
  }, [isAuthenticated, userSalonSlug, isSuperAdmin, location.pathname, location.search, navigate]);

  const handleLogout = async () => {
    const wasSuperAdmin = isSuperAdmin;
    const previousSlug = userSalonSlug;
    
    await auth.logout();

    if (wasSuperAdmin) {
      navigate(SUPERADMIN_LOGIN_PATH, { replace: true });
    } else if (previousSlug) {
      navigate(`/${previousSlug}/login`, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Super Admin Routes */}
      <Route path={SUPERADMIN_LOGIN_PATH} element={
        isAuthenticated && isSuperAdmin ? (
          <Navigate to={SUPERADMIN_DASHBOARD_PATH} replace />
        ) : (
          <AdminLoginPage onLogin={auth.login} />
        )
      } />

      <Route path={SUPERADMIN_DASHBOARD_PATH} element={
        <SalonProvider>
          <ProtectedRoute
            requireAuth={true}
            requireSuperAdmin={true}
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
            <SalonLoginPage onLogin={auth.login} />
          )}
        </SalonProvider>
      } />

      {/* Salon Dashboard - Direct route without nesting */}
      <Route path="/:salonSlug/dashboard" element={
        <SalonProvider>
          <ProtectedRoute
            requireAuth={true}
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

      <Route path="/:salonSlug/manage" element={
        <SalonProvider>
          <div className="w-full h-screen bg-[#FAFAFA] overflow-y-auto no-scrollbar">
            <ManageBookingPage />
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
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppRoutes />
        <PWAInstallPrompt />
      </BrowserRouter>
    </AuthProvider>
  </LanguageProvider>
);

export default App;
