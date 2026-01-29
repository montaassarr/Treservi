import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSalon } from '../context/SalonContext';
import { StationManager } from '../components/StationManager';
import { Check, ChevronRight, ChevronLeft, Calendar, FileText } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { formatPrice } from '../utils/format';
import { Service } from '../types';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';

const BookingPage: React.FC = () => {
    const { salon, isLoading: isSalonLoading } = useSalon();
    const navigate = useNavigate();
    
    // Steps: 1=Info, 2=Station, 3=Time, 4=Service/Note
    const [step, setStep] = useState(1);
    
    // Data State
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [selectedStaffProfile, setSelectedStaffProfile] = useState<any>(null);
    
    const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [note, setNote] = useState('');
    
    const [services, setServices] = useState<Service[]>([]);
    const [availableTimes, setAvailableTimes] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

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

    // Fetch Staff Profile when selected
    useEffect(() => {
        if (selectedStaffId) {
            const fetchStaff = async () => {
                const { data } = await supabase
                    .from('staff')
                    .select('*')
                    .eq('id', selectedStaffId)
                    .single();
                if (data) setSelectedStaffProfile(data);
            };
            fetchStaff();
        }
    }, [selectedStaffId]);

    // Generate/Mock Available Times
    useEffect(() => {
        if (selectedStaffId && selectedDate) {
            // In a real app, we would fetch existing appointments for this staff/date and filter them out
            // For now, generating standard slots
            const slots = [
                '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
                '16:00', '16:30', '17:00'
            ];
            setAvailableTimes(slots);
        }
    }, [selectedStaffId, selectedDate]);

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

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

    // Render Steps
    // -----------------------------------------------------

    // STEP 1: Client Info
    const renderStep1 = () => (
        <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl mt-10">
            <h2 className="text-2xl font-bold mb-6 text-center dark:text-white">Welcome to {salon?.name}</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                    <input 
                        type="text" 
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                        placeholder="John Doe"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                    <input 
                        type="tel" 
                        value={clientPhone}
                        onChange={e => setClientPhone(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                        placeholder="+216 00 000 000"
                    />
                </div>
                <button 
                    onClick={handleNext}
                    disabled={!clientName || !clientPhone}
                    className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-4 rounded-xl mt-4 disabled:opacity-50 hover:scale-[1.02] transition-transform"
                >
                    Start Booking
                </button>
            </div>
        </div>
    );

    // STEP 2: Station Selection
    const renderStep2 = () => (
        <div className="w-full max-w-5xl mx-auto mt-4 px-4">
            <div className="bg-white dark:bg-zinc-900 rounded-[32px] overflow-hidden shadow-2xl border dark:border-zinc-800">
                <div className="p-6 md:p-8 bg-white dark:bg-zinc-900 border-b dark:border-zinc-800 flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold dark:text-white">Choose Specialist Station</h2>
                        <p className="text-gray-500 mt-1">👆 Click on a station map to select your barber</p>
                    </div>
                    {selectedStaffId && (
                         <button 
                            onClick={handleNext}
                            className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-green-500/30 transition-all flex items-center gap-2 animate-pulse"
                        >
                            Next Step <ChevronRight size={20} />
                        </button>
                    )}
                </div>
                
                <div className="h-[500px] md:h-[600px] relative bg-gray-50 dark:bg-black">
                     <StationManager 
                        salonId={salon!.id} 
                        userRole="client" 
                        displayMode="embedded"
                        selectedStaffId={selectedStaffId}
                        onStationSelect={(staffId) => setSelectedStaffId(staffId)}
                     />
                </div>
            </div>
        </div>
    );

    // STEP 3: Time Selection (Doctor UI Style)
    const renderStep3 = () => (
        <div className="w-full max-w-md mx-auto mt-4 pb-20">
             {/* Profile Card */}
             <div className="bg-gradient-to-br from-teal-50 to-white dark:from-zinc-800 dark:to-zinc-900 p-6 rounded-[32px] shadow-lg mb-6 text-center relative overflow-hidden">
                <div className="absolute top-4 left-4">
                     <button onClick={handleBack} className="p-2 bg-white dark:bg-black rounded-full shadow-sm hover:scale-110 transition-transform"><ChevronLeft size={20} className="dark:text-white"/></button>
                </div>
                
                <div className="w-24 h-24 mx-auto bg-gray-200 rounded-full mb-4 overflow-hidden border-4 border-white dark:border-zinc-700 shadow-lg">
                    {/* Placeholder or Initials */}
                   <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-3xl font-bold text-gray-400">
                        {selectedStaffProfile?.full_name?.charAt(0) || 'B'}
                   </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {selectedStaffProfile?.full_name || 'Staff Member'}
                </h3>
                <p className="text-teal-600 font-medium text-sm mb-4">
                    {selectedStaffProfile?.role || 'Professional Stylist'}
                </p>
                
                {/* Stats Row */}
                <div className="flex justify-center gap-4 text-xs">
                    <div className="bg-white dark:bg-zinc-800 px-4 py-2 rounded-2xl shadow-sm">
                        <span className="block font-bold dark:text-white">Full time</span>
                        <span className="text-gray-400">Availability</span>
                    </div>
                </div>
             </div>

             {/* Date Selector */}
             <div className="mb-6">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h4 className="font-bold text-lg dark:text-white">{format(selectedDate, 'MMMM yyyy')}</h4>
                    <div className="flex gap-2">
                         <button className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 dark:text-white"><ChevronLeft size={20}/></button>
                         <button className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 dark:text-white"><ChevronRight size={20}/></button>
                    </div>
                </div>
                
                {/* Horizontal Scroll Days */}
                <div className="flex gap-3 overflow-x-auto pb-4 px-2 no-scrollbar">
                    {Array.from({ length: 14 }).map((_, i) => {
                        const date = addDays(new Date(), i);
                        const isSelected = isSameDay(date, selectedDate);
                        const isToday = isSameDay(date, new Date());
                        
                        return (
                            <button 
                                key={i}
                                onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                                className={`
                                    min-w-[70px] flex flex-col items-center p-3 rounded-[20px] border transition-all
                                    ${isSelected 
                                        ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-lg scale-105' 
                                        : 'bg-white dark:bg-zinc-900 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-zinc-800'
                                    }
                                `}
                            >
                                <span className="text-xs font-medium mb-1">{format(date, 'EEE')}</span>
                                <span className={`text-lg font-bold ${isSelected ? '' : (isToday ? 'text-black dark:text-white' : '')}`}>
                                    {format(date, 'd')}
                                </span>
                            </button>
                        );
                    })}
                </div>
             </div>

             {/* Available Times */}
             <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-sm">
                <h4 className="font-bold text-gray-900 dark:text-white mb-4">Availability</h4>
                <div className="grid grid-cols-3 gap-3">
                    {availableTimes.map(time => (
                        <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`
                                py-3 px-2 rounded-xl text-sm font-bold border transition-all
                                ${selectedTime === time 
                                    ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-md' 
                                    : 'bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-transparent hover:border-gray-200 dark:hover:border-zinc-700'
                                }
                            `}
                        >
                            {time}
                        </button>
                    ))}
                </div>
             </div>
             
             {/* FAB Bottom */}
             {selectedTime && (
                <div className="fixed bottom-6 left-0 right-0 px-6 flex justify-center z-50">
                    <button 
                        onClick={handleNext}
                        className="w-full max-w-md bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold text-lg shadow-2xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                    >
                        continue to services <ChevronRight/>
                    </button>
                </div>
             )}
        </div>
    );

    // STEP 4: Services
    const renderStep4 = () => (
        <div className="w-full max-w-md mx-auto mt-4 px-4 pb-32">
             <div className="flex items-center gap-4 mb-6">
                <button onClick={handleBack} className="p-3 bg-white dark:bg-zinc-900 rounded-full shadow-sm"><ChevronLeft className="dark:text-white"/></button>
                <h2 className="text-2xl font-bold dark:text-white">Select Services</h2>
             </div>
             
             <div className="space-y-4 mb-8">
                 {services.map(service => (
                     <div 
                        key={service.id}
                        onClick={() => setSelectedService(service)}
                        className={`
                            p-4 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all
                            ${selectedService?.id === service.id 
                                ? 'border-black bg-gray-50 dark:border-white dark:bg-zinc-800' 
                                : 'border-transparent bg-white dark:bg-zinc-900 shadow-sm'
                            }
                        `}
                     >
                        <div>
                            <h3 className="font-bold dark:text-white">{service.name}</h3>
                            <p className="text-sm text-gray-500">{service.duration} mins</p>
                        </div>
                        <div className="font-bold text-lg dark:text-white">
                            {formatPrice(service.price)}
                        </div>
                     </div>
                 ))}
             </div>

             <div className="bg-white dark:bg-zinc-900 p-6 rounded-[24px] shadow-sm mb-6">
                <div className="flex items-center gap-2 mb-3 text-gray-700 dark:text-gray-300 font-bold">
                    <FileText size={18} />
                    <span>Special Note (Optional)</span>
                </div>
                <textarea 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="E.g., I have sensitive skin, or want a specific style..."
                    className="w-full h-24 p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl border-none resize-none focus:ring-2 focus:ring-black dark:focus:ring-white dark:text-white"
                />
             </div>

             {/* Checkout Footer */}
             {selectedService && (
                <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t dark:border-zinc-800 p-6 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50">
                    <div className="max-w-md mx-auto">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <p className="text-sm text-gray-500">Total Amount</p>
                                <p className="text-2xl font-bold dark:text-white">{formatPrice(selectedService.price)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400">Appointment with</p>
                                <p className="font-bold dark:text-white text-sm">{selectedStaffProfile?.full_name}</p>
                                <p className="text-xs font-mono bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded mt-1 inline-block">
                                    {format(selectedDate, 'MMM d')} • {selectedTime}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={handleBook}
                            disabled={loading}
                            className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold text-lg shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                            {loading ? 'Confirming...' : 'Confirm Appointment'}
                        </button>
                    </div>
                </div>
             )}
        </div>
    );

    if (isSalonLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
    if (!salon) return <div className="h-screen flex items-center justify-center">Salon not found</div>;

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-black font-sans pb-20">
            {/* Header Steps Progress */}
            <div className="bg-white dark:bg-black pt-6 pb-4 px-4 sticky top-0 z-40 border-b dark:border-zinc-800/50">
                <div className="max-w-md mx-auto flex items-center justify-between relative">
                    {[1, 2, 3, 4].map((s) => (
                        <div key={s} className="flex flex-col items-center z-10">
                            <div 
                                className={`
                                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500
                                    ${step >= s ? 'bg-black text-white dark:bg-white dark:text-black scale-110' : 'bg-gray-200 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600'}
                                `}
                            >
                                {step > s ? <Check size={14}/> : s}
                            </div>
                        </div>
                    ))}
                    {/* Progress Bar Background */}
                    <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 dark:bg-zinc-800 -z-0">
                         <div 
                            className="h-full bg-black dark:bg-white transition-all duration-500" 
                            style={{ width: `${((step - 1) / 3) * 100}%` }}
                         />
                    </div>
                </div>
                <div className="text-center mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {step === 1 && 'Your Info'}
                    {step === 2 && 'Barber'}
                    {step === 3 && 'Time'}
                    {step === 4 && 'Service'}
                </div>
            </div>

            {/* Content Area */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
            </div>
        </div>
    );
};

export default BookingPage;