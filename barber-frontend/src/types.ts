// --- Dashboard / Admin Types ---

export interface Barber {
  id: string;
  name: string;
  firstName: string;
  rating: number;
  earnings: string;
  avatarUrl?: string;
}

export interface Appointment {
  id: string;
  customerName: string;
  customerFirstName: string;
  service: string;
  staffName?: string;
  staffId?: string;
  time: string;
  status: 'Pending' | 'Confirmed' | 'Completed';
  amount: string;
  date?: string;
  phone?: string;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  timeAgo: string;
  avatar: string;
}

export interface ChartData {
  name: string;
  value: number;
}

// --- Database Models ---

export interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  specialty: string;
  status: 'Active' | 'Inactive';
  role: 'owner' | 'staff';
  avatar_url?: string;
  salon_id?: string;
  created_at?: string;
}

export interface Service {
  id: string;
  salon_id: string;
  name: string;
  description?: string;
  duration: number; // Duration in minutes
  price: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url: string;
  staff_id: string;
  salon_id: string;
}

export interface AppointmentData {
  id: string;
  salon_id: string;
  staff_id?: string;
  service_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_avatar?: string;
  appointment_date: string;
  appointment_time: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  amount: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  service?: Service;
  staff?: StaffMember;
}

export interface StaffStats {
  total_earnings: number;
  today_earnings: number;
  completed_appointments: number;
  today_appointments: number;
  average_rating: number;
}

// --- Input Types ---

export interface CreateStaffInput {
  fullName: string;
  email: string;
  password: string;
  specialty: string;
  salonId?: string;
}

export interface CreateServiceInput {
  name: string;
  price: number;
  duration: number;
  description?: string;
  salonId: string;
}

export interface CreateAppointmentInput {
  salon_id: string;
  staff_id?: string;
  service_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  appointment_date: string;
  appointment_time: string;
  status?: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  amount: number;
  notes?: string;
}

// --- UI / Booking Flow Types ---

export interface BookingStaff {
  id: string;
  name: string;
  role: string;
  rating: number;
  price: number;
  firstName: string;
  bgColor: string;
  category: 'Barber' | 'Colorist' | 'Stylist';
  avatarUrl?: string;
}

export interface BookingService {
  id: string;
  name: string;
  duration: string; // Display duration (e.g. "30 min")
  price: number;
  description: string;
}

export interface BookingState {
  step: number;
  selectedStaff: BookingStaff | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  selectedService: BookingService | null;
  customerName: string;
  customerPhone: string;
  notes: string;
}

// --- i18n ---

export type Language = 'en' | 'fr' | 'ar' | 'tn';

export interface Translations {
  greeting: string;
  subtitle: string;
  filters: { all: string; barber: string; colorist: string; stylist: string };
  todaySchedule: string;
  availableSlots: string;
  live: string;
  date: string;
  time: string;
  chooseService: string;
  optionalNotes: string;
  notesPlaceholder: string;
  bookingSummary: string;
  yourDetails: string;
  fullName: string;
  phoneNumber: string;
  whatsappConfirm: string;
  invalidPhone: string;
  specialist: string;
  service: string;
  confirmBooking: string;
  continue: string;
  bookingReceived: string;
  bookingMessage: string;
  done: string;
  from: string;
}
