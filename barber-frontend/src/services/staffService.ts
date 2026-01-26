import { supabase, hasSupabaseClient } from './supabaseClient';
import { StaffMember, Client, CreateStaffInput, StaffStats } from '../types';
import {
  mockStaff,
  mockClients,
  mockAppointments,
  calculateStaffStats,
} from './mockData';

// Store for mock data (simulating database)
let staffStore = JSON.parse(JSON.stringify(mockStaff));
let clientStore = JSON.parse(JSON.stringify(mockClients));

// ============ STAFF CRUD ============

export const fetchStaff = async (salonId?: string) => {
  try {
    if (!supabase || !hasSupabaseClient) {
      // Return mock data if Supabase not available
      return {
        data: salonId
          ? staffStore.filter((s: StaffMember) => s.salon_id === salonId)
          : staffStore,
        error: null,
      };
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
    return { data: staffStore, error: err as Error };
  }
};

export const createStaff = async (payload: CreateStaffInput) => {
  try {
    if (!supabase || !hasSupabaseClient) {
      // Create mock staff
      const newStaff: StaffMember = {
        id: `staff-${Date.now()}`,
        full_name: payload.fullName,
        email: payload.email,
        specialty: payload.specialty,
        status: 'Active',
        avatar_url: `https://picsum.photos/id/${Math.floor(Math.random() * 500) + 10}/100/100`,
        salon_id: payload.salonId || 'salon-1',
        created_at: new Date().toISOString(),
      };
      staffStore.unshift(newStaff);
      return { data: newStaff, error: null };
    }

    // Call Edge Function if Supabase available
    const { data, error } = await supabase.functions.invoke('create-staff', {
      body: payload,
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
      // Update mock staff
      const idx = staffStore.findIndex((s: StaffMember) => s.id === id);
      if (idx === -1) return { data: null, error: new Error('Staff not found') };
      staffStore[idx] = { ...staffStore[idx], ...updates };
      return { data: staffStore[idx], error: null };
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
      // Delete mock staff
      staffStore = staffStore.filter((s: StaffMember) => s.id !== id);
      return { data: { id }, error: null };
    }

    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);

    if (error) return { data: null, error };
    return { data: { id }, error: null };
  } catch (err) {
    console.error('Error deleting staff:', err);
    return { data: null, error: err as Error };
  }
};

export const resetStaffPassword = async (email: string) => {
  try {
    if (!supabase || !hasSupabaseClient) {
      return { data: { message: 'Password reset email sent' }, error: null };
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
      return {
        data: clientStore.filter((c: Client) => c.staff_id === staffId),
        error: null,
      };
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
      data: clientStore.filter((c: Client) => c.staff_id === staffId),
      error: err as Error,
    };
  }
};

export const addClient = async (client: Omit<Client, 'id'>) => {
  try {
    if (!supabase || !hasSupabaseClient) {
      const newClient: Client = {
        ...client,
        id: `client-${Date.now()}`,
      };
      clientStore.push(newClient);
      return { data: newClient, error: null };
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
      clientStore = clientStore.filter((c: Client) => c.id !== clientId);
      return { data: { id: clientId }, error: null };
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
      // Calculate from mock data
      return calculateStaffStats(staffId);
    }

    // In production, this would come from a database query or Edge Function
    const { data, error } = await supabase
      .from('staff_stats')
      .select('*')
      .eq('staff_id', staffId)
      .single();

    if (error) {
      // Fallback to mock calculation
      return calculateStaffStats(staffId);
    }

    return data as StaffStats;
  } catch (err) {
    console.error('Error fetching staff stats:', err);
    return calculateStaffStats(staffId);
  }
};

// ============ STAFF LOGIN ============

export const staffLogin = async (email: string, password: string) => {
  try {
    if (!supabase || !hasSupabaseClient) {
      // Mock login - find staff by email
      const staff = staffStore.find(
        (s: StaffMember) => s.email === email && s.status === 'Active'
      );
      if (!staff) {
        return {
          data: null,
          error: new Error('Invalid email or staff is inactive'),
        };
      }

      // In production, verify password hash
      return {
        data: {
          staff,
          token: `mock-token-${staff.id}`,
        },
        error: null,
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

