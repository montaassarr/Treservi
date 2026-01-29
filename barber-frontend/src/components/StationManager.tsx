import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Armchair, Sparkles, HeartPulse, Plus, X, Trash2, User as UserIcon, Move, Sofa, DoorOpen, Bath } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useLanguage } from '../context/LanguageContext';

interface Station {
  id: string;
  salon_id: string;
  name: string;
  type: 'chair' | 'desk' | 'table' | 'sofa';
  current_staff_id?: string;
  position_x: number;
  position_y: number;
  width?: number;
  is_active: boolean;
}

interface Staff {
  id: string;
  full_name: string;
}

interface StationManagerProps {
  salonId: string;
  userRole?: 'owner' | 'staff' | 'client';
  onStationSelect?: (staffId: string) => void;
  selectedStaffId?: string | null;
  displayMode?: 'modal' | 'embedded';
}

const STATION_TYPES = [
  { type: 'chair', icon: Armchair, label: 'Barber Chair', color: 'bg-blue-100 text-blue-600' },
  { type: 'desk', icon: Sparkles, label: 'Nail Desk', color: 'bg-purple-100 text-purple-600' },
  { type: 'table', icon: HeartPulse, label: 'Massage Table', color: 'bg-green-100 text-green-600' },
  { type: 'sofa', icon: Sofa, label: 'Waiting Bench', color: 'bg-orange-100 text-orange-600' },
] as const;

