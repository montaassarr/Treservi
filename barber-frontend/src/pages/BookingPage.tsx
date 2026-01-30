import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSalon } from '../context/SalonContext';
import { useLanguage } from '../context/LanguageContext';
import { ChevronRight, ChevronLeft, MapPin, Star, Calendar, Clock, Scissors, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { formatPrice } from '../utils/format';
import { Service, StaffMember } from '../types';
import { StationManager } from '../components/StationManager'; 
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { fr, ar, enUS } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

// --- Sub-components extracted to prevent re-renders ---

const BookingHeader = ({ 
    step, 
    handleBack, 
    language, 
    dir 
}: { 
    step: number, 
    handleBack: () => void, 
    language: string, 
    dir: string 
}) => (
    <div className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 transition-colors">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
            <button 
                onClick={handleBack}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-black dark:text-white"
            >
                {dir === 'rtl' ? <ChevronRight size={24}/> : <ChevronLeft size={24}/>}
            </button>
            
            <div className="flex gap-2">
                {[1, 2, 3, 4].map((s) => (
                    <div 
                        key={s}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            s <= step 
                                ? 'w-8 bg-black dark:bg-white' 
                                : 'w-2 bg-gray-200 dark:bg-zinc-800'
                        }`}
                    />
                ))}
            </div>

            <div className="w-10 flex justify-end">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 text-xs flex items-center justify-center font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-700">
                    {language.toUpperCase()}
                </div>
            </div>
        </div>
    </div>
);

const StepInfo = ({ 
    t, 
    salon, 
    clientName, 
    setClientName, 
    clientPhone, 
    setClientPhone,
    language,
    handleNext 
}: any) => (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200 dark:border-zinc-800">
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center sm:text-left"
        >
            <h1 className="text-3xl font-bold dark:text-white mb-2">
                {language === 'ar' ? `مرحباً بك في ${salon?.name}` : `Welcome to ${salon?.name}`}
            </h1>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-500 dark:text-gray-400">
                <MapPin size={16} />
                <span>{salon?.address || "Address"}</span>
            </div>
        </motion.div>

        <div className="space-y-6 max-w-lg mx-auto sm:mx-0">
            <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-200 block">{t('booking.fullName')}</label>
                <input 
                    type="text" 
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    className="w-full px-4 py-4 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-black dark:focus:ring-white dark:text-white transition-all outline-none"
                    placeholder="John Doe"
                    autoFocus
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-200 block">{t('booking.phoneNumber')}</label>
                <input 
                    type="tel" 
                    value={clientPhone}
                    onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setClientPhone(val);
                    }}
                    className="w-full px-4 py-4 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-black dark:focus:ring-white dark:text-white transition-all outline-none"
                    placeholder="21600000000"
                />
            </div>
        </div>

        <div className="mt-10">
            <button 
                onClick={handleNext}
                disabled={!clientName || !clientPhone}
                className="w-full bg-black dark:bg-white text-white dark:text-black font-bold text-lg py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all shadow-lg"
            >
                {t('booking.startBooking')}
            </button>
        </div>
    </div>
);

const StepStaff = ({ 
    t, 
    salon, 
    selectedStaffId, 
    setSelectedStaffId 
}: any) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
            <h2 className="text-2xl font-bold dark:text-white">{t('booking.chooseBarber')}</h2>
            <div className="flex gap-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-full border border-gray-200 dark:border-zinc-800">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    Available
                </div>
            </div>
        </div>

        {/* Layout container allows scrolling if content overflows */}
        <div className="w-full min-h-[500px] md:min-h-[600px] max-h-[80vh] relative bg-white dark:bg-zinc-900 rounded-3xl overflow-y-auto shadow-sm border border-gray-200 dark:border-zinc-800">
            <StationManager 
                salonId={salon!.id} 
                userRole="client" 
                displayMode="embedded"
                selectedStaffId={selectedStaffId}
                onStationSelect={(staffId) => setSelectedStaffId(staffId)}
            />
        </div>
        
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            Tap on an occupied station to select that specialist.
        </p>
    </div>
);

const StepTime = ({ 
    t, 
    selectedDate, 
    setSelectedDate, 
    selectedTime, 
    setSelectedTime, 
    timeSlots, 
    getDateLocale 
}: any) => (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200 dark:border-zinc-800">
        <h2 className="text-2xl font-bold dark:text-white mb-8">{t('appointments.time')}</h2>

        {/* Date Picker */}
        <div className="mb-10">
            <div className="flex items-center gap-2 mb-4 text-gray-500 dark:text-gray-400">
                <Calendar size={18} />
                <span className="text-sm font-medium capitalize">
                    {format(selectedDate, 'MMMM yyyy', { locale: getDateLocale() })}
                </span>
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-4 px-1 no-scrollbar sm:scrollbar-thin sm:scrollbar-thumb-gray-200 dark:sm:scrollbar-thumb-zinc-800">
                {Array.from({ length: 14 }).map((_, i) => {
                    const date = addDays(new Date(), i);
                    const isSelected = isSameDay(date, selectedDate);
                    
                    return (
                        <button 
                            key={i}
                            onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                            className={`
                                min-w-[64px] h-[84px] flex flex-col items-center justify-center rounded-2xl transition-all flex-shrink-0 border cursor-pointer
                                ${isSelected 
                                    ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-lg scale-105' 
                                    : 'bg-gray-50 dark:bg-zinc-800/50 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-zinc-800'
                                }
                            `}
                        >
                            <span className="text-[11px] font-medium mb-1 uppercase tracking-wide opacity-70">
                                {format(date, 'EEE', { locale: getDateLocale() })}
                            </span>
                            <span className="text-xl font-bold">
                                {format(date, 'd')}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* Time Grid */}
        <div>
                <div className="flex items-center gap-2 mb-4 text-gray-500 dark:text-gray-400">
                <Clock size={18} />
                <span className="text-sm font-medium">{t('booking.availableSlots')}</span>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {timeSlots.map(({time, available}: any) => (
                    <button
                        key={time}
                        disabled={!available}
                        onClick={() => available && setSelectedTime(time)}
                        className={`
                            py-3 rounded-xl text-sm font-bold border transition-all text-center
                            ${!available 
                                ? 'bg-gray-50 dark:bg-zinc-800/30 text-gray-300 dark:text-zinc-700 border-transparent cursor-not-allowed' 
                                : (selectedTime === time 
                                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-md transform scale-105' 
                                    : 'bg-white dark:bg-zinc-950 text-gray-900 dark:text-white border-gray-200 dark:border-zinc-700 hover:border-black dark:hover:border-white'
                                )
                            }
                        `}
                    >
                        {time}
                    </button>
                ))}
            </div>
        </div>
    </div>
);

const StepServices = ({ 
    t, 
    services, 
    selectedService, 
    setSelectedService, 
    note, 
    setNote 
}: any) => (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold dark:text-white px-2">{t('booking.selectService')}</h2>

        <div className="max-h-[65vh] md:max-h-[70vh] overflow-y-auto pr-1 pb-24">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((service: Service) => (
                    <div 
                        key={service.id}
                        onClick={() => setSelectedService(service)}
                        className={`
                            p-6 rounded-3xl cursor-pointer flex flex-col justify-between transition-all border group relative overflow-hidden
                            ${selectedService?.id === service.id 
                                ? 'bg-black dark:bg-white text-white dark:text-black shadow-xl ring-2 ring-offset-2 ring-black dark:ring-white dark:ring-offset-zinc-950' 
                                : 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border-gray-200 dark:border-zinc-800 hover:shadow-md'
                            }
                        `}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-full ${selectedService?.id === service.id ? 'bg-white/20 dark:bg-black/10' : 'bg-gray-100 dark:bg-zinc-800'}`}>
                                <Scissors size={20} />
                            </div>
                            <div className={`text-xl font-bold ${selectedService?.id === service.id ? 'text-white dark:text-black' : 'text-black dark:text-white'}`}>
                                {formatPrice(service.price)}
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-lg mb-1">
                                {service.name}
                            </h3>
                            <div className={`flex items-center gap-2 text-sm ${selectedService?.id === service.id ? 'opacity-80' : 'text-gray-500'}`}>
                                <Clock size={14} />
                                <span>{service.duration} mins</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Optional Note */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-200 dark:border-zinc-800 mt-6">
                <label className="block text-sm font-medium text-gray-500 mb-3">{t('booking.notes')}</label>
                <textarea 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border-none resize-none h-32 outline-none focus:ring-2 focus:ring-black dark:focus:ring-white dark:text-white placeholder-gray-400"
                    placeholder="Anything we should know?"
                />
            </div>
        </div>
    </div>
);

const StickyFooter = ({ 
    step, 
    selectedService, 
    selectedStaffId, 
    selectedTime, 
    loading, 
    handleNext, 
    handleBook, 
    t 
}: any) => (
    (step > 1) ? (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-lg border-t border-gray-100 dark:border-zinc-800 z-50">
            <div className="max-w-2xl mx-auto flex items-center gap-4">
                <div className="flex-1">
                        {selectedService ? (
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total</span>
                            <span className="text-xl font-bold text-black dark:text-white">{formatPrice(selectedService.price)}</span>
                        </div>
                    ) : selectedStaffId && (
                        <div className="flex flex-col">
                                <span className="text-sm font-medium text-black dark:text-white">Selected Staff</span>
                                <span className="text-xs text-gray-500">
                                Please select valid options
                                </span>
                        </div>
                    )}
                </div>
                
                <button 
                    onClick={() => {
                        if (step === 2 && selectedStaffId) handleNext();
                        else if (step === 3 && selectedTime) handleNext();
                        else if (step === 4 && selectedService) handleBook();
                    }}
                    disabled={
                        (step === 2 && !selectedStaffId) ||
                        (step === 3 && !selectedTime) ||
                        (step === 4 && !selectedService) || 
                        loading
                    }
                    className="bg-black dark:bg-white text-white dark:text-black px-8 py-3.5 rounded-xl font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                    {step === 4 
                        ? (loading ? t('common.loading') : t('booking.confirmBooking')) 
                        : t('booking.nextStep')
                    }
                </button>
            </div>
        </div>
    ) : null
);

// --- Main Component ---

const BookingPage: React.FC = () => {
    const { salon, isLoading: isSalonLoading } = useSalon();
    const { t, language, setLanguage, dir } = useLanguage();
    const navigate = useNavigate();
    
    // Steps: 1=Info, 2=Staff, 3=Time, 4=Service/Note
    const [step, setStep] = useState(1);
    
    // Data State
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    
    // Selection State
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [note, setNote] = useState('');
    
    // Lists
    const [services, setServices] = useState<Service[]>([]);
    const [timeSlots, setTimeSlots] = useState<{time: string, available: boolean}[]>([]);
    
    const [loading, setLoading] = useState(false);

    // Helper: Date Locale
    const getDateLocale = () => {
        if (language === 'fr' || language === 'tn') return fr;
        if (language === 'ar') return ar;
        return enUS;
    };

    // Fetch Services
    useEffect(() => {
        if (salon?.id) {
            const fetchServices = async () => {
                const { data } = await supabase
                    .from('services')
                    .select('*')
                    .eq('salon_id', salon.id)
                    .eq('is_active', true);
                if (data) setServices(data);
            };

            fetchServices();
        }
    }, [salon?.id]);

    // Generate/Mock Available Times
    useEffect(() => {
        if (selectedStaffId && selectedDate) {
            // In a real app, this would fetch booked slots from DB
            const allSlots = [
                '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
                '16:00', '16:30', '17:00'
            ];
            
            const slotsWithStatus = allSlots.map((time, i) => ({
                time,
                // Mock availability
                available: !((selectedDate.getDate() + i) % 4 === 0) 
            }));
            
            setTimeSlots(slotsWithStatus);
        }
    }, [selectedStaffId, selectedDate]);

    // Navigation Handlers
    const handleNext = () => {
        setStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(prev => prev - 1);
        } else {
             navigate('/');
        }
    };

    const handleBook = async () => {
        if (!salon || !selectedStaffId || !selectedService || !selectedTime) return;

        setLoading(true);
        try {
            const appointmentDate = format(selectedDate, 'yyyy-MM-dd');
            
            const { error } = await supabase.from('appointments').insert({
                salon_id: salon.id,
                staff_id: selectedStaffId,
                service_id: selectedService.id,
                customer_name: clientName,
                customer_phone: clientPhone,
                appointment_date: appointmentDate,
                appointment_time: selectedTime,
                status: 'Pending',
                amount: selectedService.price,
                notes: note || null
            });

            if (error) throw error;
            
            alert('Booking Confirmed! You will receive a confirmation shortly.');
            navigate('/');
        } catch (err) {
            console.error('Booking failed:', err);
            alert('Booking failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (isSalonLoading) return <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-zinc-950 dark:text-white">Loading...</div>;
    if (!salon) return <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-zinc-950 dark:text-white">Salon not found</div>;

    return (
        <div className={`min-h-screen bg-gray-50 dark:bg-zinc-950 font-sans ${dir === 'rtl' ? 'rtl' : 'ltr'}`}>
            <BookingHeader 
                step={step} 
                handleBack={handleBack} 
                language={language} 
                dir={dir} 
            />
            
            <main className="max-w-2xl mx-auto px-4 pt-8 pb-32">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        {step === 1 && (
                            <StepInfo 
                                t={t} 
                                salon={salon} 
                                clientName={clientName} 
                                setClientName={setClientName} 
                                clientPhone={clientPhone} 
                                setClientPhone={setClientPhone} 
                                language={language}
                                handleNext={handleNext} 
                            />
                        )}
                        {step === 2 && (
                            <StepStaff 
                                t={t} 
                                salon={salon} 
                                selectedStaffId={selectedStaffId} 
                                setSelectedStaffId={setSelectedStaffId} 
                            />
                        )}
                        {step === 3 && (
                            <StepTime 
                                t={t} 
                                selectedDate={selectedDate} 
                                setSelectedDate={setSelectedDate} 
                                selectedTime={selectedTime} 
                                setSelectedTime={setSelectedTime} 
                                timeSlots={timeSlots} 
                                getDateLocale={getDateLocale} 
                            />
                        )}
                        {step === 4 && (
                            <StepServices 
                                t={t} 
                                services={services} 
                                selectedService={selectedService} 
                                setSelectedService={setSelectedService} 
                                note={note} 
                                setNote={setNote} 
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>

            <StickyFooter 
                step={step} 
                selectedService={selectedService} 
                selectedStaffId={selectedStaffId} 
                selectedTime={selectedTime} 
                loading={loading} 
                handleNext={handleNext} 
                handleBook={handleBook} 
                t={t} 
            />
        </div>
    );
};

export default BookingPage;