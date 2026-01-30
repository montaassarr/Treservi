import React, { useState, useEffect } from 'react';
import { useSalon } from '../context/SalonContext';
import { useLanguage } from '../context/LanguageContext'; // We might use this for syncing or ignoring
import { Step1Specialist } from '../components/booking/Step1Specialist';
import { Step2DateTime } from '../components/booking/Step2DateTime';
import { Step3Service } from '../components/booking/Step3Service';
import { Step4Contact } from '../components/booking/Step4Contact';
import { BookingState, Language, Translations, Staff, Service } from '../components/booking/types';
import { ArrowLeft, CheckCircle, MessageCircle, Globe } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { fetchStaff } from '../services/staffService';
import { fetchServices } from '../services/serviceService';
import { createAppointment } from '../services/appointmentService';
import { useNavigate } from 'react-router-dom';

// Translations taken from hamdi-salon
const translations: Record<Language, Translations> = {
  en: {
    greeting: "Welcome to Hamdi Salon",
    subtitle: "Book your next style upgrade.",
    filters: { all: "All", barber: "Barbers", colorist: "Colorists", stylist: "Stylists" },
    todaySchedule: "Today's Schedule",
    availableSlots: "Available Slots",
    live: "Live",
    date: "Date",
    time: "Time",
    chooseService: "Choose Service",
    optionalNotes: "Special Requests (Optional)",
    notesPlaceholder: "e.g. Skin fade, extra trim...",
    bookingSummary: "Booking Summary",
    yourDetails: "Your Details",
    fullName: "Full Name",
    phoneNumber: "Phone Number",
    whatsappConfirm: "We'll send a confirmation via WhatsApp.",
    invalidPhone: "Invalid format",
    specialist: "Specialist",
    service: "Service",
    confirmBooking: "Confirm Booking",
    continue: "Continue",
    bookingReceived: "Booking Received!",
    bookingMessage: "We will send a WhatsApp message to",
    done: "Done",
    from: "From"
  },
  fr: {
    greeting: "Bienvenue au Salon Hamdi",
    subtitle: "Réservez votre prochaine séance.",
    filters: { all: "Tous", barber: "Barbiers", colorist: "Coloristes", stylist: "Stylistes" },
    todaySchedule: "Programme d'aujourd'hui",
    availableSlots: "Créneaux disponibles",
    live: "En direct",
    date: "Date",
    time: "Heure",
    chooseService: "Choisir un service",
    optionalNotes: "Demandes spécifiques (Optionnel)",
    notesPlaceholder: "ex: Coupe dégradée, barbe...",
    bookingSummary: "Résumé",
    yourDetails: "Vos coordonnées",
    fullName: "Nom complet",
    phoneNumber: "Numéro de téléphone",
    whatsappConfirm: "Confirmation envoyée via WhatsApp.",
    invalidPhone: "Format invalide",
    specialist: "Spécialiste",
    service: "Service",
    confirmBooking: "Confirmer",
    continue: "Continuer",
    bookingReceived: "Réservation reçue !",
    bookingMessage: "Nous enverrons un message WhatsApp au",
    done: "Terminé",
    from: "Dès"
  },
  ar: {
    greeting: "مرحباً بكم في صالون حمدي",
    subtitle: "احجز موعدك القادم للأناقة.",
    filters: { all: "الكل", barber: "حلاقين", colorist: "صبغة", stylist: "مصففين" },
    todaySchedule: "مواعيد اليوم",
    availableSlots: "الأوقات المتاحة",
    live: "مباشر",
    date: "التاريخ",
    time: "الوقت",
    chooseService: "اختر الخدمة",
    optionalNotes: "هل لديك طلبات خاصة؟ (اختياري)",
    notesPlaceholder: "مثال: تحديد اللحية، تدريج...",
    bookingSummary: "ملخص الحجز",
    yourDetails: "بياناتك",
    fullName: "الاسم الكامل",
    phoneNumber: "رقم الهاتف",
    whatsappConfirm: "سنرسل تأكيداً عبر واتساب.",
    invalidPhone: "رقم غير صحيح",
    specialist: "المختص",
    service: "الخدمة",
    confirmBooking: "تأكيد الحجز",
    continue: "متابعة",
    bookingReceived: "تم استلام الحجز!",
    bookingMessage: "سنرسل رسالة واتساب إلى",
    done: "إنهاء",
    from: "من"
  }
};

