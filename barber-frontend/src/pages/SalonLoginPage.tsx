import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import Login from '../components/Login';
import { useSalon } from '../context/SalonContext';

interface SalonLoginPageProps {
  onLogin: (email: string) => void;
}

const SalonLoginPage: React.FC<SalonLoginPageProps> = ({ onLogin }) => {
  const { salonSlug } = useParams<{ salonSlug: string }>();
  const { salon, error } = useSalon();

  if (salonSlug && error) {
    return <Navigate to="/404" replace />;
  }

  const title = salon?.name || salonSlug || 'Salon Login';

  return (
    <div className="min-h-screen bg-treservi-bg-light dark:bg-treservi-bg-dark">
      <Login
        onLogin={onLogin}
        title={title}
        subtitle="Sign in to continue"
        logoUrl={salon?.logo_url}
      />
    </div>
  );
};

export default SalonLoginPage;
