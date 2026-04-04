import React from 'react';
import { Navigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSalon } from '../context/SalonContext';
import { SUPERADMIN_LOGIN_PATH, SUPERADMIN_ROUTE_BASE } from '../config/securityRoutes';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requireAuth?: boolean;
  requireSuperAdmin?: boolean;
}

const LoadingScreen: React.FC = () => (
  <div className="w-full min-h-screen flex items-center justify-center bg-white dark:bg-black">
    <div className="w-12 h-12 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin"></div>
  </div>
);

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireSuperAdmin = false,
}) => {
  const auth = useAuth();
  const { salonSlug } = useParams<{ salonSlug: string }>();
  const { salon, isLoading: isSalonLoading, error } = useSalon();
  const location = useLocation();
  const normalizedSalonSlug = salonSlug?.trim();

  const hasInvalidSalonSlug = Boolean(
    normalizedSalonSlug &&
      (normalizedSalonSlug.startsWith(':') ||
        !/^[a-zA-Z0-9-]+$/.test(normalizedSalonSlug))
  );

  if (hasInvalidSalonSlug) {
    return <Navigate to="/404" replace />;
  }

  // Show loading only while fetching salon data (if needed)
  if (normalizedSalonSlug && isSalonLoading) {
    return <LoadingScreen />;
  }

  // If super admin route is required and user is not super admin
  if (requireSuperAdmin && (!auth.user || auth.user.role !== 'super_admin')) {
    if (auth.user?.salonSlug) {
      return <Navigate to={`/${auth.user.salonSlug}/dashboard`} replace />;
    }
    return <Navigate to="/" replace />;
  }

  // If salon-specific route and salon not found, show 404
  if (normalizedSalonSlug && (error || !salon)) {
    return <Navigate to="/404" replace />;
  }

  // If auth is required and user is not authenticated
  if (requireAuth && auth.status === 'guest') {
    if (normalizedSalonSlug) {
      return <Navigate to={`/${normalizedSalonSlug}/login`} replace />;
    } else if (location.pathname.startsWith(SUPERADMIN_ROUTE_BASE)) {
      return <Navigate to={SUPERADMIN_LOGIN_PATH} replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  // If authenticated, check if user is accessing their own salon (non-super-admin only)
  if (requireAuth && auth.status === 'authenticated' && auth.user && normalizedSalonSlug) {
    const isSuperAdmin = auth.user.role === 'super_admin';
    if (!isSuperAdmin) {
      // User is trying to access a different salon's dashboard
      if (normalizedSalonSlug !== auth.user.salonSlug) {
        // Redirect to their own salon
        return <Navigate to={`/${auth.user.salonSlug}/dashboard`} replace />;
      }
    }
  }

  return children;
};

export default ProtectedRoute;
