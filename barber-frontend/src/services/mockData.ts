import { StaffMember, Client, StaffStats } from '../types';

// Mock Staff Data
export const mockStaff: StaffMember[] = [
  {
    id: 'staff-1',
    full_name: 'John Barber',
    email: 'john@barbershop.com',
    specialty: 'Haircut',
    status: 'Active',
    avatar_url: 'https://picsum.photos/id/64/100/100',
    salon_id: 'salon-1',
    created_at: new Date().toISOString(),
  },
  {
    id: 'staff-2',
    full_name: 'Sarah Stylist',
    email: 'sarah@barbershop.com',
    specialty: 'Coloring',
    status: 'Active',
    avatar_url: 'https://picsum.photos/id/65/100/100',
    salon_id: 'salon-1',
    created_at: new Date().toISOString(),
  },
  {
    id: 'staff-3',
    full_name: 'Mike Trimmer',
    email: 'mike@barbershop.com',
    specialty: 'Beard',
    status: 'Active',
    avatar_url: 'https://picsum.photos/id/66/100/100',
    salon_id: 'salon-1',
    created_at: new Date().toISOString(),
  },
];

// Mock Client Data
export const mockClients: Client[] = [
  {
    id: 'client-1',
    name: 'Alex Smith',
    email: 'alex@email.com',
    phone: '555-0001',
    avatar_url: 'https://picsum.photos/id/100/100/100',
    staff_id: 'staff-1',
    salon_id: 'salon-1',
  },
  {
    id: 'client-2',
    name: 'Jordan Lee',
    email: 'jordan@email.com',
    phone: '555-0002',
    avatar_url: 'https://picsum.photos/id/101/100/100',
    staff_id: 'staff-1',
    salon_id: 'salon-1',
  },
  {
    id: 'client-3',
    name: 'Casey West',
    email: 'casey@email.com',
    phone: '555-0003',
    avatar_url: 'https://picsum.photos/id/102/100/100',
    staff_id: 'staff-2',
    salon_id: 'salon-1',
  },
  {
    id: 'client-4',
    name: 'Morgan Brown',
    email: 'morgan@email.com',
    phone: '555-0004',
    avatar_url: 'https://picsum.photos/id/103/100/100',
    staff_id: 'staff-3',
    salon_id: 'salon-1',
  },
];

// Mock Appointments/Earnings
export const mockAppointments = [
  {
    id: 'apt-1',
    staff_id: 'staff-1',
    client_id: 'client-1',
    service: 'Haircut',
    price: 35,
    date: new Date().toISOString(),
    status: 'completed',
  },
  {
    id: 'apt-2',
    staff_id: 'staff-1',
    client_id: 'client-2',
    service: 'Fade & Beard Trim',
    price: 45,
    date: new Date(Date.now() - 86400000).toISOString(),
    status: 'completed',
  },
  {
    id: 'apt-3',
    staff_id: 'staff-2',
    client_id: 'client-3',
    service: 'Hair Coloring',
    price: 70,
    date: new Date().toISOString(),
    status: 'completed',
  },
  {
    id: 'apt-4',
    staff_id: 'staff-3',
    client_id: 'client-4',
    service: 'Beard Sculpting',
    price: 25,
    date: new Date(Date.now() - 172800000).toISOString(),
    status: 'completed',
  },
];

export const calculateStaffStats = (staffId: string): StaffStats => {
  const staffAppointments = mockAppointments.filter(
    (apt) => apt.staff_id === staffId && apt.status === 'completed'
  );

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayAppointments = staffAppointments.filter(
    (apt) => new Date(apt.date) >= todayStart
  );

  const totalEarnings = staffAppointments.reduce((sum, apt) => sum + apt.price, 0);
  const todayEarnings = todayAppointments.reduce((sum, apt) => sum + apt.price, 0);
  const appointmentsCount = staffAppointments.length;

  return {
    total_earnings: totalEarnings,
    today_earnings: todayEarnings,
    completed_appointments: appointmentsCount,
    today_appointments: todayAppointments.length,
    average_rating: 4.8,
  };
};
