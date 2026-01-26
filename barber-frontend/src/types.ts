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
