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
 * Fetch upcoming appointments (Staff dashboard)
 * Returns appointments from today onwards
 */
export async function fetchUpcomingAppointments(staffId: string) {
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
      .gte('appointment_date', today) // Greater than or equal to today
      .order('appointment_date', { ascending: true })
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
    const { data, error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .select();

    if (error) return { error };

    if (!data || data.length === 0) {
        return { error: new Error("Could not delete appointment. Check permissions or if record exists.") };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Get appointment statistics for a staff member (Earnings etc.)
 * NOTE: This is a client-side calculation helper or could be an RPC call.
 * For now implementing as a direct query aggregation.
 */
export async function getStaffAppointmentStats(staffId: string) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not initialized') };
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    // Fetch ALL appointments for this staff to calculate totals locally
    // In a production app with millions of rows, use an RPC function instead.
    const { data, error } = await supabase
      .from('appointments')
      .select('amount, status, appointment_date')
      .eq('staff_id', staffId);

    if (error) throw error;

    let today_appointments = 0;
    let today_earnings = 0;
    let completed_appointments = 0;
    let total_earnings = 0;
    
    // Initialize chart data for last 7 days
    const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
            date: d.toISOString().split('T')[0],
            name: d.toLocaleDateString('en-US', { weekday: 'short' }),
            value: 0
        };
    });

    data?.forEach(apt => {
      const isCompleted = apt.status === 'Completed';
      const isConfirmed = apt.status === 'Confirmed';
      const isPending = apt.status === 'Pending';
      const isCancelled = apt.status === 'Cancelled';
      const isToday = apt.appointment_date === today;

      if (isToday && !isCancelled) {
        today_appointments++;
        // Include Pending/Confirmed in today's projected earnings
        today_earnings += Number(apt.amount || 0);
      }

      if (isCompleted) {
        completed_appointments++;
        total_earnings += Number(apt.amount || 0);
      }
      
      // Chart Data Calculation
      if (!isCancelled) {
          const dayStat = last7Days.find(d => d.date === apt.appointment_date);
          if (dayStat) {
              dayStat.value++;
          }
      }
    });

    return {
      data: {
        today_appointments,
        today_earnings,
        completed_appointments,
        total_earnings,
        chartData: last7Days
      },
      error: null
    };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Check if user is attempting to double-book the same slot
 * @param salonId - Salon ID
 * @param staffId - Staff member ID
 * @param phone - Customer phone (with special chars removed)
 * @param appointmentDate - Date of appointment (YYYY-MM-DD)
 * @param appointmentTime - Time of appointment (HH:MM)
 */
export async function checkDuplicateBooking(
  salonId: string,
  staffId: string,
  phone: string,
  appointmentDate: string,
  appointmentTime: string
) {
  if (!supabase) {
    return { isDuplicate: false, error: new Error('Supabase client not initialized') };
  }

  try {
    const cleanPhone = phone.replace(/\D/g, '');
    
    const { data, error } = await supabase
      .from('appointments')
      .select('id, customer_phone, staff_id, appointment_date, appointment_time, status')
      .eq('salon_id', salonId)
      .eq('staff_id', staffId)
      .eq('appointment_date', appointmentDate)
      .eq('appointment_time', appointmentTime)
      .in('status', ['Pending', 'Confirmed']); // Only check active bookings

    if (error) {
      return { isDuplicate: false, error };
    }

    // Check if this phone number has already booked this exact slot
    const hasDuplicate = data?.some(apt => 
      apt.customer_phone.replace(/\D/g, '') === cleanPhone
    );

    return { isDuplicate: hasDuplicate || false, error: null };
  } catch (err: any) {
    return { isDuplicate: false, error: err };
  }
}

/**
 * Check if a specific slot is already booked by anyone
 * @param salonId - Salon ID
 * @param staffId - Staff member ID
 * @param appointmentDate - Date of appointment (YYYY-MM-DD)
 * @param appointmentTime - Time of appointment (HH:MM)
 */
export async function checkSlotAvailability(
  salonId: string,
  staffId: string,
  appointmentDate: string,
  appointmentTime: string
) {
  if (!supabase) {
    return { isAvailable: true, error: new Error('Supabase client not initialized') };
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('salon_id', salonId)
      .eq('staff_id', staffId)
      .eq('appointment_date', appointmentDate)
      .eq('appointment_time', appointmentTime)
      .in('status', ['Pending', 'Confirmed']); // Only check active bookings

    if (error) {
      return { isAvailable: true, error };
    }

    // If any confirmed/pending booking exists, slot is taken
    const isAvailable = !data || data.length === 0;

    return { isAvailable, error: null };
  } catch (err: any) {
    return { isAvailable: true, error: err };
  }
}

/**
 * Check for spam bookings by same phone number within time window
 * @param phone - Customer phone
 * @param salonId - Salon ID
 * @param windowMinutes - Time window in minutes (default: 60)
 * @param maxBookings - Max bookings allowed in window (default: 3)
 */
export async function checkSpamBookings(
  phone: string,
  salonId: string,
  windowMinutes: number = 60,
  maxBookings: number = 3
) {
  if (!supabase) {
    return { isSpam: false, recentCount: 0, error: new Error('Supabase client not initialized') };
  }

  try {
    const cleanPhone = phone.replace(/\D/g, '');
    const timeWindow = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('appointments')
      .select('id, created_at')
      .eq('salon_id', salonId)
      .like('customer_phone', `%${cleanPhone}%`)
      .gte('created_at', timeWindow)
      .in('status', ['Pending', 'Confirmed']);

    if (error) {
      return { isSpam: false, recentCount: 0, error };
    }

    const recentCount = data?.length || 0;
    const isSpam = recentCount >= maxBookings;

    return { isSpam, recentCount, error: null };
  } catch (err: any) {
    return { isSpam: false, recentCount: 0, error: err };
  }
}
