import { SUPERADMIN_API_BASE } from '../config/securityRoutes';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const ME_CACHE_TTL_MS = 30_000;
const SALON_CACHE_TTL_MS = 60_000;

export interface AuthUser {
  id: string;
  email: string;
  role: 'owner' | 'staff' | 'super_admin';
  salonId?: string;
  isSuperAdmin?: boolean;
  fullName?: string;
  salonSlug?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

const TOKEN_KEY = 'reservi_auth_token';

let meCache: { token: string; user: AuthUser; expiresAt: number } | null = null;
let meInFlight: Promise<AuthUser> | null = null;

const salonBySlugCache = new Map<string, { salon: any; expiresAt: number }>();
const salonByIdCache = new Map<string, { salon: any; expiresAt: number }>();
const salonBySlugInFlight = new Map<string, Promise<any>>();
const salonByIdInFlight = new Map<string, Promise<any>>();

const clearMeCache = () => {
  meCache = null;
  meInFlight = null;
};

const getCachedSalon = (cache: Map<string, { salon: any; expiresAt: number }>, key: string) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.salon;
};

const setCachedSalon = (cache: Map<string, { salon: any; expiresAt: number }>, key: string, salon: any) => {
  cache.set(key, {
    salon,
    expiresAt: Date.now() + SALON_CACHE_TTL_MS
  });
};

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    clearMeCache();
  },
  clearToken: () => {
    localStorage.removeItem(TOKEN_KEY);
    clearMeCache();
  }
};

