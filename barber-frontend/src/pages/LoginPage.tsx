import React, { useEffect } from 'react';
import Login from '../components/Login';
import { useSalon } from '../context/SalonContext';
import { useParams, Navigate } from 'react-router-dom';

interface LoginPageProps {
  onLogin: (email: string) => void;
  isLoadingAuth: boolean;
  isAuthenticated?: boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, isLoadingAuth, isAuthenticated }) => {
  const { salonSlug } = useParams<{ salonSlug: string }>();
  const { salon, isLoading: isSalonLoading, error } = useSalon();

  // If already authenticated, redirect done in App.tsx or ProtectedRoute, 
  // but explicitly handling here doesn't hurt.
  
  if (isLoadingAuth || (salonSlug && isSalonLoading)) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (salonSlug && error) {
    return <Navigate to="/404" replace />;
  }

  // Determine branding
  const title = salon ? salon.name : "Salon Login";
  const subtitle = "Sign in to manage your appointments";
  const logoUrl = salon?.logo_url;

  return (
    <div className="min-h-screen bg-treservi-bg-light dark:bg-treservi-bg-dark">
      <Login 
        onLogin={onLogin} 
        title={title} 
        subtitle={subtitle}
        logoUrl={logoUrl}
      />
    </div>
  );
};

export default LoginPage;
