/* eslint-disable no-console */
const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@barbershop.com';
const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe123!';

const headersJson = { 'Content-Type': 'application/json' };

const request = async (path, options = {}, token) => {
  const headers = { ...headersJson, ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }
  return data;
};

const step = async (name, fn) => {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
    throw error;
  }
};

const unique = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const main = async () => {
  const ctx = {
    superAdminToken: '',
    ownerToken: '',
    staffToken: '',
    ownerEmail: '',
    ownerPassword: '',
    staffEmail: '',
    staffPassword: '',
    salonId: '',
    salonSlug: '',
    serviceId: '',
    extraServiceId: '',
    staffId: '',
    appointmentId: ''
  };

  await step('Health check', async () => {
    const response = await fetch(`${baseUrl}/health`);
    const data = await response.json();
    if (response.status !== 200 || data.status !== 'ok') {
      throw new Error('Health check failed');
    }
  });

  await step('Super admin login', async () => {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: superAdminEmail, password: superAdminPassword })
    });
    if (!data.token) throw new Error('Missing token');
    ctx.superAdminToken = data.token;
  });

  await step('Admin overview', async () => {
    const data = await request('/api/admin/overview', {}, ctx.superAdminToken);
    if (!data.stats) throw new Error('Missing stats');
  });

  await step('Admin salons list', async () => {
    const data = await request('/api/admin/salons', {}, ctx.superAdminToken);
    if (!Array.isArray(data.salons)) throw new Error('Missing salons array');
  });

  await step('Admin create salon', async () => {
    const salonSlug = unique('test-salon');
    const ownerEmail = `${unique('owner')}@example.com`;
    const ownerPassword = 'OwnerPass123!';
    const ownerName = 'Test Owner';

    const data = await request(
      '/api/admin/salons',
      {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Salon',
          slug: salonSlug,
          ownerEmail,
          ownerPassword,
          ownerName
        })
      },
      ctx.superAdminToken
    );

    ctx.salonId = data.salon?.id || data.salon?._id;
    ctx.salonSlug = salonSlug;
    ctx.ownerEmail = ownerEmail;
    ctx.ownerPassword = ownerPassword;
    if (!ctx.salonId) throw new Error('Missing salon id');
  });

  await step('Admin update salon', async () => {
    const data = await request(
      `/api/admin/salons/${ctx.salonId}`,
      { method: 'PATCH', body: JSON.stringify({ name: 'Test Salon Updated' }) },
      ctx.superAdminToken
    );
    if (!data.salon) throw new Error('Missing salon');
  });

  await step('Admin update salon status', async () => {
    const data = await request(
      `/api/admin/salons/${ctx.salonId}/status`,
      { method: 'PATCH', body: JSON.stringify({ status: 'active' }) },
      ctx.superAdminToken
    );
    if (!data.salon) throw new Error('Missing salon');
  });

  await step('Admin reset owner password', async () => {
    const newPassword = 'OwnerPass456!';
    const data = await request(
      `/api/admin/salons/${ctx.salonId}/reset-owner-password`,
      { method: 'POST', body: JSON.stringify({ newPassword }) },
      ctx.superAdminToken
    );
    if (!data.updated) throw new Error('Password reset failed');
    ctx.ownerPassword = newPassword;
  });

  await step('Register extra owner', async () => {
    const data = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: `${unique('owner')}@example.com`,
        password: 'OwnerPass999!',
        salonId: ctx.salonId
      })
    });
    if (!data.token) throw new Error('Missing token');
  });

  await step('Owner login', async () => {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: ctx.ownerEmail, password: ctx.ownerPassword })
    });
    if (!data.token) throw new Error('Missing token');
    ctx.ownerToken = data.token;
  });

  await step('Auth me', async () => {
    const data = await request('/api/auth/me', {}, ctx.ownerToken);
    if (!data.user) throw new Error('Missing user');
  });

  await step('Get salon by slug', async () => {
    const data = await request(`/api/salons/slug/${ctx.salonSlug}`);
    if (!data.salon) throw new Error('Missing salon');
  });

  await step('Get salon by id', async () => {
    const data = await request(`/api/salons/${ctx.salonId}`);
    if (!data.salon) throw new Error('Missing salon');
  });

  await step('Create service', async () => {
    const data = await request(
      '/api/services',
      {
        method: 'POST',
        body: JSON.stringify({ salonId: ctx.salonId, name: 'Cut', price: 20, duration: 30 })
      },
      ctx.ownerToken
    );
    ctx.serviceId = data.service?.id || data.service?._id;
    if (!ctx.serviceId) throw new Error('Missing service id');
  });

  await step('List services', async () => {
    const data = await request(`/api/services?salonId=${ctx.salonId}`);
    if (!Array.isArray(data.services)) throw new Error('Missing services array');
  });

  await step('Get service by id', async () => {
    const data = await request(`/api/services/${ctx.serviceId}`);
    if (!data.service) throw new Error('Missing service');
  });

  await step('Update service', async () => {
    const data = await request(
      `/api/services/${ctx.serviceId}`,
      { method: 'PATCH', body: JSON.stringify({ price: 25 }) },
      ctx.ownerToken
    );
    if (!data.service) throw new Error('Missing service');
  });

  await step('Create staff', async () => {
    const staffEmail = `${unique('staff')}@example.com`;
    const data = await request(
      '/api/staff',
      {
        method: 'POST',
        body: JSON.stringify({
          email: staffEmail,
          password: 'StaffPass123!',
          fullName: 'Test Staff',
          salonId: ctx.salonId,
          phone: '+1000000000',
          specialty: 'Cuts'
        })
      },
      ctx.ownerToken
    );
    ctx.staffId = data.staff?.id || data.staff?._id;
    ctx.staffEmail = staffEmail;
    ctx.staffPassword = 'StaffPass123!';
    if (!ctx.staffId) throw new Error('Missing staff id');
  });

  await step('List staff', async () => {
    const data = await request(`/api/staff?salonId=${ctx.salonId}`, {}, ctx.ownerToken);
    if (!Array.isArray(data.staff)) throw new Error('Missing staff array');
  });

  await step('Get staff by id', async () => {
    const data = await request(`/api/staff/${ctx.staffId}`, {}, ctx.ownerToken);
    if (!data.staff) throw new Error('Missing staff');
  });

  await step('Update staff', async () => {
    const data = await request(
      `/api/staff/${ctx.staffId}`,
      { method: 'PATCH', body: JSON.stringify({ phone: '+12223334444' }) },
      ctx.ownerToken
    );
    if (!data.staff) throw new Error('Missing staff');
  });

  await step('Staff login', async () => {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: ctx.staffEmail, password: ctx.staffPassword })
    });
    if (!data.token) throw new Error('Missing token');
    ctx.staffToken = data.token;
  });

  await step('Create appointment', async () => {
    const today = new Date().toISOString().split('T')[0];
    const data = await request(
      '/api/appointments',
      {
        method: 'POST',
        body: JSON.stringify({
          salon_id: ctx.salonId,
          staff_id: ctx.staffId,
          service_id: ctx.serviceId,
          customer_name: 'Test Customer',
          customer_email: 'customer@example.com',
          customer_phone: '+1999999999',
          appointment_date: today,
          appointment_time: '10:00',
          status: 'Pending',
          amount: 30
        })
      },
      ctx.ownerToken
    );
    ctx.appointmentId = data.appointment?.id || data.appointment?._id;
    if (!ctx.appointmentId) throw new Error('Missing appointment id');
  });

  await step('List appointments', async () => {
    const data = await request(`/api/appointments?salonId=${ctx.salonId}`, {}, ctx.ownerToken);
    if (!Array.isArray(data.appointments)) throw new Error('Missing appointments array');
  });

  await step('List appointments by staff', async () => {
    const data = await request(`/api/appointments?staffId=${ctx.staffId}`, {}, ctx.ownerToken);
    if (!Array.isArray(data.appointments)) throw new Error('Missing appointments array');
  });

  await step('Get appointment by id', async () => {
    const data = await request(`/api/appointments/${ctx.appointmentId}`, {}, ctx.ownerToken);
    if (!data.appointment) throw new Error('Missing appointment');
  });

  await step('Update appointment', async () => {
    const data = await request(
      `/api/appointments/${ctx.appointmentId}`,
      { method: 'PATCH', body: JSON.stringify({ status: 'Completed', amount: 35 }) },
      ctx.ownerToken
    );
    if (!data.appointment) throw new Error('Missing appointment');
  });

  await step('Staff appointment stats', async () => {
    const data = await request(`/api/appointments/stats/staff/${ctx.staffId}`, {}, ctx.ownerToken);
    if (!data.stats) throw new Error('Missing stats');
  });

  await step('Unread notifications count (owner)', async () => {
    const data = await request(`/api/notifications/unread-count?salonId=${ctx.salonId}&role=owner`, {}, ctx.ownerToken);
    if (typeof data.count !== 'number') throw new Error('Missing count');
  });

  await step('Unread notifications count (staff)', async () => {
    const data = await request(
      `/api/notifications/unread-count?salonId=${ctx.salonId}&role=staff&staffId=${ctx.staffId}`,
      {},
      ctx.staffToken
    );
    if (typeof data.count !== 'number') throw new Error('Missing count');
  });

  await step('Mark appointment read', async () => {
    const data = await request(`/api/notifications/mark-read/${ctx.appointmentId}`, { method: 'POST' }, ctx.ownerToken);
    if (!data.appointment) throw new Error('Missing appointment');
  });

  await step('Mark all read', async () => {
    const data = await request(
      '/api/notifications/mark-all-read',
      { method: 'POST', body: JSON.stringify({ salonId: ctx.salonId, role: 'owner' }) },
      ctx.ownerToken
    );
    if (!data.updated) throw new Error('Missing updated');
  });

  await step('Mark all read (staff)', async () => {
    const data = await request(
      '/api/notifications/mark-all-read',
      { method: 'POST', body: JSON.stringify({ salonId: ctx.salonId, role: 'staff', staffId: ctx.staffId }) },
      ctx.staffToken
    );
    if (!data.updated) throw new Error('Missing updated');
  });

  await step('Save push subscription', async () => {
    const data = await request(
      '/api/push-subscriptions',
      {
        method: 'POST',
        body: JSON.stringify({
          endpoint: `https://example.com/push/${unique('endpoint')}`,
          p256dh: 'test-p256dh',
          auth: 'test-auth',
          userAgent: 'api-test-script'
        })
      },
      ctx.ownerToken
    );
    if (!data.subscription) throw new Error('Missing subscription');
  });

  await step('Delete appointment', async () => {
    const data = await request(`/api/appointments/${ctx.appointmentId}`, { method: 'DELETE' }, ctx.ownerToken);
    if (!data.deleted) throw new Error('Missing deleted');
  });

  await step('Soft delete service', async () => {
    const data = await request(`/api/services/${ctx.serviceId}`, { method: 'DELETE' }, ctx.ownerToken);
    if (!data.service) throw new Error('Missing service');
  });

  await step('Hard delete service', async () => {
    const data = await request(
      '/api/services',
      {
        method: 'POST',
        body: JSON.stringify({ salonId: ctx.salonId, name: 'Beard', price: 15, duration: 15 })
      },
      ctx.ownerToken
    );
    ctx.extraServiceId = data.service?.id || data.service?._id;
    const deleted = await request(`/api/services/${ctx.extraServiceId}/hard`, { method: 'DELETE' }, ctx.ownerToken);
    if (!deleted.deleted) throw new Error('Hard delete failed');
  });

  await step('Delete staff', async () => {
    const data = await request(`/api/staff/${ctx.staffId}`, { method: 'DELETE' }, ctx.ownerToken);
    if (!data.deleted) throw new Error('Missing deleted');
  });

  await step('Admin delete salon', async () => {
    const data = await request(`/api/admin/salons/${ctx.salonId}`, { method: 'DELETE' }, ctx.superAdminToken);
    if (!data.deleted) throw new Error('Missing deleted');
  });
};

main()
  .then(() => {
    console.log('✅ All endpoint checks passed');
    process.exit(0);
  })
  .catch(() => {
    console.error('❌ Endpoint checks failed');
    process.exit(1);
  });
