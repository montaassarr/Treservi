import React from 'react';
import Login from '../components/Login';

interface AdminLoginPageProps {
  onLogin: (email: string) => void;
  isLoadingAuth: boolean;
}

const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLogin, isLoadingAuth }) => {
  return (
    <div className="min-h-screen bg-treservi-bg-light dark:bg-treservi-bg-dark">
      <Login 
        onLogin={onLogin} 
        title="Super Admin"
        subtitle="Platform Management"
      />
    </div>
  );
};

export default AdminLoginPage;
