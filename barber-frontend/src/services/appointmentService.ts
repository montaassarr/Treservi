import { supabase } from './supabaseClient';
import { AppointmentData, CreateAppointmentInput } from '../types';

/**
 * Fetch appointments for a salon (Owner view - all appointments)
 */
export async function fetchAppointments(salonId: string) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not initialized') };
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        service:services(*),
        staff:staff(id, full_name, email, specialty)
      `)
      .eq('salon_id', salonId)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    return { data: data as AppointmentData[] | null, error };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Fetch appointments for a specific staff member (Staff view - only their appointments)
 */
export async function fetchStaffAppointments(staffId: string) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not initialized') };
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        service:services(*)
      `)
      .eq('staff_id', staffId)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    return { data: data as AppointmentData[] | null, error };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Fetch appointments for today (Staff dashboard)
 */
export async function fetchTodayAppointments(staffId: string) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not initialized') };
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        service:services(*)
      `)
      .eq('staff_id', staffId)
      .eq('appointment_date', today)
      .order('appointment_time', { ascending: true });

    return { data: data as AppointmentData[] | null, error };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Fetch a single appointment by ID
 */
export async function fetchAppointmentById(id: string) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not initialized') };
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        service:services(*),
        staff:staff(id, full_name, email, specialty)
      `)
      .eq('id', id)
      .single();

    return { data: data as AppointmentData | null, error };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Create a new appointment
 */
export async function createAppointment(input: CreateAppointmentInput) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not initialized') };
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        salon_id: input.salon_id,
        staff_id: input.staff_id,
        service_id: input.service_id,
        customer_name: input.customer_name,
        customer_email: input.customer_email,
        customer_phone: input.customer_phone,
        appointment_date: input.appointment_date,
        appointment_time: input.appointment_time,
        status: input.status || 'Pending',
        amount: input.amount,
        notes: input.notes,
      })
      .select(`
        *,
        service:services(*),
        staff:staff(id, full_name, email, specialty)
      `)
      .single();

    return { data: data as AppointmentData | null, error };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Update an existing appointment
 */
export async function updateAppointment(
  id: string,
  updates: Partial<Omit<AppointmentData, 'id' | 'created_at' | 'service' | 'staff'>>
) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not initialized') };
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        service:services(*),
        staff:staff(id, full_name, email, specialty)
      `)
      .single();

    return { data: data as AppointmentData | null, error };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Delete an appointment (Owner only)
 */
export async function deleteAppointment(id: string) {
  if (!supabase) {
    return { error: new Error('Supabase client not initialized') };
  }

  try {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    return { error };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Get staff statistics (for staff dashboard)
 */
export async function getStaffAppointmentStats(staffId: string) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not initialized') };
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    // Fetch all completed appointments for this staff
    const { data: allCompleted, error: allError } = await supabase
      .from('appointments')
      .select('amount')
      .eq('staff_id', staffId)
      .eq('status', 'Completed');

    if (allError) throw allError;

    // Fetch today's appointments
    const { data: todayAppointments, error: todayError } = await supabase
      .from('appointments')
      .select('amount, status')
      .eq('staff_id', staffId)
      .eq('appointment_date', today);

    if (todayError) throw todayError;

    const totalEarnings = allCompleted?.reduce((sum, apt) => sum + Number(apt.amount), 0) || 0;
    const todayEarnings = todayAppointments
      ?.filter(apt => apt.status === 'Completed')
      .reduce((sum, apt) => sum + Number(apt.amount), 0) || 0;
    const todayCount = todayAppointments?.length || 0;
    const completedCount = allCompleted?.length || 0;

    return {
      data: {
        total_earnings: totalEarnings,
        today_earnings: todayEarnings,
        today_appointments: todayCount,
        completed_appointments: completedCount,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err };
  }
}