export const StationManager: React.FC<StationManagerProps> = ({ 
  salonId, 
  userRole = 'owner',
  onStationSelect,
  selectedStaffId,
  displayMode = 'modal'
}) => {
  const { t } = useLanguage();
  const [stations, setStations] = useState<Station[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Resizing State
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number, width: number } | null>(null);

  useEffect(() => {
    if (displayMode === 'embedded') setIsOpen(true);
  }, [displayMode]);

  useEffect(() => {
    fetchData();
    // Subscribe to realtime changes
    const channel = supabase
      .channel('stations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stations', filter: `salon_id=eq.${salonId}` }, 
        (payload) => {
            // If we are currently resizing/dragging, ignore updates to avoid jitter
            if (!resizingId) fetchData();
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [salonId, resizingId]); // Add resizingId dependency

  // Global Resize Handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingId || !resizeStart) return;
      
      const deltaX = e.clientX - resizeStart.x;
      const newWidth = Math.max(100, resizeStart.width + deltaX); // Min width 100px

      setStations(prev => prev.map(s => 
        s.id === resizingId ? { ...s, width: newWidth } : s
      ));
    };

    const handleMouseUp = async () => {
      if (!resizingId) return;
      
      const station = stations.find(s => s.id === resizingId);
      if (station) {
        await supabase.from('stations').update({ width: station.width }).eq('id', station.id);
      }
      
      setResizingId(null);
      setResizeStart(null);
    };

    if (resizingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingId, resizeStart, stations]);

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

  const handleAddStation = async (type: 'chair' | 'desk' | 'table' | 'sofa') => {
    if (userRole !== 'owner') return;
    const count = stations.filter(s => s.type === type).length;
    await supabase.from('stations').insert({
      salon_id: salonId,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${count + 1}`,
      type,
      position_x: 100 + (stations.length * 20), // Start a bit further in
      position_y: 100,
      width: type === 'sofa' ? 192 : null // Default width for sofa
    });
    fetchData();
  };

  const handleAssignStaff = async (stationId: string, staffId: string | null) => {
    if (userRole !== 'owner') return;
    await supabase.from('stations').update({ current_staff_id: staffId || null }).eq('id', stationId);
    fetchData();
  };

  // Card View (Dashboard Widget)
  const renderCard = () => {
    if (displayMode === 'embedded') return null;
    return (
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
  };

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
            className={displayMode === 'embedded' ? "relative w-full h-[600px] z-0" : "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"}
          >
            <motion.div 
              layoutId="station-card"
              className={displayMode === 'embedded' ? "bg-white dark:bg-treservi-card-dark w-full h-full rounded-[24px] overflow-hidden flex flex-col border dark:border-gray-800" : "bg-white dark:bg-treservi-card-dark w-full max-w-5xl h-[80vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col"}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/80 dark:bg-black/20 backdrop-blur-md sticky top-0 z-20">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{t('stations.stationManager') || 'Station Manager'}</h2>
                  <p className="text-gray-500">
                    {userRole === 'owner' ? 'Drag to arrange. Click to assign staff.' : (userRole === 'client' ? '👆 Click on a green station to select your barber' : 'View current salon status.')}
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
                   {displayMode !== 'embedded' && (
                   <button 
                     onClick={() => setIsOpen(false)}
                     className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 transition-colors"
                   >
                     <X size={24} />
                   </button>
                   )}
                </div>
              </div>

              {/* Canvas - The Room */}
              <div className="flex-1 bg-neutral-100 dark:bg-[#0F0F0F] relative overflow-hidden flex items-center justify-center p-4 md:p-8">
                
                {/* Mobile Scale Wrapper */}
                <div className="w-full h-full flex items-center justify-center overflow-auto md:overflow-hidden touch-pan-x touch-pan-y">
                    {/* The Floor Plan Container */}
                    <div className="relative w-[800px] h-[600px] flex-shrink-0 bg-white dark:bg-[#1E1E1E] rounded-[24px] md:rounded-[40px] shadow-2xl border-[4px] md:border-[8px] border-gray-200 dark:border-gray-800 overflow-hidden group/room transform-gpu origin-center transition-transform scale-[0.6] sm:scale-75 md:scale-90">
                   
                   {/* Floor Texture (Subtle Grid) */}
                   <div className="absolute inset-0 opacity-20 pointer-events-none" 
                        style={{ backgroundImage: 'radial-gradient(circle, #888 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
                   />

                   {/* --- Architectural Elements --- */}

                   {/* 1. Mirror Wall (Top Center) */}
                   <motion.div 
                     initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                     className="absolute top-0 left-[15%] right-[15%] h-24 bg-gradient-to-b from-blue-50/50 to-white/5 backdrop-blur-sm border-b border-l border-r border-blue-200/30 dark:border-blue-900/30 rounded-b-[32px] flex flex-col items-center pt-2 z-0 shadow-lg pointer-events-none"
                   >
                     <div className="w-[90%] h-1 bg-blue-400/30 shadow-[0_0_15px_rgba(59,130,246,0.4)] mb-1 rounded-full" />
                     <span className="text-[10px] font-bold text-blue-400/50 tracking-[0.2em] uppercase mt-1">Mirror Zone</span>
                   </motion.div>

                   {/* 2. Entrance (Left Wall) */}
                   <div className="absolute bottom-32 -left-[4px] w-8 h-32 bg-gray-100 dark:bg-gray-800 flex flex-col justify-center items-center rounded-r-2xl border border-gray-200 dark:border-gray-700 shadow-inner gap-2 z-0 pointer-events-none">
                      <div className="w-1 h-12 bg-gray-300 dark:bg-gray-600 rounded-full" />
                      <DoorOpen size={20} className="text-gray-400 dark:text-gray-600" />
                   </div>

                   {/* 3. Restroom (Bottom Right Corner) */}
                   <div className="absolute bottom-0 right-0 w-48 h-48 pointer-events-none">
                      <div className="absolute bottom-0 right-0 w-full h-full bg-gray-50/80 dark:bg-gray-800/50 rounded-tl-[60px] border-t border-l border-gray-200 dark:border-gray-700 flex items-center justify-center p-8 backdrop-blur-sm">
                         <div className="flex flex-col items-center text-gray-400/70 pt-8 pl-8">
                           <Bath size={28} className="mb-2" />
                           <span className="text-[10px] font-bold uppercase tracking-widest">W.C.</span>
                         </div>
                      </div>
                   </div>

                   {/* 4. Waiting Area (Left Side) */}
                   <div className="absolute top-1/3 left-12 w-48 h-64 border-2 border-dashed border-gray-200 dark:border-gray-700/50 rounded-[32px] flex items-center justify-center pointer-events-none user-select-none">
                      <span className="text-gray-300 dark:text-gray-700 font-bold uppercase -rotate-90 tracking-widest text-sm">Waiting Area</span>
                   </div>


                   {/* --- Draggable Items --- */}
                   {stations.map(station => {
                     const typeInfo = STATION_TYPES.find(t => t.type === station.type);
                     const assignedStaff = staff.find(s => s.id === station.current_staff_id);
                     const Icon = typeInfo?.icon || Armchair;
                     const isSofa = station.type === 'sofa';
                     // Calculate sizing
                     const width = station.width || (isSofa ? 192 : 96); // Default 192px (w-48) or 96px (w-24)
                     const height = isSofa ? 80 : 96; // 80px (h-20) or 96px (h-24)
                     
                     // Interactive Check
                     const isInteractive = userRole === 'client' && !isSofa;

                     return (
                       <motion.div
                         key={station.id}
                         onClick={(e) => {
                             e.stopPropagation(); // Prevent bubbling
                             if (!isInteractive) return;
                             
                             if (assignedStaff && onStationSelect) {
                                 onStationSelect(assignedStaff.id);
                             } else {
                                 // Feedback for empty station
                                 const el = e.currentTarget;
                                 el.classList.add('animate-shake');
                                 setTimeout(() => el.classList.remove('animate-shake'), 500);
                                 // Optional: You could use a toast here
                                 console.log('Station is empty');
                             }
                         }}
                         drag={userRole === 'owner' && !resizingId} // Disable drag when resizing
                         dragConstraints={{ left: 0, right: 800, top: 0, bottom: 600 }}
                         dragMomentum={false}
                         initial={{ x: station.position_x, y: station.position_y }}
                         animate={{ 
                             x: station.position_x, 
                             y: station.position_y,
                             width: width,
                             height: height
                         }}
                         onDragEnd={(_, info) => {
                           // Simple delta update
                           const newX = station.position_x + info.offset.x;
                           const newY = station.position_y + info.offset.y;
                           handleUpdatePosition(station.id, newX, newY);
                         }}
                         whileHover={{ 
                           zIndex: 50,
                           scale: isInteractive && assignedStaff ? 1.08 : 1
                         }}
                         whileTap={{
                           scale: isInteractive && assignedStaff ? 0.95 : 1
                         }}
                         whileDrag={{ scale: 1.02, zIndex: 60, cursor: 'grabbing' }}
                         className={`
                           absolute flex flex-col items-center justify-center group z-10
                           ${isInteractive ? (assignedStaff ? 'cursor-pointer' : 'cursor-not-allowed') : ''}
                         `}
                         style={{ width, height }}
                       >
                         {/* The 3D Object Shape */}
                         <div className={`
                            relative w-full h-full rounded-2xl border-b-4 transition-all duration-200
                            ${assignedStaff 
                                ? userRole === 'client'
                                  ? (assignedStaff.id === selectedStaffId 
                                      ? 'bg-gradient-to-br from-green-500 to-green-600 text-white border-green-700 shadow-xl scale-105 ring-4 ring-green-200' 
                                      : 'bg-white hover:bg-green-50 border-gray-200 hover:border-green-300 shadow-sm')
                                  : 'bg-white dark:bg-gray-800 border-red-100 dark:border-red-900/30 shadow-[0_8px_16px_rgba(239,68,68,0.15)]'
                                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-[0_8px_16px_rgba(0,0,0,0.05)] hover:shadow-lg opacity-80'
                            }
                         `}>
                             {/* Resize Handle (Available for all draggable items) */}
                             {userRole === 'owner' && (
                               <div
                                 className="absolute bottom-1 -right-3 w-6 h-12 flex items-center justify-center cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity z-50"
                                 onMouseDown={(e) => {
                                   e.stopPropagation(); // Prevent drag start
                                   setResizingId(station.id);
                                   setResizeStart({ x: e.clientX, width });
                                 }}
                               >
                                 <div className="w-1.5 h-6 bg-gray-300 dark:bg-gray-600 rounded-full hover:bg-blue-500 transition-colors shadow-sm" />
                               </div>
                             )}

                             {/* Delete Button */}
                             {userRole === 'owner' && (
                               <button 
                                 onClick={(e) => { e.stopPropagation(); handleDeleteStation(station.id); }}
                                 className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-red-600 shadow-sm scale-75"
                               >
                                 <Trash2 size={14} />
                               </button>
                             )}

                             {/* Icon & Label Container */}
                             <div className="flex flex-col items-center justify-center h-full pb-1">
                                <div className={`p-2 rounded-xl mb-1 ${typeInfo?.color} bg-opacity-10`}>
                                  <Icon size={isSofa ? 24 : 18} className="stroke-[2px]" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate w-[90%] text-center">
                                  {station.name}
                                </span>
                             </div>

                             {/* Floating Staff Avatar Bubble (Small indicator) */}
                             {assignedStaff && !isSofa && (
                               <motion.div 
                                 initial={{ scale: 0 }} 
                                 animate={{ scale: 1 }}
                                 className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-white dark:bg-gray-800 p-0.5 shadow-md z-30 ring-2 ring-red-100 dark:ring-red-900/30"
                               >
                                 <div className="w-full h-full rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-[10px] text-white font-bold">
                                    {assignedStaff.full_name.charAt(0)}
                                 </div>
                               </motion.div>
                             )}

                             {/* Hidden Select for Assignment (Not for Sofas) */}
                             {userRole === 'owner' && !assignedStaff && !isSofa && (
                                <select 
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                  value={station.current_staff_id || ''}
                                  onChange={(e) => handleAssignStaff(station.id, e.target.value || null)}
                                >
                                  <option value="">Assign</option>
                                  {staff.map(s => (
                                    <option key={s.id} value={s.id}>{s.full_name}</option>
                                  ))}
                                </select>
                             )}
                         </div>

                         {/* Staff Name Label (Underneath) */}
                         {assignedStaff && !isSofa && (
                             <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-[10px] font-bold px-3 py-1 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 whitespace-nowrap z-40 text-gray-700 dark:text-gray-200">
                                 {assignedStaff.full_name}
                             </div>
                         )}
                       </motion.div>
                     );
                  })}
                   {/* End of content */}
                   </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
