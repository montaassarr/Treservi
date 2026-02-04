import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

interface Notification {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  staffName?: string;
  serviceName?: string;
  amount?: string;
  date?: string;
  time?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

interface UseNotificationManagerProps {
  salonId: string;
  userId: string;
  userRole: 'owner' | 'staff' | 'super_admin';
  enabled?: boolean;
}

export const useNotificationManager = ({
  salonId,
  userId,
  userRole,
  enabled = true,
}: UseNotificationManagerProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const seenAppointmentsRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (!enabled || isInitializedRef.current) return;

    try {
      const saved = localStorage.getItem('dashboard_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotifications(parsed);
          parsed.forEach((n: any) => {
            if (n.id) seenAppointmentsRef.current.add(n.id);
          });
          setNotificationCount(parsed.length);
        }
      }
    } catch (e) {
      console.log('[useNotificationManager] localStorage read failed');
    }

    isInitializedRef.current = true;
  }, [enabled]);

  // Persist notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dashboard_notifications', JSON.stringify(notifications));
    } catch (e) {
      console.log('[useNotificationManager] localStorage write failed');
    }
  }, [notifications]);

  // Setup real-time notifications
  useEffect(() => {
    if (!enabled || !supabase || !salonId || !userId || !isInitializedRef.current) return;

    const setupRealtimeNotifications = () => {
      try {
        const channel = supabase
          .channel(`notifications-${salonId}-${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'appointments',
              filter:
                userRole === 'owner'
                  ? `salon_id=eq.${salonId}`
                  : `staff_id=eq.${userId}`,
            },
            async (payload) => {
              const appointment = payload.new as any;
              const appointmentId = appointment?.id || `${Date.now()}`;

              // Skip if already seen
              if (seenAppointmentsRef.current.has(appointmentId)) return;
              seenAppointmentsRef.current.add(appointmentId);

              console.log('[useNotificationManager] New appointment detected:', appointmentId);

              // Fetch full appointment details
              try {
                const { data } = await supabase
                  .from('appointments')
                  .select(
                    `
                    *,
                    staff:staff_id(full_name),
                    service:service_id(name, price)
                  `
                  )
                  .eq('id', appointmentId)
                  .single();

                if (data) {
                  const staffName = (data.staff as any)?.full_name || 'Unassigned';
                  const serviceName = (data.service as any)?.name || 'Service';
                  const amount = (data.service as any)?.price
                    ? `${(data.service as any).price} DT`
                    : data.amount || 'N/A';

                  const title = `New appointment${
                    appointment.customer_name ? ` • ${appointment.customer_name}` : ''
                  }`;
                  const subtitle = `${serviceName} • ${staffName} • ${
                    appointment.appointment_date || ''
                  } ${appointment.appointment_time || ''}`.trim();

                  setNotifications((prev) => {
                    const updated = [
                      {
                        id: appointmentId,
                        title,
                        subtitle,
                        timestamp: new Date().toLocaleString(),
                        staffName,
                        serviceName,
                        amount,
                        date: appointment.appointment_date,
                        time: appointment.appointment_time,
                        customerName: appointment.customer_name,
                        customerPhone: appointment.customer_phone,
                        customerEmail: appointment.customer_email,
                      },
                      ...prev.filter((n) => n.id !== appointmentId),
                    ].slice(0, 10);

                    return updated;
                  });

                  setNotificationCount((prev) => prev + 1);

                  // Broadcast to service worker for desktop push notification
                  if ('serviceWorker' in navigator && navigator.serviceWorker?.controller) {
                    navigator.serviceWorker.controller.postMessage({
                      type: 'NEW_APPOINTMENT_NOTIFICATION',
                      data: {
                        title,
                        options: {
                          body: subtitle,
                          icon: '/icon-192.png',
                          badge: '/badge-72.png',
                          tag: 'appointment-notification',
                          requireInteraction: true,
                          data: { appointmentId }
                        }
                      }
                    });
                  }
                }
              } catch (err) {
                console.error('[useNotificationManager] Failed to fetch appointment:', err);
              }
            }
          )
          .subscribe((status) => {
            console.log('[useNotificationManager] Subscription status:', status);
            if (status === 'SUBSCRIBED') {
              channelRef.current = channel;
            } else if (status === 'CHANNEL_ERROR') {
              console.error('[useNotificationManager] Channel error, retrying...');
              setTimeout(() => setupRealtimeNotifications(), 3000);
            }
          });
      } catch (err) {
        console.error('[useNotificationManager] Setup failed:', err);
      }
    };

    setupRealtimeNotifications();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [salonId, userId, userRole, enabled]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setNotificationCount(0);
    seenAppointmentsRef.current.clear();
    try {
      localStorage.removeItem('dashboard_notifications');
    } catch (e) {
      // Silently fail
    }
  }, []);

  // Mark as read
  const markAsRead = useCallback(() => {
    setNotificationCount(0);
  }, []);

  return {
    notifications,
    notificationCount,
    clearNotifications,
    markAsRead,
    setNotifications,
    setNotificationCount,
  };
};
