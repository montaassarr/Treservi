import React from 'react';
import Login from '../components/Login';

interface LoginPageProps {
  onLogin: (email: string) => void;
  isLoadingAuth: boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, isLoadingAuth }) => {
  if (isLoadingAuth) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-treservi-bg-light dark:bg-treservi-bg-dark">
      <Login onLogin={onLogin} />
    </div>
  );
};

export default LoginPage;
