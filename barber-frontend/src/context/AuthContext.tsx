import React, { createContext, useContext, useEffect, useCallback, useRef, ReactNode } from 'react';
import { apiClient, authStorage, AuthUser } from '../services/apiClient';

type AuthStatus = 'checking' | 'authenticated' | 'guest';

interface AuthContextType {
  status: AuthStatus;
  user: AuthUser | null;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const withTimeout = async <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [status, setStatus] = React.useState<AuthStatus>('guest');
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const initAuthStartedRef = useRef(false);

  // Initialize auth on mount - restore token and fetch user data
  useEffect(() => {
    let mounted = true;

    if (initAuthStartedRef.current) {
      return;
    }

    initAuthStartedRef.current = true;

    const initAuth = async () => {
      console.log('[AuthContext] Starting auth initialization');
      try {
        const token = authStorage.getToken();
        
        if (!token) {
          // No token, user is guest
          if (mounted) {
            setStatus('guest');
            setUser(null);
          }
          return;
        }

        // Token exists, fetch user data with timeout
        const userData = await withTimeout(apiClient.getMe(), 4000, null as any);
        
        if (userData && mounted) {
          // Token valid and user data retrieved
          setUser(userData);
          setStatus('authenticated');
          console.log('[AuthContext] Auth initialization succeeded');
        } else if (mounted) {
          // Token invalid or timeout, clear and set guest
          authStorage.clearToken();
          setStatus('guest');
          setUser(null);
          console.log('[AuthContext] Auth initialization failed - token invalid');
        }
      } catch (error) {
        console.error('[AuthContext] Auth initialization error:', error);
        if (mounted) {
          authStorage.clearToken();
          setStatus('guest');
          setUser(null);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email: string) => {
    console.log('[AuthContext] Login called for:', email);
    setStatus('checking');
    try {
      const userData = await withTimeout(apiClient.getMe(), 4000, null as any);
      if (userData) {
        setUser(userData);
        setStatus('authenticated');
        console.log('[AuthContext] Login succeeded');
      } else {
        authStorage.clearToken();
        setStatus('guest');
        setUser(null);
        console.log('[AuthContext] Login failed - could not fetch user');
      }
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      authStorage.clearToken();
      setStatus('guest');
      setUser(null);
    }
  }, []);

  const logout = useCallback(async () => {
    console.log('[AuthContext] Logout called');
    authStorage.clearToken();
    setStatus('guest');
    setUser(null);
  }, []);

  const value: AuthContextType = {
    status,
    user,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
