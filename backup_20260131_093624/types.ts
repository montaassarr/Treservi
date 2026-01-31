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
