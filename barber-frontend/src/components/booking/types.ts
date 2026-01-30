export interface Staff {
  id: string;
  name: string;
  role: string;
  rating: number;
  price: number;
  image: string;
  bgColor: string; // Tailwind class like 'bg-orange-50'
  category: 'Barber' | 'Colorist' | 'Stylist';
}

export interface Service {
  id: string;
  name: string;
  duration: string;
  price: number;
  description: string;
}

export interface BookingState {
  step: number;
  selectedStaff: Staff | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  selectedService: Service | null;
  customerName: string;
  customerPhone: string;
  notes: string;
}

export type Language = 'en' | 'fr' | 'ar';

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
