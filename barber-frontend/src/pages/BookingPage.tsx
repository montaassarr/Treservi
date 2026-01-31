import React, { useState, useEffect } from 'react';
import { useSalon } from '../context/SalonContext';
import { useLanguage } from '../context/LanguageContext';
import { saveAppState, saveSalonPreference } from '../utils/stateManager';
import { Step1Specialist } from '../components/booking/Step1Specialist';
import { Step2DateTime } from '../components/booking/Step2DateTime';
import { Step3Service } from '../components/booking/Step3Service';
import { Step4Contact } from '../components/booking/Step4Contact';
import { BookingState, Language, Translations, BookingStaff as Staff, BookingService as Service } from '../types';
import { ArrowLeft, CheckCircle, MessageCircle, Globe, MapPin, Navigation } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { fetchStaff } from '../services/staffService';
import { fetchServices } from '../services/serviceService';
import { createAppointment } from '../services/appointmentService';
import { useNavigate } from 'react-router-dom';
import { getStaffAvatar } from '../utils/avatarGenerator';

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
  },
  tn: {
    greeting: "Marhba bik fi Salon Hamdi",
    subtitle: "Ahjez rendez-vous mte3ek el jay.",
    filters: { all: "El Kol", barber: "Halleqin", colorist: "Sabbegh", stylist: "Styliste" },
    todaySchedule: "Awqat Lyoum",
    availableSlots: "Awqat fergha",
    live: "Live",
    date: "Date",
    time: "Waqt",
    chooseService: "Ekhtar Service",
    optionalNotes: "Eb3athli note ken t7eb (Optional)",
    notesPlaceholder: "e.g. Degrade, barbe...",
    bookingSummary: "Résumé",
    yourDetails: "Ma3loumetek",
    fullName: "Issem wo laqab",
    phoneNumber: "Noumrou telifoun",
    whatsappConfirm: "Bech nab3thoulek confirmation 3al WhatsApp.",
    invalidPhone: "Noumrou ghalet",
    specialist: "Specialiste",
    service: "Service",
    confirmBooking: "Confirm l'booking",
    continue: "Kammel",
    bookingReceived: "Wsol l'booking!",
    bookingMessage: "Bech nab3thoulek message WhatsApp 3la",
    done: "C'est bon",
    from: "Men"
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
      if (['en', 'fr', 'ar', 'tn'].includes(language)) {
         setLang(language as Language);
      }
    }
  }, [language]);

  const toggleLang = () => {
    const langs: Language[] = ['en', 'fr', 'tn'];
    const nextIndex = (langs.indexOf(lang) + 1) % langs.length;
    const nextLang = langs[nextIndex];
    setLang(nextLang);
    setLanguage(nextLang);
  };

  const [bookingCompleted, setBookingCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staffLoaded, setStaffLoaded] = useState(false);
  const [servicesLoaded, setServicesLoaded] = useState(false);
  const [staffData, setStaffData] = useState<Staff[]>([]);
  const [servicesData, setServicesData] = useState<Service[]>([]);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);

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
      if (!salon?.id) {
        setLoading(false);
        return;
      }
      
      // Load staff FIRST (priority) - show to user immediately
      try {
        const { data: staff, error: staffError } = await fetchStaff(salon.id);
        if (staff) {
          const mappedStaff: Staff[] = staff.map(s => ({
            id: s.id,
            name: s.full_name,
            role: s.specialty || 'Stylist',
            rating: 0,
            price: 0,
            image: s.avatar_url || getStaffAvatar(s.full_name),
            bgColor: 'bg-gray-50', 
            category: (s.specialty === 'Barber' || s.specialty === 'Colorist') ? s.specialty : 'Stylist'
          }));
          setStaffData(mappedStaff);
        }
        setStaffLoaded(true);
        setLoading(false); // Show UI immediately after staff loads
      } catch (err) {
        console.error('Error loading staff:', err);
        setLoading(false);
      }
      
      // Load services in background (not blocking UI)
      try {
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
        setServicesLoaded(true);
      } catch (err) {
        console.error('Error loading services:', err);
        setServicesLoaded(true);
      }
    }

    loadData();
  }, [salon?.id]);

  // Save app state on booking changes (so user is restored to this page if they close app)
  useEffect(() => {
    if (salon?.slug) {
      saveAppState('/book', salon.slug, { step: booking.step.toString() });
      saveSalonPreference(salon.slug);
    }
  }, [booking.step, salon?.slug]);

  useEffect(() => {
    const loadBookedTimes = async () => {
      if (!supabase || !salon?.id || !booking.selectedStaff || !booking.selectedDate) {
        setBookedTimes([]);
        return;
      }

      const dateKey = booking.selectedDate.toLocaleDateString('en-CA', { timeZone: 'Africa/Tunis' });
      console.log('Loading booked times for date:', dateKey, 'staff:', booking.selectedStaff.id);
      
      const { data, error } = await supabase
        .from('appointments')
        .select('appointment_time, status')
        .eq('salon_id', salon.id)
        .eq('staff_id', booking.selectedStaff.id)
        .eq('appointment_date', dateKey)
        .in('status', ['Confirmed', 'Pending', 'confirmed', 'pending']);

      if (error) {
        console.error('Error loading booked times:', error);
        setBookedTimes([]);
        return;
      }

      console.log('Booked appointments:', data);
      
      const times = (data || [])
        .map((item: any) => (item.appointment_time || '').slice(0, 5))
        .filter((time: string) => Boolean(time));
      
      console.log('Booked times:', times);
      setBookedTimes(times);
    };

    loadBookedTimes();

    if (!supabase || !salon?.id || !booking.selectedStaff) return;
    const channel = supabase
      .channel('booking-slots')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `staff_id=eq.${booking.selectedStaff.id}`,
      }, () => {
        loadBookedTimes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [salon?.id, booking.selectedStaff?.id, booking.selectedDate]);
  
  const nextStep = () => setBooking(prev => ({ ...prev, step: prev.step + 1 }));
  const prevStep = () => setBooking(prev => ({ ...prev, step: Math.max(1, prev.step - 1) }));

  const handleBook = async () => {
    if (booking.customerName && booking.customerPhone && booking.selectedStaff && booking.selectedService && booking.selectedDate && booking.selectedTime) {
      if (!salon?.id) return;
      
      try {
        // Create actual appointment
        const appointmentDate = booking.selectedDate.toLocaleDateString('en-CA', { timeZone: 'Africa/Tunis' });
        
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

  if (loading && !staffLoaded) {
    return (
        <div className="min-h-screen bg-[#FAFAFA] font-sans" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          {/* Header skeleton */}
          <header className="fixed top-0 w-full z-40 bg-white/80 backdrop-blur-md px-6 py-4 flex justify-between items-center shadow-sm">
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className="h-2 w-2 rounded-full bg-gray-200 animate-pulse" />
              ))}
            </div>
            <div className="w-16 h-8 bg-gray-200 rounded-full animate-pulse" />
          </header>
          
          {/* Content skeleton */}
          <main className="pt-24 px-6 max-w-md mx-auto">
            <div className="space-y-6">
              {/* Title skeleton */}
              <div className="space-y-2">
                <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
              </div>
              
              {/* Filter chips skeleton */}
              <div className="flex gap-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-10 w-20 bg-gray-200 rounded-full animate-pulse" />
                ))}
              </div>
              
              {/* Staff cards skeleton */}
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white p-5 rounded-[32px] flex items-center gap-4 animate-pulse">
                    <div className="w-16 h-16 bg-gray-200 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 bg-gray-200 rounded" />
                      <div className="h-4 w-20 bg-gray-100 rounded" />
                      <div className="h-4 w-24 bg-gray-200 rounded" />
                    </div>
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
    );
  }

  if (bookingCompleted) {
    const hasCoordinates = salon?.latitude && salon?.longitude;
    const hasAddress = salon?.address || salon?.city;
    const googleMapsUrl = hasCoordinates 
      ? `https://www.google.com/maps/dir/?api=1&destination=${salon?.latitude},${salon?.longitude}`
      : hasAddress 
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([salon?.address, salon?.city, salon?.country].filter(Boolean).join(', '))}`
        : null;
    
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
          <p className="text-gray-500 mb-4 leading-relaxed">
            {t.bookingMessage} <b>{booking.customerPhone}</b>.
          </p>
          
          {/* Salon Address Section */}
          {hasAddress && (
            <div className="mb-4 p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center justify-center gap-2 text-gray-700 mb-2">
                <MapPin className="w-5 h-5 text-red-500" />
                <span className="font-semibold">{lang === 'ar' ? 'العنوان' : lang === 'fr' ? 'Adresse' : 'Location'}</span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                {[salon?.address, salon?.city, salon?.country].filter(Boolean).join(', ')}
              </p>
            </div>
          )}

          {/* Google Maps Button */}
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-blue-700 transition-colors mb-4"
            >
              <Navigation className="w-5 h-5" />
              {lang === 'ar' ? 'افتح خرائط جوجل' : lang === 'fr' ? 'Ouvrir Google Maps' : 'Open Google Maps'}
            </a>
          )}

          <div className="flex justify-center mb-4">
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
      <header className="fixed top-0 w-full z-40 pt-[calc(env(safe-area-inset-top)+1rem)] px-6 bg-white/80 backdrop-blur-xl transition-all duration-300">
        <div className="flex justify-between items-center h-16 max-w-md mx-auto">
          {booking.step === 1 ? (
            <div className="w-10" /> // Spacer
          ) : (
            <button onClick={prevStep} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition">
              <ArrowLeft className={`w-6 h-6 text-gray-900 ${lang === 'ar' ? 'rotate-180' : ''}`} />
            </button>
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

          <div className="flex items-center gap-3">
             <button 
               onClick={toggleLang}
               className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-full text-sm font-bold shadow-lg shadow-gray-200 active:scale-95 transition-all"
             >
                <Globe size={16} />
                <span>{lang.toUpperCase()}</span>
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-[calc(env(safe-area-inset-top)+7rem)] px-6 max-w-md mx-auto pb-32">
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
                bookedTimes={bookedTimes}
                onDateSelect={(d) => setBooking(prev => ({ ...prev, selectedDate: d }))}
                onTimeSelect={(t) => setBooking(prev => ({ ...prev, selectedTime: t }))}
                t={t}
                lang={lang}
                openingTime={salon?.opening_time || '09:00'}
                closingTime={salon?.closing_time || '18:00'}
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
      <div className="fixed bottom-0 w-full z-40 px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-6 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <button
            onClick={booking.step === 4 ? handleBook : nextStep}
            disabled={!isStepValid()}
            className={`w-full py-4 rounded-[24px] font-bold text-lg shadow-xl shadow-black/5 transition-all duration-300 transform active:scale-95 mb-safe ${
              isStepValid() 
                ? 'bg-gray-900 text-white opacity-100 hover:shadow-2xl' 
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
