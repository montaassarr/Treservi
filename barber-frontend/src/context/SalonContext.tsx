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
    
    if (!salonParam || !supabase) {
      console.log('[SalonContext] No slug/id or supabase client, aborting.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Try fetching by slug first
      let { data, error: fetchError } = await supabase
          .from('salons')
          .select('*')
          .eq('slug', salonParam)
          .single();

      // If failed and looks like UUID, try by ID
      if ((!data || fetchError) && /^[0-9a-fA-F-]{36}$/.test(salonParam)) {
          console.log('[SalonContext] Slug lookup failed, trying ID lookup for:', salonParam);
          const { data: byId, error: errId } = await supabase
            .from('salons')
            .select('*')
            .eq('id', salonParam)
            .single();
          
          if (byId && !errId) {
             data = byId;
             fetchError = null;
          }
      }

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Salon not found');
        } else {
          setError('Failed to load salon');
        }
        setSalon(null);
      } else {
        console.log('[SalonContext] Salon loaded:', data);
        setSalon(data as Salon);
      }
    } catch (err) {
      console.error('[SalonContext] Error fetching salon:', err);
      setError('An unexpected error occurred');
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
