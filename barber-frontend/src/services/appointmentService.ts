import { AppointmentData, CreateAppointmentInput } from '../types';
import { apiClient } from './apiClient';

const normalizeAppointment = (appointment: any): AppointmentData => {
  if (!appointment) {
    return appointment as AppointmentData;
  }
  return {
    ...appointment,
    id: appointment.id ?? appointment._id,
    service_id: appointment.service_id?._id ?? appointment.service_id,
    staff_id: appointment.staff_id?._id ?? appointment.staff_id,
    service: appointment.service_id && typeof appointment.service_id === 'object'
      ? { ...appointment.service_id, id: appointment.service_id._id ?? appointment.service_id.id }
      : appointment.service,
    staff: appointment.staff_id && typeof appointment.staff_id === 'object'
      ? { ...appointment.staff_id, id: appointment.staff_id._id ?? appointment.staff_id.id }
      : appointment.staff
  } as AppointmentData;
};

/**
 * Fetch appointments for a salon (Owner view - all appointments)
 */
export async function fetchAppointments(salonId: string) {
  try {
    const appointments = await apiClient.fetchAppointments({ salonId });
    return { data: appointments.map(normalizeAppointment), error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Fetch appointments for a specific staff member (Staff view - only their appointments)
 */
export async function fetchStaffAppointments(staffId: string) {
  try {
    const appointments = await apiClient.fetchAppointments({ staffId });
    return { data: appointments.map(normalizeAppointment), error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Fetch appointments for today (Staff dashboard)
 */
export async function fetchTodayAppointments(staffId: string) {
  try {
    const appointments = await apiClient.fetchAppointments({ staffId });
    const today = new Date().toISOString().split('T')[0];
    const filtered = appointments.filter((apt) => apt.appointment_date === today);
    return { data: filtered.map(normalizeAppointment), error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Fetch upcoming appointments (Staff dashboard)
 * Returns appointments from today onwards
 */
export async function fetchUpcomingAppointments(staffId: string) {
  try {
    const appointments = await apiClient.fetchAppointments({ staffId });
    const today = new Date().toISOString().split('T')[0];
    const filtered = appointments.filter((apt) => apt.appointment_date >= today);
    return { data: filtered.map(normalizeAppointment), error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Fetch a single appointment by ID
 */
export async function fetchAppointmentById(id: string) {
  try {
    const appointment = await apiClient.fetchAppointmentById(id);
    return { data: normalizeAppointment(appointment), error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Create a new appointment
 */
export async function createAppointment(input: CreateAppointmentInput) {
  try {
    const appointment = await apiClient.createAppointment(input);
    return { data: normalizeAppointment(appointment), error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

export async function createPublicAppointment(input: CreateAppointmentInput) {
  try {
    const appointment = await apiClient.createPublicAppointment(input);
    return { data: normalizeAppointment(appointment), error: null };
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
  try {
    const appointment = await apiClient.updateAppointment(id, updates);
    return { data: normalizeAppointment(appointment), error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Delete an appointment (Owner only)
 */
export async function deleteAppointment(id: string) {
  try {
    await apiClient.deleteAppointment(id);
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

/**
 * Get appointment statistics for a staff member (Earnings etc.)
 */
export async function getStaffAppointmentStats(staffId: string) {
  try {
    const stats = await apiClient.getStaffAppointmentStats(staffId);
    return { data: { ...stats, chartData: [] }, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

/**
 * Check if user is attempting to double-book the same slot
 */
export async function checkDuplicateBooking(
  salonId: string,
  staffId: string,
  phone: string,
  appointmentDate: string,
  appointmentTime: string
) {
  try {
    const appointments = await apiClient.fetchAppointments({ salonId });
    const cleanPhone = phone.replace(/\D/g, '');
    const hasDuplicate = appointments.some((apt) => {
      const aptPhone = (apt.customer_phone ?? '').replace(/\D/g, '');
      return (
        apt.staff_id?.toString?.() === staffId &&
        apt.appointment_date === appointmentDate &&
        apt.appointment_time === appointmentTime &&
        aptPhone === cleanPhone &&
        ['Pending', 'Confirmed'].includes(apt.status)
      );
    });
    return { isDuplicate: hasDuplicate, error: null };
  } catch (err: any) {
    return { isDuplicate: false, error: err };
  }
}

/**
 * Check if a specific slot is already booked by anyone
 */
export async function checkSlotAvailability(
  salonId: string,
  staffId: string,
  appointmentDate: string,
  appointmentTime: string
) {
  try {
    const appointments = await apiClient.fetchAppointments({ salonId });
    const isTaken = appointments.some((apt) => {
      return (
        apt.staff_id?.toString?.() === staffId &&
        apt.appointment_date === appointmentDate &&
        apt.appointment_time === appointmentTime &&
        ['Pending', 'Confirmed'].includes(apt.status)
      );
    });
    return { isAvailable: !isTaken, error: null };
  } catch (err: any) {
    return { isAvailable: true, error: err };
  }
}

/**
 * Check for spam bookings by same phone number within time window
 */
export async function checkSpamBookings(
  phone: string,
  salonId: string,
  windowMinutes: number = 60,
  maxBookings: number = 3
) {
  try {
    const appointments = await apiClient.fetchAppointments({ salonId });
    const cleanPhone = phone.replace(/\D/g, '');
    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    const recent = appointments.filter((apt) => {
      const aptPhone = (apt.customer_phone ?? '').replace(/\D/g, '');
      const createdAt = apt.created_at ? new Date(apt.created_at).getTime() : 0;
      return (
        aptPhone === cleanPhone &&
        createdAt >= cutoff &&
        ['Pending', 'Confirmed'].includes(apt.status)
      );
    });
    const recentCount = recent.length;
    return { isSpam: recentCount >= maxBookings, recentCount, error: null };
  } catch (err: any) {
    return { isSpam: false, recentCount: 0, error: err };
  }
}
