export interface Barber {
  id: string;
  name: string;
  avatarUrl: string;
  rating: number;
  earnings: string;
}

export interface Appointment {
  id: string;
  customerName: string;
  customerAvatar: string;
  service: string;
  time: string;
  status: 'Pending' | 'Confirmed' | 'Completed';
  amount: string;
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

export interface CreateStaffInput {
  fullName: string;
  email: string;
  password: string;
  specialty: string;
  salonId?: string;
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

export interface StaffStats {
  total_earnings: number;
  today_earnings: number;
  completed_appointments: number;
  today_appointments: number;
  average_rating: number;
}

export interface Service {
  id: string;
  salon_id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateServiceInput {
  name: string;
  price: number;
  duration: number;
  description?: string;
  salonId: string;
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
