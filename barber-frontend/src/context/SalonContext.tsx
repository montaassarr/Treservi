import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

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
  const { salonSlug } = useParams<{ salonSlug: string }>();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSalon = async () => {
    // Debug log
    console.log('[SalonContext] fetchSalon called with slug:', salonSlug);
    
    if (!salonSlug || !supabase) {
      console.log('[SalonContext] No slug or supabase client, aborting.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('[SalonContext] Querying supabase for salon:', salonSlug);

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out')), 5000)
      );

      // Race the supabase query against the timeout
      const { data, error: fetchError } = await Promise.race([
        supabase
          .from('salons')
          .select('*')
          .eq('slug', salonSlug)
          .single(),
        timeoutPromise.then(() => ({ data: null, error: { message: 'Timeout' } }))
      ]) as any;

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Salon not found');
        } else {
          setError('Failed to load salon');
        }
        setSalon(null);
      } else {
        console.log('[SalonContext] Salon loaded:', data);
        setSalon(data);
      }
    } catch (err) {
      console.error('[SalonContext] Error fetching salon:', err);
      setError('An unexpected error occurred');
      setSalon(null);
    } finally {
      console.log('[SalonContext] Finished loading.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalon();
  }, [salonSlug]);

  const refreshSalon = async () => {
    await fetchSalon();
  };

  return (
    <SalonContext.Provider
      value={{
        salon,
        salonSlug: salonSlug || null,
        isLoading,
        error,
        refreshSalon,
      }}
    >
      {children}
    </SalonContext.Provider>
  );
};