export default function BookingPage() {
  const { salon } = useSalon();
  const { language, setLanguage } = useLanguage(); 
  const navigate = useNavigate();

  // Use local state for language to match hamdi-salon behavior, but sync with context if needed.
  // Actually, let's use the local state as primary for this page to ensure translation keys match.
  // We can initialize it from context.
  const [lang, setLang] = useState<Language>((language as Language) || 'en');
  
  useEffect(() => {
    if (language) {
      if (['en', 'fr', 'ar'].includes(language)) {
         setLang(language as Language);
      }
    }
  }, [language]);

  const [bookingCompleted, setBookingCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staffData, setStaffData] = useState<Staff[]>([]);
  const [servicesData, setServicesData] = useState<Service[]>([]);

  const [booking, setBooking] = useState<BookingState>({
    step: 1,
    selectedStaff: null,
    selectedDate: new Date(), // Default to Today
    selectedTime: null,
    selectedService: null,
    customerName: '',
    customerPhone: '',
    notes: '',
  });

  const t = translations[lang];

  useEffect(() => {
    async function loadData() {
      if (!salon?.id) return;
      setLoading(true);
      
      // Fetch Staff
      const { data: staff, error: staffError } = await fetchStaff(salon.id);
      if (staff) {
        const mappedStaff: Staff[] = staff.map(s => ({
          id: s.id,
          name: s.full_name,
          role: s.specialty || 'Stylist',
          rating: 4.8, // Mock
          price: 20, // Mock base price
          image: s.avatar_url || 'https://i.pravatar.cc/150?u=' + s.id,
          bgColor: 'bg-gray-50', // Mock
          category: (s.specialty === 'Barber' || s.specialty === 'Colorist') ? s.specialty : 'Stylist'
        }));
        setStaffData(mappedStaff);
      }

      // Fetch Services
      const { data: services, error: serviceError } = await fetchServices(salon.id);
      if (services) {
        const mappedServices: Service[] = services.map(s => ({
          id: s.id,
          name: s.name,
          duration: s.duration + ' mins',
          price: s.price,
          description: s.description || ''
        }));
        setServicesData(mappedServices);
      }
      
      setLoading(false);
    }

    loadData();
  }, [salon?.id]);
  
  const nextStep = () => setBooking(prev => ({ ...prev, step: prev.step + 1 }));
  const prevStep = () => setBooking(prev => ({ ...prev, step: Math.max(1, prev.step - 1) }));

  const handleBook = async () => {
    if (booking.customerName && booking.customerPhone && booking.selectedStaff && booking.selectedService && booking.selectedDate && booking.selectedTime) {
      if (!salon?.id) return;
      
      try {
        // Create actual appointment
        const appointmentDate = booking.selectedDate.toISOString().split('T')[0];
        
        await createAppointment({
          salon_id: salon.id,
          staff_id: booking.selectedStaff.id,
          service_id: booking.selectedService.id,
          customer_name: booking.customerName,
          customer_phone: booking.customerPhone,
          appointment_date: appointmentDate,
          appointment_time: booking.selectedTime,
          amount: booking.selectedService.price,
          notes: booking.notes,
          status: 'Pending'
        });

        setBookingCompleted(true);
      } catch (err) {
        console.error("Booking failed", err);
        alert("Booking failed. Please try again.");
      }
    }
  };

  const isPhoneValid = (phone: string) => {
    // Basic check: only numbers, min length 8
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 8;
  };

  const isStepValid = () => {
    switch (booking.step) {
      case 1: return !!booking.selectedStaff;
      case 2: return !!booking.selectedDate && !!booking.selectedTime;
      case 3: return !!booking.selectedService;
      case 4: return !!booking.customerName && isPhoneValid(booking.customerPhone);
      default: return false;
    }
  };

  const toggleLanguage = () => {
    let newLang: Language = 'en';
    if (lang === 'en') newLang = 'fr';
    else if (lang === 'fr') newLang = 'ar';
    else newLang = 'en';
    
    setLang(newLang);
    setLanguage(newLang); // Sync with global context
  };

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
    );
  }

  if (bookingCompleted) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-8 text-center" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {/* @ts-ignore */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-8 rounded-[32px] shadow-xl max-w-sm w-full"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.bookingReceived}</h1>
          <p className="text-gray-500 mb-6 leading-relaxed">
            {t.bookingMessage} <b>{booking.customerPhone}</b>.
          </p>
          <div className="flex justify-center mb-6">
            <MessageCircle className="w-6 h-6 text-green-500 animate-bounce" />
          </div>
          <button 
            onClick={() => {
                setBookingCompleted(false);
                setBooking({
                    step: 1,
                    selectedStaff: null,
                    selectedDate: new Date(),
                    selectedTime: null,
                    selectedService: null,
                    customerName: '',
                    customerPhone: '',
                    notes: '',
                });
            }}
            className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-gray-800 transition-colors"
          >
            {t.done}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-gray-900 pb-32" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="fixed top-0 w-full z-40 bg-white/80 backdrop-blur-md px-6 py-4 flex justify-between items-center shadow-sm">
        {booking.step > 1 ? (
          <button onClick={prevStep} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition">
            <ArrowLeft className={`w-6 h-6 text-gray-900 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          </button>
        ) : (
          <div className="w-10" /> // Spacer
        )}
        
        {/* Progress Dots */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(s => (
            <div 
              key={s} 
              className={`h-2 rounded-full transition-all duration-300 ${booking.step >= s ? 'w-6 bg-gray-900' : 'w-2 bg-gray-200'}`} 
            />
          ))}
        </div>

        <div className="flex gap-2">
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-1 py-1.5 px-3 rounded-full bg-gray-100 hover:bg-gray-200 transition text-sm font-bold text-gray-700"
          >
            <Globe className="w-4 h-4" />
            <span className="uppercase">{lang}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 px-6 max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {/* @ts-ignore */}
          <motion.div
            key={booking.step}
            initial={{ opacity: 0, x: lang === 'ar' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: lang === 'ar' ? 20 : -20 }}
            transition={{ duration: 0.3 }}
          >
            {booking.step === 1 && (
              <Step1Specialist 
                staffList={staffData}
                selectedStaffId={booking.selectedStaff?.id}
                onSelect={(staff) => {
                  setBooking(prev => ({ ...prev, selectedStaff: staff }));
                }}
                t={t}
              />
            )}

            {booking.step === 2 && booking.selectedStaff && (
              <Step2DateTime
                staff={booking.selectedStaff}
                selectedDate={booking.selectedDate}
                selectedTime={booking.selectedTime}
                onDateSelect={(d) => setBooking(prev => ({ ...prev, selectedDate: d }))}
                onTimeSelect={(t) => setBooking(prev => ({ ...prev, selectedTime: t }))}
                t={t}
                lang={lang}
              />
            )}

            {booking.step === 3 && (
              <Step3Service 
                services={servicesData}
                selectedService={booking.selectedService}
                onSelect={(s) => setBooking(prev => ({ ...prev, selectedService: s }))}
                notes={booking.notes}
                onNotesChange={(val) => setBooking(prev => ({ ...prev, notes: val }))}
                t={t}
              />
            )}

            {booking.step === 4 && (
              <Step4Contact 
                bookingData={booking}
                onNameChange={(val) => setBooking(prev => ({ ...prev, customerName: val }))}
                onPhoneChange={(val) => setBooking(prev => ({ ...prev, customerPhone: val }))}
                t={t}
                lang={lang}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 w-full z-40 p-6 bg-gradient-to-t from-white via-white to-transparent">
        <div className="max-w-md mx-auto">
          <button
            onClick={booking.step === 4 ? handleBook : nextStep}
            disabled={!isStepValid()}
            className={`w-full py-4 rounded-[24px] font-bold text-lg shadow-xl transition-all duration-300 transform active:scale-95 ${
              isStepValid() 
                ? 'bg-gray-900 text-white opacity-100' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {booking.step === 4 ? t.confirmBooking : t.continue}
          </button>
        </div>
      </div>
    </div>
  );
}
