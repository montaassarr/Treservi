import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSalon } from '../context/SalonContext';
import { StationManager } from '../components/StationManager';
import { Calendar, Clock, Scissors, Check, ChevronRight, ChevronLeft, Star } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { formatPrice } from '../utils/format';
import { Service } from '../types';

const BookingPage: React.FC = () => {
    const { salon, isLoading, error } = useSalon();
    const navigate = useNavigate();
    
    const [step, setStep] = useState(1);
    const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    
    const [services, setServices] = useState<Service[]>([]);
    const [availableTimes, setAvailableTimes] = useState<string[]>([]);
    
    useEffect(() => {
        if (salon?.id) {
            fetchServices();
        }
    }, [salon?.id]);

    useEffect(() => {
        if (selectedStaff && selectedDate) {
            // Mock available times for now
            const times = [
                '09:00 AM', '10:00 AM', '11:00 AM', 
                '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
            ];
            setAvailableTimes(times);
        }
    }, [selectedStaff, selectedDate]);

    const fetchServices = async () => {
        if (!salon) return;
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('salon_id', salon.id)
            .eq('is_active', true);
        
        if (data) setServices(data);
    };

    const handleBook = async () => {
        if (!salon || !selectedStaff || !selectedService || !selectedTime) return;

        try {
            // Create Appointment
            const { error } = await supabase.from('appointments').insert({
                salon_id: salon.id,
                staff_id: selectedStaff,
                service_id: selectedService.id,
                customer_name: 'Guest Client', // In real app, from auth or input
                appointment_date: selectedDate,
                appointment_time: selectedTime,
                status: 'Pending',
                amount: selectedService.price,
                service_name: selectedService.name // redundant but useful for display
            });

            if (error) throw error;
            alert('Booking Confirmed!');
            navigate(0); // Reload
        } catch (err) {
            console.error('Booking failed:', err);
            alert('Booking failed. Please try again.');
        }
    };

    if (isLoading) return (
        <div className="min-h-screen flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4"></div>
            <p className="text-gray-500">Loading salon data...</p>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center text-red-500">
            Error: {error}
        </div>
    );

    if (!salon) return <div className="min-h-screen flex items-center justify-center">Salon not found</div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8 font-sans pb-32">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{salon.name}</h1>
                        <p className="text-gray-500">Book your appointment</p>
                    </div>
                </div>

                {/* Steps Indicator */}
                <div className="flex items-center justify-between px-4 sm:px-12 py-6 bg-white dark:bg-gray-900 rounded-[32px] shadow-sm">
                    {[1, 2, 3, 4].map((s) => (
                        <div key={s} className="flex items-center">
                            <div className={`
                                w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base border-2 transition-all
                                ${step >= s ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 'bg-transparent text-gray-300 border-gray-200'}
                            `}>
                                {step > s ? <Check size={16} /> : s}
                            </div>
                            {s < 4 && <div className={`w-8 sm:w-16 h-1 mx-2 sm:mx-4 rounded-full ${step > s ? 'bg-black dark:bg-white' : 'bg-gray-100'}`} />}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div className="space-y-6">
                    
                    {/* Step 1: Select Specialist (3D Map) */}
                    <div className={step === 1 ? 'block' : 'hidden'}>
                         <div className="bg-white dark:bg-gray-900 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                             <h2 className="text-xl font-bold mb-4">Choose Specialist Station</h2>
                             {/* Embedded Station Manager */}
                             <StationManager 
                                salonId={salon.id} 
                                userRole="client" 
                                displayMode="embedded"
                                onStationSelect={(staffId) => {
                                    setSelectedStaff(staffId);
                                    setStep(2); // Auto advance
                                }}
                             />
                         </div>
                    </div>

                    {/* Step 2: Select Service */}
                    <div className={step === 2 ? 'block' : 'hidden'}>
                        <div className="bg-white dark:bg-gray-900 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                            <h2 className="text-xl font-bold mb-6">Choose Service</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {services.map(service => (
                                    <div 
                                        key={service.id}
                                        onClick={() => setSelectedService(service)}
                                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center group ${selectedService?.id === service.id ? 'border-black dark:border-white bg-gray-50 dark:bg-white/10' : 'border-transparent bg-gray-50 dark:bg-gray-800 hover:bg-gray-100'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                                                <Scissors size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">{service.name}</h3>
                                                <p className="text-sm text-gray-500">{service.duration} min</p>
                                            </div>
                                        </div>
                                        <div className="font-bold text-lg">
                                            {formatPrice(service.price)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 flex justify-between">
                                <button onClick={() => setStep(1)} className="px-6 py-3 rounded-full font-bold text-gray-500 hover:bg-gray-100">Back</button>
                                <button 
                                    disabled={!selectedService}
                                    onClick={() => setStep(3)} 
                                    className="px-8 py-3 rounded-full bg-black dark:bg-white text-white dark:text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform shadow-lg"
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Date & Time */}
                    <div className={step === 3 ? 'block' : 'hidden'}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-gray-900 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h2 className="text-xl font-bold mb-6">Select Date</h2>
                                <input 
                                    type="date" 
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full text-lg p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border-none outline-none font-bold"
                                    min={new Date().toISOString().split('T')[0]} // No past dates
                                />
                            </div>

                             <div className="bg-white dark:bg-gray-900 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                                <h2 className="text-xl font-bold mb-6">Available Time</h2>
                                <div className="grid grid-cols-3 gap-3">
                                    {availableTimes.map(time => (
                                        <button
                                            key={time}
                                            onClick={() => setSelectedTime(time)}
                                            className={`py-3 rounded-xl text-sm font-bold transition-all border ${selectedTime === time ? 'bg-treservi-accent text-white border-transparent shadow-neon-glow' : 'bg-transparent border-gray-200 dark:border-gray-700 hover:border-gray-400'}`}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                         <div className="mt-8 flex justify-between">
                            <button onClick={() => setStep(2)} className="px-6 py-3 rounded-full font-bold text-gray-500 hover:bg-gray-100">Back</button>
                            <button 
                                disabled={!selectedTime}
                                onClick={() => setStep(4)} 
                                className="px-8 py-3 rounded-full bg-black dark:bg-white text-white dark:text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform shadow-lg"
                            >
                                Continue
                            </button>
                        </div>
                    </div>

                    {/* Step 4: Summary & Confirm */}
                    <div className={step === 4 ? 'block' : 'hidden'}>
                         <div className="bg-white dark:bg-gray-900 rounded-[32px] p-8 shadow-xl border border-gray-100 dark:border-gray-800 max-w-2xl mx-auto">
                            <h2 className="text-2xl font-bold mb-8 text-center">Confirm Appointment</h2>
                            
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white dark:bg-black rounded-full">
                                            <Calendar size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Date & Time</p>
                                            <p className="font-bold text-lg">{selectedDate} at {selectedTime}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setStep(3)} className="text-sm text-blue-500 underline">Change</button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white dark:bg-black rounded-full">
                                            <Scissors size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Service</p>
                                            <p className="font-bold text-lg">{selectedService?.name}</p>
                                        </div>
                                    </div>
                                    <p className="font-bold text-xl">{selectedService ? formatPrice(selectedService.price) : ''}</p>
                                </div>
                            </div>

                            <button 
                                onClick={handleBook}
                                className="w-full mt-8 py-4 rounded-full bg-treservi-accent text-white text-xl font-bold shadow-neon-glow hover:scale-[1.02] transition-transform"
                            >
                                Confirm Booking
                            </button>
                             <button onClick={() => setStep(3)} className="w-full mt-4 text-gray-500 font-bold">Cancel</button>
                         </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default BookingPage;