const requestJson = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = authStorage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers ? (options.headers as Record<string, string>) : {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Cannot reach API at ${API_BASE_URL}. Ensure backend is running.`);
    }
    throw error;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = data?.error || 'Request failed';
    throw new Error(errorMessage);
  }

  return data as T;
};

export const apiClient = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const data = await requestJson<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    authStorage.setToken(data.token);
    return data;
  },
  register: async (email: string, password: string, salonId?: string) => {
    return requestJson<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, salonId })
    });
  },
  getMe: async () => {
    const token = authStorage.getToken() ?? '';
    if (meCache && meCache.token === token && Date.now() < meCache.expiresAt) {
      return meCache.user;
    }

    if (meInFlight) {
      return meInFlight;
    }

    meInFlight = requestJson<{ user: AuthUser }>('/api/auth/me')
      .then((data) => {
        meCache = {
          token,
          user: data.user,
          expiresAt: Date.now() + ME_CACHE_TTL_MS
        };
        return data.user;
      })
      .finally(() => {
        meInFlight = null;
      });

    return meInFlight;
  },
  getSalonBySlug: async (slug: string) => {
    const cached = getCachedSalon(salonBySlugCache, slug);
    if (cached) {
      return cached;
    }

    const inFlight = salonBySlugInFlight.get(slug);
    if (inFlight) {
      return inFlight;
    }

    const request = requestJson<{ salon: any }>(`/api/salons/slug/${slug}`)
      .then((data) => {
        setCachedSalon(salonBySlugCache, slug, data.salon);
        if (data.salon?.id) {
          setCachedSalon(salonByIdCache, data.salon.id, data.salon);
        }
        return data.salon;
      })
      .finally(() => {
        salonBySlugInFlight.delete(slug);
      });

    salonBySlugInFlight.set(slug, request);
    return request;
  },
  getSalonById: async (id: string) => {
    const cached = getCachedSalon(salonByIdCache, id);
    if (cached) {
      return cached;
    }

    const inFlight = salonByIdInFlight.get(id);
    if (inFlight) {
      return inFlight;
    }

    const request = requestJson<{ salon: any }>(`/api/salons/${id}`)
      .then((data) => {
        setCachedSalon(salonByIdCache, id, data.salon);
        if (data.salon?.slug) {
          setCachedSalon(salonBySlugCache, data.salon.slug, data.salon);
        }
        return data.salon;
      })
      .finally(() => {
        salonByIdInFlight.delete(id);
      });

    salonByIdInFlight.set(id, request);
    return request;
  },
  updateSalonById: async (id: string, updates: {
    name?: string;
    address?: string;
    city?: string;
    country?: string;
    contact_phone?: string;
    contact_email?: string;
    logo_url?: string;
    opening_time?: string;
    closing_time?: string;
    open_days?: string[];
    latitude?: number | null;
    longitude?: number | null;
  }) => {
    const data = await requestJson<{ salon: any }>(`/api/salons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });

    salonByIdCache.delete(id);
    if (data.salon?.slug) {
      salonBySlugCache.delete(data.salon.slug);
    }

    return data.salon;
  },
  savePushSubscription: async (payload: {
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
  }) => {
    const data = await requestJson<{ subscription: any }>('/api/push-subscriptions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data.subscription;
  },
  testPushNotification: async (payload: {
    title?: string;
    message?: string;
    url?: string;
  }) => {
    const data = await requestJson<{ ok: boolean; diagnostics: any; result: any }>('/api/push-subscriptions/test', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data;
  },
  fetchServices: async (salonId: string) => {
    const data = await requestJson<{ services: any[] }>(`/api/services?salonId=${salonId}`);
    return data.services;
  },
  fetchServiceById: async (id: string) => {
    const data = await requestJson<{ service: any }>(`/api/services/${id}`);
    return data.service;
  },
  createService: async (payload: { salonId: string; name: string; price: number; duration: number; description?: string }) => {
    const data = await requestJson<{ service: any }>('/api/services', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data.service;
  },
  updateService: async (id: string, updates: Record<string, any>) => {
    const data = await requestJson<{ service: any }>(`/api/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    return data.service;
  },
  deleteService: async (id: string) => {
    const data = await requestJson<{ service: any }>(`/api/services/${id}`, {
      method: 'DELETE'
    });
    return data.service;
  },
  hardDeleteService: async (id: string) => {
    return requestJson<{ deleted: boolean }>(`/api/services/${id}/hard`, {
      method: 'DELETE'
    });
  },
  fetchStaff: async (salonId: string) => {
    const data = await requestJson<{ staff: any[] }>(`/api/staff?salonId=${salonId}`);
    return data.staff;
  },
  fetchPublicStaff: async (salonId: string) => {
    const data = await requestJson<{ staff: any[] }>(`/api/staff/public?salonId=${salonId}`);
    return data.staff;
  },
  createStaff: async (payload: { email: string; password: string; fullName?: string; salonId?: string; phone?: string; specialty?: string; avatarUrl?: string }) => {
    const data = await requestJson<{ staff: any }>('/api/staff', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data.staff;
  },
  updateStaff: async (id: string, updates: Record<string, any>) => {
    const data = await requestJson<{ staff: any }>(`/api/staff/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    return data.staff;
  },
  deleteStaff: async (id: string) => {
    return requestJson<{ deleted: boolean }>(`/api/staff/${id}`, {
      method: 'DELETE'
    });
  },
  fetchAppointments: async (params: { salonId?: string; staffId?: string }) => {
    const query = new URLSearchParams();
    if (params.salonId) query.set('salonId', params.salonId);
    if (params.staffId) query.set('staffId', params.staffId);
    const data = await requestJson<{ appointments: any[] }>(`/api/appointments?${query.toString()}`);
    return data.appointments;
  },
  fetchAppointmentById: async (id: string) => {
    const data = await requestJson<{ appointment: any }>(`/api/appointments/${id}`);
    return data.appointment;
  },
  createAppointment: async (payload: Record<string, any>) => {
    const data = await requestJson<{ appointment: any }>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data.appointment;
  },
  createPublicAppointment: async (payload: Record<string, any>) => {
    const data = await requestJson<{ appointment: any }>('/api/appointments/public', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data.appointment;
  },
  fetchPublicAvailability: async (params: { salonId: string; staffId: string; date: string }) => {
    const query = new URLSearchParams();
    query.set('salonId', params.salonId);
    query.set('staffId', params.staffId);
    query.set('date', params.date);
    const data = await requestJson<{ date: string; bookedTimes: string[]; count: number; serverNow: { dateKey: string; nowMinutes: number } }>(
      `/api/appointments/public-availability?${query.toString()}`
    );
    return data;
  },
  checkPublicDuplicateBooking: async (payload: {
    salon_id: string;
    staff_id: string;
    customer_phone: string;
    appointment_date: string;
    appointment_time: string;
  }) => {
    const data = await requestJson<{ isDuplicate: boolean }>('/api/appointments/public-duplicate-check', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data;
  },
  checkPublicSpamBooking: async (payload: {
    salon_id: string;
    customer_phone: string;
    window_minutes?: number;
    max_bookings?: number;
  }) => {
    const data = await requestJson<{ isSpam: boolean; recentCount: number; windowMinutes: number; maxBookings: number }>(
      '/api/appointments/public-spam-check',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );
    return data;
  },
  lookupPublicManagedBooking: async (payload: {
    salon_id: string;
    booking_code: string;
    customer_phone: string;
  }) => {
    const data = await requestJson<{ appointment: any }>('/api/appointments/public-manage/lookup', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data.appointment;
  },
  cancelPublicManagedBooking: async (payload: {
    salon_id: string;
    booking_code: string;
    customer_phone: string;
  }) => {
    const data = await requestJson<{ deleted: boolean; message?: string }>('/api/appointments/public-manage/cancel', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data;
  },
  reschedulePublicManagedBooking: async (payload: {
    salon_id: string;
    booking_code: string;
    customer_phone: string;
    appointment_date: string;
    appointment_time: string;
  }) => {
    const data = await requestJson<{ appointment: any }>('/api/appointments/public-manage/reschedule', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data.appointment;
  },
  updateAppointment: async (id: string, updates: Record<string, any>) => {
    const data = await requestJson<{ appointment: any }>(`/api/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    return data.appointment;
  },
  deleteAppointment: async (id: string) => {
    return requestJson<{ deleted: boolean }>(`/api/appointments/${id}`, {
      method: 'DELETE'
    });
  },
  getStaffAppointmentStats: async (staffId: string) => {
    const data = await requestJson<{ stats: any }>(`/api/appointments/stats/staff/${staffId}`);
    return data.stats;
  },
  getUnreadCount: async (salonId: string, role: 'owner' | 'staff', staffId?: string) => {
    const query = new URLSearchParams({ salonId, role });
    if (staffId) query.set('staffId', staffId);
    const data = await requestJson<{ count: number }>(`/api/notifications/unread-count?${query.toString()}`);
    return data.count;
  },
  markAllRead: async (payload: { salonId: string; role: 'owner' | 'staff'; staffId?: string }) => {
    return requestJson<{ updated: boolean }>('/api/notifications/mark-all-read', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  markRead: async (appointmentId: string) => {
    const data = await requestJson<{ appointment: any }>(`/api/notifications/mark-read/${appointmentId}`, {
      method: 'POST'
    });
    return data.appointment;
  },
  fetchAdminOverview: async () => {
    const data = await requestJson<{ stats: any }>(`${SUPERADMIN_API_BASE}/overview`);
    return data.stats;
  },
  fetchAdminSalons: async () => {
    const data = await requestJson<{ salons: any[] }>(`${SUPERADMIN_API_BASE}/salons`);
    return data.salons;
  },
  createAdminSalon: async (payload: { name: string; slug: string; ownerEmail: string; ownerPassword: string; ownerName: string }) => {
    const data = await requestJson<{ salon: any }>(`${SUPERADMIN_API_BASE}/salons`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data.salon;
  },
  updateAdminSalon: async (id: string, updates: { name?: string; slug?: string; status?: 'active' | 'suspended' | 'cancelled' }) => {
    const data = await requestJson<{ salon: any }>(`${SUPERADMIN_API_BASE}/salons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    return data.salon;
  },
  deleteAdminSalon: async (id: string) => {
    return requestJson<{ deleted: boolean }>(`${SUPERADMIN_API_BASE}/salons/${id}`, {
      method: 'DELETE'
    });
  },
  resetAdminOwnerPassword: async (salonId: string, newPassword: string) => {
    const data = await requestJson<{ updated: boolean; ownerEmail: string }>(`${SUPERADMIN_API_BASE}/salons/${salonId}/reset-owner-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
    return data;
  }
};
