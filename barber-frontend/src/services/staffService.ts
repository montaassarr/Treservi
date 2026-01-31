import { supabase, hasSupabaseClient } from './supabaseClient';
import { StaffMember, Client, CreateStaffInput, StaffStats } from '../types';

// ============ STAFF CRUD ============

export const fetchStaff = async (salonId?: string) => {
  try {
    if (!supabase || !hasSupabaseClient) {
      console.error('Supabase client not initialized');
      return { data: [], error: new Error('Supabase client not initialized') };
    }

    const query = supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false });

    const { data, error } = salonId ? await query.eq('salon_id', salonId) : await query;
    
    if (error) return { data: [], error };
    return { data: (data as StaffMember[]) || [], error: null };
  } catch (err) {
    console.error('Error fetching staff:', err);
    return { data: [], error: err as Error };
  }
};

export const createStaff = async (payload: CreateStaffInput) => {
  try {
    if (!supabase || !hasSupabaseClient) {
      return { data: null, error: new Error('Supabase client not initialized') };
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      return { data: null, error: sessionError };
    }

    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      return { data: null, error: new Error('Not authenticated. Please sign in again.') };
    }

    // Call Edge Function if Supabase available
    const { data, error } = await supabase.functions.invoke('create-staff', {
      body: payload,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (error) return { data: null, error };
    return { data: data as StaffMember, error: null };
  } catch (err) {
    console.error('Error creating staff:', err);
    return { data: null, error: err as Error };
  }
};

export const updateStaff = async (id: string, updates: Partial<StaffMember>) => {
  try {
    if (!supabase || !hasSupabaseClient) {
      return { data: null, error: new Error('Supabase client not initialized') };
    }

    const { data, error } = await supabase
      .from('staff')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: data as StaffMember, error: null };
  } catch (err) {
    console.error('Error updating staff:', err);
    return { data: null, error: err as Error };
  }
};

export const deleteStaff = async (id: string) => {
  try {
    if (!supabase || !hasSupabaseClient) {
      return { data: null, error: new Error('Supabase client not initialized') };
    }

    const { data, error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id)
      .select();

    if (error) return { data: null, error };
    
    // Check if any row was actually deleted
    if (data && data.length === 0) {
        // This usually happens if the ID doesn't exist OR RLS policies prevented deletion
        console.warn('Delete operation returned 0 rows. Check RLS policies or ID.');
        return { data: null, error: new Error("Could not delete staff. Permission denied or record not found.") };
    }

    return { data: { id }, error: null };
  } catch (err) {
    console.error('Error deleting staff:', err);
    return { data: null, error: err as Error };
  }
};

export const resetStaffPassword = async (email: string) => {
  try {
    if (!supabase || !hasSupabaseClient) {
      return { data: null, error: new Error('Supabase client not initialized') };
    }

    const { error } = await supabase.functions.invoke('reset-staff-password', {
      body: { email },
    });

    if (error) return { data: null, error };
    return { data: { message: 'Password reset email sent' }, error: null };
  } catch (err) {
    console.error('Error resetting password:', err);
    return { data: null, error: err as Error };
  }
};

// ============ CLIENT MANAGEMENT ============

export const fetchClientsByStaff = async (staffId: string) => {
  try {
    if (!supabase || !hasSupabaseClient) {
      return { data: [], error: new Error('Supabase client not initialized') };
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('staff_id', staffId);

    if (error) return { data: [], error };
    return { data: (data as Client[]) || [], error: null };
  } catch (err) {
    console.error('Error fetching clients:', err);
    return {
      data: [],
      error: err as Error,
    };
  }
};

export const addClient = async (client: Omit<Client, 'id'>) => {
  try {
    if (!supabase || !hasSupabaseClient) {
      return { data: null, error: new Error('Supabase client not initialized') };
    }

    const { data, error } = await supabase
      .from('clients')
      .insert(client)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: data as Client, error: null };
  } catch (err) {
    console.error('Error adding client:', err);
    return { data: null, error: err as Error };
  }
};

export const deleteClient = async (clientId: string) => {
  try {
    if (!supabase || !hasSupabaseClient) {
      return { data: null, error: new Error('Supabase client not initialized') };
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (error) return { data: null, error };
    return { data: { id: clientId }, error: null };
  } catch (err) {
    console.error('Error deleting client:', err);
    return { data: null, error: err as Error };
  }
};

// ============ STAFF STATISTICS ============

export const getStaffStats = async (staffId: string): Promise<StaffStats> => {
  try {
    if (!supabase || !hasSupabaseClient) {
      // Return empty stats if Supabase not available
       return {
            total_earnings: 0,
            today_earnings: 0,
            completed_appointments: 0,
            today_appointments: 0,
            average_rating: 0
        };
    }

    // In production, this would come from a database query or Edge Function
    const { data, error } = await supabase
      .from('staff_stats')
      .select('*')
      .eq('staff_id', staffId)
      .single();

    if (error) {
       // Return empty stats on error
       return {
            total_earnings: 0,
            today_earnings: 0,
            completed_appointments: 0,
            today_appointments: 0,
            average_rating: 0
        };
    }

    return data as StaffStats;
  } catch (err) {
    console.error('Error fetching staff stats:', err);
    return {
            total_earnings: 0,
            today_earnings: 0,
            completed_appointments: 0,
            today_appointments: 0,
            average_rating: 0
        };
  }
};

// ============ STAFF LOGIN ============

export const staffLogin = async (email: string, password: string) => {
  try {
    if (!supabase || !hasSupabaseClient) {
        return {
          data: null,
          error: new Error('Supabase client not initialized'),
        };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { data: null, error };

    // Fetch staff profile
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('email', email)
      .single();

    if (staffError) return { data: null, error: staffError };

    return {
      data: {
        staff: staffData as StaffMember,
        token: data.session?.access_token,
      },
      error: null,
    };
  } catch (err) {
    console.error('Error during staff login:', err);
    return { data: null, error: err as Error };
  }
};

export const staffLogout = async () => {
  try {
    if (!supabase || !hasSupabaseClient) {
      return { error: null };
    }

    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (err) {
    console.error('Error during logout:', err);
    return { error: err as Error };
  }
};

