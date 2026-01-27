import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Armchair, Monitor, HeartPulse, Plus, X, Trash2, User as UserIcon, Move } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useLanguage } from '../context/LanguageContext';

interface Station {
  id: string;
  salon_id: string;
  name: string;
  type: 'chair' | 'desk' | 'table';
  current_staff_id?: string;
  position_x: number;
  position_y: number;
  is_active: boolean;
}

interface Staff {
  id: string;
  full_name: string;
}

interface StationManagerProps {
  salonId: string;
  userRole?: 'owner' | 'staff';
}

const STATION_TYPES = [
  { type: 'chair', icon: Armchair, label: 'Barber Chair', color: 'bg-blue-100 text-blue-600' },
  { type: 'desk', icon: Monitor, label: 'Nail Desk', color: 'bg-purple-100 text-purple-600' },
  { type: 'table', icon: HeartPulse, label: 'Massage Table', color: 'bg-green-100 text-green-600' },
] as const;

export const StationManager: React.FC<StationManagerProps> = ({ salonId, userRole = 'owner' }) => {
  const { t } = useLanguage();
  const [stations, setStations] = useState<Station[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchData();
    // Subscribe to realtime changes
    const channel = supabase
      .channel('stations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stations', filter: `salon_id=eq.${salonId}` }, 
        () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [salonId]);

  const fetchData = async () => {
    try {
      const { data: stationsData, error: stationsError } = await supabase
        .from('stations')
        .select('*')
        .eq('salon_id', salonId);
      
      if (stationsError) throw stationsError;
      setStations(stationsData || []);

      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, full_name')
        .eq('salon_id', salonId)
        .eq('status', 'Active');

      if (staffError) throw staffError;
      setStaff(staffData || []);
    } catch (error) {
      console.error('Error fetching station data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePosition = async (id: string, x: number, y: number) => {
    if (userRole !== 'owner') return;
    await supabase.from('stations').update({ position_x: x, position_y: y }).eq('id', id);
  };

  const handleDeleteStation = async (id: string) => {
    if (userRole !== 'owner') return;
    if (window.confirm(t('common.delete') + '?')) {
      await supabase.from('stations').delete().eq('id', id);
      fetchData();
    }
  };

  const handleAddStation = async (type: 'chair' | 'desk' | 'table') => {
    if (userRole !== 'owner') return;
    const count = stations.filter(s => s.type === type).length;
    await supabase.from('stations').insert({
      salon_id: salonId,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${count + 1}`,
      type,
      position_x: 50 + (stations.length * 20),
      position_y: 50,
    });
    fetchData();
  };

  const handleAssignStaff = async (stationId: string, staffId: string | null) => {
    if (userRole !== 'owner') return;
    await supabase.from('stations').update({ current_staff_id: staffId || null }).eq('id', stationId);
    fetchData();
  };

  // Card View (Dashboard Widget)
  const renderCard = () => (
    <motion.div 
      layoutId="station-card"
      className="bg-white dark:bg-treservi-card-dark p-6 rounded-[32px] shadow-soft-glow cursor-pointer relative overflow-hidden group"
      onClick={() => setIsOpen(true)}
    >
      <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
        <div className="bg-treservi-accent/10 p-2 rounded-full text-treservi-accent">
          <Move size={20} />
        </div>
      </div>
      
      <h3 className="font-bold text-xl mb-4 text-gray-800 dark:text-white">{t('stations.title') || 'Live Salon Stations'}</h3>
      
      <div className="grid grid-cols-2 gap-3">
        {stations.slice(0, 4).map(station => {
          const typeInfo = STATION_TYPES.find(t => t.type === station.type);
          const assignedStaff = staff.find(s => s.id === station.current_staff_id);
          const Icon = typeInfo?.icon || Armchair;
          
          return (
            <div key={station.id} className={`p-3 rounded-2xl ${assignedStaff ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'} border flex flex-col items-center justify-center text-center transition-colors`}>
              <Icon size={20} className={`mb-1 ${assignedStaff ? 'text-red-500' : 'text-green-500'}`} />
              <span className="text-xs font-bold text-gray-700 dark:text-gray-700 truncate w-full">{station.name}</span>
              {assignedStaff && <span className="text-[10px] text-gray-500 truncate w-full">{assignedStaff.full_name.split(' ')[0]}</span>}
            </div>
          );
        })}
        {stations.length === 0 && <div className="col-span-2 text-center text-gray-400 text-sm py-4">No stations setup</div>}
      </div>
      <div className="mt-4 text-center text-sm text-treservi-accent font-semibold group-hover:underline">
        {userRole === 'owner' ? 'Manage Layout' : 'View Full Map'}
      </div>
    </motion.div>
  );

  // Expanded Modal View
  return (
    <>
      {renderCard()}
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              layoutId="station-card"
              className="bg-white dark:bg-treservi-card-dark w-full max-w-5xl h-[80vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/80 dark:bg-black/20 backdrop-blur-md sticky top-0 z-20">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t('stations.stationManager') || 'Station Manager'}</h2>
                  <p className="text-gray-500">
                    {userRole === 'owner' ? 'Drag to arrange. Click to assign staff.' : 'View current salon status.'}
                  </p>
                </div>
                <div className="flex gap-3">
                   {userRole === 'owner' && (
                     <div className="flex bg-gray-100 dark:bg-gray-800 rounded-full p-1">
                       {STATION_TYPES.map(type => (
                         <button
                           key={type.type}
                           onClick={() => handleAddStation(type.type as any)}
                           className="p-3 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-all text-gray-600 dark:text-gray-300"
                           title={`Add ${type.label}`}
                         >
                           <type.icon size={20} />
                         </button>
                       ))}
                     </div>
                   )}
                   <button 
                     onClick={() => setIsOpen(false)}
                     className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 transition-colors"
                   >
                     <X size={24} />
                   </button>
                </div>
              </div>

              {/* Canvas */}
              <div className="flex-1 bg-gray-50 dark:bg-[#1a1b1e] relative overflow-hidden p-8"
                   style={{ 
                     backgroundImage: 'radial-gradient(circle, #ddd 1px, transparent 1px)', 
                     backgroundSize: '24px 24px' 
                   }}>
                
                {stations.map(station => {
                   const typeInfo = STATION_TYPES.find(t => t.type === station.type);
                   const assignedStaff = staff.find(s => s.id === station.current_staff_id);
                   const Icon = typeInfo?.icon || Armchair;

                   return (
                     <motion.div
                       key={station.id}
                       drag={userRole === 'owner'}
                       dragMomentum={false}
                       initial={{ x: station.position_x, y: station.position_y }}
                       onDragEnd={(_, info) => {
                         const newX = station.position_x + info.offset.x;
                         const newY = station.position_y + info.offset.y;
                         handleUpdatePosition(station.id, newX, newY);
                       }}
                       whileHover={{ scale: 1.05, boxShadow: "0px 10px 25px rgba(0,0,0,0.1)" }}
                       className={`
                         absolute w-40 p-4 rounded-3xl bg-white dark:bg-gray-800 border-2
                         flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing shadow-lg group
                         ${assignedStaff ? 'border-red-400 shadow-red-100 dark:shadow-red-900/10' : 'border-green-400 shadow-green-100 dark:shadow-green-900/10'}
                       `}
                       // Simplified positioning for demo - normally use absolute refs
                     >
                       {userRole === 'owner' && (
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleDeleteStation(station.id); }}
                           className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
                         >
                           <Trash2 size={12} />
                         </button>
                       )}

                       <div className={`p-3 rounded-2xl ${typeInfo?.color}`}>
                         <Icon size={24} />
                       </div>
                       
                       <div className="text-center w-full">
                         <div className="font-bold text-gray-800 dark:text-gray-200">{station.name}</div>
                         
                         {userRole === 'owner' ? (
                            <select 
                              className="mt-2 w-full text-xs p-2 rounded-xl bg-gray-100 dark:bg-gray-900 border-none outline-none"
                              value={station.current_staff_id || ''}
                              onChange={(e) => handleAssignStaff(station.id, e.target.value || null)}
                            >
                              <option value="">-- Available --</option>
                              {staff.map(s => (
                                <option key={s.id} value={s.id}>{s.full_name}</option>
                              ))}
                            </select>
                         ) : (
                           <div className={`mt-2 text-xs font-bold px-3 py-1 rounded-full ${assignedStaff ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                             {assignedStaff ? assignedStaff.full_name : 'Available'}
                           </div>
                         )}
                       </div>
                     </motion.div>
                   );
                })}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
