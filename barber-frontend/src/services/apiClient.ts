const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

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

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY)
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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

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
    const data = await requestJson<{ user: AuthUser }>('/api/auth/me');
    return data.user;
  },
  getSalonBySlug: async (slug: string) => {
    const data = await requestJson<{ salon: any }>(`/api/salons/slug/${slug}`);
    return data.salon;
  },
  getSalonById: async (id: string) => {
    const data = await requestJson<{ salon: any }>(`/api/salons/${id}`);
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
    const data = await requestJson<{ stats: any }>('/api/admin/overview');
    return data.stats;
  },
  fetchAdminSalons: async () => {
    const data = await requestJson<{ salons: any[] }>('/api/admin/salons');
    return data.salons;
  },
  createAdminSalon: async (payload: { name: string; slug: string; ownerEmail: string; ownerPassword: string; ownerName: string }) => {
    const data = await requestJson<{ salon: any }>('/api/admin/salons', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data.salon;
  },
  updateAdminSalon: async (id: string, updates: { name?: string; slug?: string; status?: 'active' | 'suspended' | 'cancelled' }) => {
    const data = await requestJson<{ salon: any }>(`/api/admin/salons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    return data.salon;
  },
  deleteAdminSalon: async (id: string) => {
    return requestJson<{ deleted: boolean }>(`/api/admin/salons/${id}`, {
      method: 'DELETE'
    });
  },
  resetAdminOwnerPassword: async (salonId: string, newPassword: string) => {
    const data = await requestJson<{ updated: boolean; ownerEmail: string }>(`/api/admin/salons/${salonId}/reset-owner-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
    return data;
  }
};
