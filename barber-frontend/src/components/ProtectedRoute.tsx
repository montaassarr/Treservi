import React, { useEffect } from 'react';
import { Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSalon } from '../context/SalonContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  userSalonSlug: string;
  requireAuth?: boolean;
  requireSuperAdmin?: boolean;
  isSuperAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  isAuthenticated,
  isLoadingAuth,
  userSalonSlug,
  requireAuth = true,
  requireSuperAdmin = false,
  isSuperAdmin = false,
}) => {
  const { salonSlug } = useParams<{ salonSlug: string }>();
  const { salon, isLoading: isSalonLoading, error } = useSalon();
  const location = useLocation();

  // Show loading while checking auth or salon
  if (isLoadingAuth || (salonSlug && isSalonLoading)) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // If super admin route is required and user is not super admin
  if (requireSuperAdmin && !isSuperAdmin) {
     if (userSalonSlug) {
         return <Navigate to={`/${userSalonSlug}/dashboard`} replace />;
     }
     return <Navigate to="/" replace />;
  }

  // If salon-specific route and salon not found, show 404
  if (salonSlug && (error || !salon)) {
    return <Navigate to="/404" replace />;
  }

  // If auth is required and user is not authenticated
  if (requireAuth && !isAuthenticated) {
    if (salonSlug) {
      return <Navigate to={`/${salonSlug}/login`} replace />;
    } else if (location.pathname.startsWith('/admin')) {
      return <Navigate to="/admin/login" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  // If authenticated, check if user is accessing their own salon
  if (requireAuth && isAuthenticated && userSalonSlug && salonSlug) {
    // Super admins can bypass salon check
    if (!isSuperAdmin) {
      // User is trying to access a different salon's dashboard
      if (salonSlug !== userSalonSlug) {
        // Redirect to their own salon
        return <Navigate to={`/${userSalonSlug}/dashboard`} replace />;
      }
    }
  }

  return children;
};

export default ProtectedRoute;
