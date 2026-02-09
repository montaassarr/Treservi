import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../services/apiClient';

interface Salon {
  id: string;
  name: string;
  slug: string;
  owner_email: string;
  status: 'active' | 'suspended' | 'cancelled';
  logo_url?: string;
  subscription_plan: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  city?: string;
  country?: string;
  opening_time?: string;
  closing_time?: string;
  open_days?: string[];
  latitude?: number;
  longitude?: number;
  total_revenue: number;
  created_at: string;
  updated_at: string;
}

interface SalonContextType {
  salon: Salon | null;
  salonSlug: string | null;
  isLoading: boolean;
  error: string | null;
  refreshSalon: () => Promise<void>;
}

const SalonContext = createContext<SalonContextType | undefined>(undefined);

export const useSalon = () => {
  const context = useContext(SalonContext);
  if (!context) {
    throw new Error('useSalon must be used within a SalonProvider');
  }
  return context;
};

interface SalonProviderProps {
  children: ReactNode;
}

export const SalonProvider: React.FC<SalonProviderProps> = ({ children }) => {
  const params = useParams<{ salonSlug: string; salonId?: string }>();
  const salonParam = params.salonSlug || params.salonId;
  
  const [salon, setSalon] = useState<Salon | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSalon = async () => {
    // Debug log
    console.log('[SalonContext] fetchSalon called with param:', salonParam);
    
    if (!salonParam) {
      console.log('[SalonContext] No slug/id, aborting.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let data: Salon | null = null;

      try {
        data = await apiClient.getSalonBySlug(salonParam);
      } catch (slugError) {
        if (/^[0-9a-fA-F-]{24}$/.test(salonParam)) {
          console.log('[SalonContext] Slug lookup failed, trying ID lookup for:', salonParam);
          data = await apiClient.getSalonById(salonParam);
        } else {
          throw slugError;
        }
      }

      if (!data) {
        setError('Salon not found');
        setSalon(null);
      } else {
        console.log('[SalonContext] Salon loaded:', data);
        setSalon(data as Salon);
      }
    } catch (err) {
      console.error('[SalonContext] Error fetching salon:', err);
      setError('Failed to load salon');
      setSalon(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalon();
  }, [salonParam]); 

  const refreshSalon = async () => {
    await fetchSalon();
  };

  return (
    <SalonContext.Provider
      value={{
        salon,
        salonSlug: salonParam || null,
        isLoading,
        error,
        refreshSalon,
      }}
    >
      {children}
    </SalonContext.Provider>
  );
};
