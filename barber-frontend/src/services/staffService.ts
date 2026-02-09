import { StaffMember, Client, CreateStaffInput, StaffStats } from '../types';
import { apiClient } from './apiClient';

const normalizeStaff = (staff: any): StaffMember => {
  if (!staff) {
    return staff as StaffMember;
  }
  return {
    ...staff,
    id: staff.id ?? staff._id,
    full_name: staff.full_name ?? staff.fullName ?? '',
    avatar_url: staff.avatar_url ?? staff.avatarUrl,
    salon_id: staff.salon_id ?? staff.salonId
  } as StaffMember;
};

// ============ STAFF CRUD ============

export const fetchStaff = async (salonId?: string) => {
  try {
    if (!salonId) {
      return { data: [], error: null };
    }
    const staff = await apiClient.fetchStaff(salonId);
    return { data: staff.map(normalizeStaff), error: null };
  } catch (err) {
    console.error('Error fetching staff:', err);
    return { data: [], error: err as Error };
  }
};

export const fetchPublicStaff = async (salonId?: string) => {
  try {
    if (!salonId) {
      return { data: [], error: null };
    }
    const staff = await apiClient.fetchPublicStaff(salonId);
    return { data: staff.map(normalizeStaff), error: null };
  } catch (err) {
    console.error('Error fetching public staff:', err);
    return { data: [], error: err as Error };
  }
};

export const createStaff = async (payload: CreateStaffInput) => {
  try {
    const staff = await apiClient.createStaff({
      email: payload.email,
      password: payload.password,
      fullName: payload.fullName,
      salonId: payload.salonId,
      specialty: payload.specialty
    });
    return { data: normalizeStaff(staff), error: null };
  } catch (err) {
    console.error('Error creating staff:', err);
    return { data: null, error: err as Error };
  }
};

export const updateStaff = async (id: string, updates: Partial<StaffMember>) => {
  try {
    const payload: Record<string, any> = { ...updates };
    if (updates.full_name) payload.fullName = updates.full_name;
    if (updates.avatar_url) payload.avatarUrl = updates.avatar_url;
    if (updates.salon_id) payload.salonId = updates.salon_id;

    const staff = await apiClient.updateStaff(id, payload);
    return { data: normalizeStaff(staff), error: null };
  } catch (err) {
    console.error('Error updating staff:', err);
    return { data: null, error: err as Error };
  }
};

export const deleteStaff = async (id: string) => {
  try {
    await apiClient.deleteStaff(id);
    return { data: { id }, error: null };
  } catch (err) {
    console.error('Error deleting staff:', err);
    return { data: null, error: err as Error };
  }
};

export const resetStaffPassword = async (email: string) => {
  try {
    console.warn('resetStaffPassword: Endpoint not implemented on backend');
    return { data: null, error: new Error('Password reset not yet implemented') };
  } catch (err) {
    console.error('Error resetting password:', err);
    return { data: null, error: err as Error };
  }
};

// ============ CLIENT MANAGEMENT ============

export const fetchClientsByStaff = async (staffId: string) => {
  try {
    console.warn('fetchClientsByStaff: Endpoint not implemented on backend');
    return { data: [], error: null };
  } catch (err) {
    console.error('Error fetching clients:', err);
    return { data: [], error: err as Error };
  }
};

export const addClient = async (client: Omit<Client, 'id'>) => {
  try {
    console.warn('addClient: Endpoint not implemented on backend');
    return { data: null, error: new Error('Client creation not yet implemented') };
  } catch (err) {
    console.error('Error adding client:', err);
    return { data: null, error: err as Error };
  }
};

export const deleteClient = async (clientId: string) => {
  try {
    console.warn('deleteClient: Endpoint not implemented on backend');
    return { data: null, error: new Error('Client deletion not yet implemented') };
  } catch (err) {
    console.error('Error deleting client:', err);
    return { data: null, error: err as Error };
  }
};

// ============ STAFF STATISTICS ============

export const getStaffStats = async (staffId: string): Promise<StaffStats> => {
  try {
    const stats = await apiClient.getStaffAppointmentStats(staffId);
    return {
      total_earnings: stats.total_earnings ?? 0,
      today_earnings: stats.today_earnings ?? 0,
      completed_appointments: stats.completed_appointments ?? 0,
      today_appointments: stats.today_appointments ?? 0,
      average_rating: 0
    };
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
    const user = await apiClient.login(email, password);
    return {
      data: {
        staff: user as StaffMember,
        token: localStorage.getItem('user_token') || '',
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
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    return { error: null };
  } catch (err) {
    console.error('Error during logout:', err);
    return { error: err as Error };
  }
};

