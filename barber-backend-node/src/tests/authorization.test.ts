import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Salon } from '../models/Salon.js';
import { Service } from '../models/Service.js';
import { Appointment } from '../models/Appointment.js';
import { hashPassword } from '../utils/password.js';
import { authHeader, clearTestDb, futureDateKey, startTestDb, stopTestDb } from './testUtils.js';

const PASSWORD = 'CorrectHorse123';

let app: Express;
let passwordHash: string;

type Fixture = Awaited<ReturnType<typeof createFixture>>;
let f: Fixture;

const createUser = (fields: Record<string, unknown>) =>
  User.create({ passwordHash, ...fields });

const createFixture = async () => {
  const salonA = await Salon.create({ name: 'Salon A', slug: 'salon-a', owner_email: 'owner-a@test.com', total_revenue: 1000 });
  const salonB = await Salon.create({ name: 'Salon B', slug: 'salon-b', owner_email: 'owner-b@test.com', total_revenue: 2000 });

  const ownerA = await createUser({ email: 'owner-a@test.com', role: 'owner', salonId: salonA.id });
  const staffA = await createUser({ email: 'staff-a@test.com', role: 'staff', salonId: salonA.id, fullName: 'Staff A' });
  const staffA2 = await createUser({ email: 'staff-a2@test.com', role: 'staff', salonId: salonA.id, fullName: 'Staff A2' });
  const ownerB = await createUser({ email: 'owner-b@test.com', role: 'owner', salonId: salonB.id });
  const staffB = await createUser({ email: 'staff-b@test.com', role: 'staff', salonId: salonB.id, fullName: 'Staff B' });
  const superAdmin = await createUser({ email: 'admin@test.com', role: 'super_admin', isSuperAdmin: true });

  const serviceA = await Service.create({ salon_id: salonA.id, name: 'Cut A', duration: 30, price: 25 });
  const serviceB = await Service.create({ salon_id: salonB.id, name: 'Cut B', duration: 30, price: 40 });

  const baseAppointment = {
    customer_name: 'Customer',
    customer_phone: '+216 11 111 111',
    appointment_date: futureDateKey(),
    status: 'Pending',
    amount: 25
  };
  const appointmentA = await Appointment.create({
    ...baseAppointment,
    salon_id: salonA.id,
    staff_id: staffA.id,
    service_id: serviceA.id,
    appointment_time: '10:00'
  });
  const appointmentA2 = await Appointment.create({
    ...baseAppointment,
    salon_id: salonA.id,
    staff_id: staffA2.id,
    service_id: serviceA.id,
    appointment_time: '11:00'
  });
  const appointmentB = await Appointment.create({
    ...baseAppointment,
    salon_id: salonB.id,
    staff_id: staffB.id,
    service_id: serviceB.id,
    customer_phone: '+216 99 999 999',
    appointment_time: '12:00'
  });

  const tokenFor = (user: InstanceType<typeof User>) =>
    authHeader({
      id: user.id,
      email: user.email,
      role: user.role as 'owner' | 'staff' | 'super_admin',
      salonId: user.salonId,
      isSuperAdmin: user.isSuperAdmin
    });

  return {
    salonA,
    salonB,
    ownerA,
    staffA,
    staffA2,
    ownerB,
    staffB,
    superAdmin,
    serviceA,
    serviceB,
    appointmentA,
    appointmentA2,
    appointmentB,
    auth: {
      ownerA: tokenFor(ownerA),
      staffA: tokenFor(staffA),
      staffA2: tokenFor(staffA2),
      ownerB: tokenFor(ownerB),
      superAdmin: tokenFor(superAdmin)
    }
  };
};

beforeAll(async () => {
  await startTestDb();
  await User.init();
  passwordHash = await hashPassword(PASSWORD);
  app = createApp();
});

afterAll(stopTestDb);

beforeEach(async () => {
  await clearTestDb();
  f = await createFixture();
});

describe('password hashes', () => {
  it('are never included in staff listings', async () => {
    const res = await request(app).get('/api/staff').set('Authorization', f.auth.ownerA);
    expect(res.status).toBe(200);
    expect(res.body.staff.length).toBeGreaterThan(0);
    for (const member of res.body.staff) {
      expect(member).not.toHaveProperty('passwordHash');
    }
    expect(JSON.stringify(res.body)).not.toContain(passwordHash);
  });

  it('are not returned when creating or fetching a staff member', async () => {
    const created = await request(app)
      .post('/api/staff')
      .set('Authorization', f.auth.ownerA)
      .send({ email: 'new@test.com', password: 'Secret12345', fullName: 'New' });
    expect(created.status).toBe(201);
    expect(created.body.staff).not.toHaveProperty('passwordHash');

    const fetched = await request(app).get(`/api/staff/${f.staffA.id}`).set('Authorization', f.auth.ownerA);
    expect(fetched.status).toBe(200);
    expect(fetched.body.staff).not.toHaveProperty('passwordHash');
  });

  it('still allows logging in', async () => {
    const ok = await request(app).post('/api/auth/login').send({ email: 'staff-a@test.com', password: PASSWORD });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
    expect(ok.body.user).not.toHaveProperty('passwordHash');

    const bad = await request(app).post('/api/auth/login').send({ email: 'staff-a@test.com', password: 'wrong-password' });
    expect(bad.status).toBe(401);
  });

  it('are hidden from default queries but still stored', async () => {
    const plain = await User.findById(f.staffA.id).lean();
    expect(plain).not.toHaveProperty('passwordHash');
    const withHash = await User.findById(f.staffA.id).select('+passwordHash').lean();
    expect(withHash?.passwordHash).toBe(passwordHash);
  });
});

describe('/api/staff', () => {
  it('pins owners to their own salon when listing', async () => {
    const crossTenant = await request(app).get(`/api/staff?salonId=${f.salonB.id}`).set('Authorization', f.auth.ownerA);
    expect(crossTenant.status).toBe(403);

    const own = await request(app).get(`/api/staff?salonId=${f.salonA.id}`).set('Authorization', f.auth.ownerA);
    expect(own.status).toBe(200);
    const emails = own.body.staff.map((s: { email: string }) => s.email).sort();
    expect(emails).toEqual(['owner-a@test.com', 'staff-a2@test.com', 'staff-a@test.com'].sort());
  });

  it('forbids staff from listing staff', async () => {
    const res = await request(app).get('/api/staff').set('Authorization', f.auth.staffA);
    expect(res.status).toBe(403);
  });

  it('lets super admins list any salon', async () => {
    const res = await request(app).get(`/api/staff?salonId=${f.salonB.id}`).set('Authorization', f.auth.superAdmin);
    expect(res.status).toBe(200);
    expect(res.body.staff.map((s: { email: string }) => s.email)).toContain('staff-b@test.com');
  });

  it('checks the salon on GET /:id', async () => {
    const other = await request(app).get(`/api/staff/${f.staffB.id}`).set('Authorization', f.auth.ownerA);
    expect(other.status).toBe(404);

    const colleague = await request(app).get(`/api/staff/${f.staffA2.id}`).set('Authorization', f.auth.staffA);
    expect(colleague.status).toBe(403);

    const self = await request(app).get(`/api/staff/${f.staffA.id}`).set('Authorization', f.auth.staffA);
    expect(self.status).toBe(200);
  });

  it('only lets owners create staff, in their own salon', async () => {
    const byStaff = await request(app)
      .post('/api/staff')
      .set('Authorization', f.auth.staffA)
      .send({ email: 'x1@test.com', password: 'Secret12345' });
    expect(byStaff.status).toBe(403);

    const otherSalon = await request(app)
      .post('/api/staff')
      .set('Authorization', f.auth.ownerA)
      .send({ email: 'x2@test.com', password: 'Secret12345', salonId: f.salonB.id });
    expect(otherSalon.status).toBe(403);
    expect(await User.exists({ email: 'x2@test.com' })).toBeNull();

    const ok = await request(app)
      .post('/api/staff')
      .set('Authorization', f.auth.ownerA)
      .send({ email: 'x3@test.com', password: 'Secret12345', salonId: f.salonA.id });
    expect(ok.status).toBe(201);
    expect(ok.body.staff.role).toBe('staff');
    expect(String(ok.body.staff.salonId)).toBe(f.salonA.id);
  });

  it('ignores privileged fields on PATCH (no mass assignment)', async () => {
    const res = await request(app)
      .patch(`/api/staff/${f.staffA.id}`)
      .set('Authorization', f.auth.ownerA)
      .send({
        fullName: 'Renamed',
        full_name: 'Renamed',
        role: 'super_admin',
        isSuperAdmin: true,
        salonId: f.salonB.id,
        email: 'hijack@test.com',
        passwordHash: 'not-a-hash'
      });
    expect(res.status).toBe(200);
    expect(res.body.staff).not.toHaveProperty('passwordHash');

    const stored = await User.findById(f.staffA.id).select('+passwordHash').lean();
    expect(stored?.fullName).toBe('Renamed');
    expect(stored?.role).toBe('staff');
    expect(stored?.isSuperAdmin).toBe(false);
    expect(String(stored?.salonId)).toBe(f.salonA.id);
    expect(stored?.email).toBe('staff-a@test.com');
    expect(stored?.passwordHash).toBe(passwordHash);
  });

  it('rejects PATCH from staff and on other salons before updating', async () => {
    const byStaff = await request(app)
      .patch(`/api/staff/${f.staffA.id}`)
      .set('Authorization', f.auth.staffA)
      .send({ fullName: 'Self edit' });
    expect(byStaff.status).toBe(403);

    const crossTenant = await request(app)
      .patch(`/api/staff/${f.staffB.id}`)
      .set('Authorization', f.auth.ownerA)
      .send({ fullName: 'Hacked' });
    expect(crossTenant.status).toBe(404);

    const onOwner = await request(app)
      .patch(`/api/staff/${f.ownerB.id}`)
      .set('Authorization', f.auth.ownerA)
      .send({ fullName: 'Hacked' });
    expect(onOwner.status).toBe(404);

    expect((await User.findById(f.staffB.id).lean())?.fullName).toBe('Staff B');
    expect((await User.findById(f.ownerB.id).lean())?.fullName).toBeUndefined();
  });

  it('only deletes staff of the caller salon', async () => {
    const byStaff = await request(app).delete(`/api/staff/${f.staffA2.id}`).set('Authorization', f.auth.staffA);
    expect(byStaff.status).toBe(403);

    const otherSalon = await request(app).delete(`/api/staff/${f.staffB.id}`).set('Authorization', f.auth.ownerA);
    expect(otherSalon.status).toBe(404);

    const anOwner = await request(app).delete(`/api/staff/${f.ownerB.id}`).set('Authorization', f.auth.ownerA);
    expect(anOwner.status).toBe(404);

    const superAdmin = await request(app).delete(`/api/staff/${f.superAdmin.id}`).set('Authorization', f.auth.ownerA);
    expect(superAdmin.status).toBe(404);

    expect(await User.exists({ _id: f.staffA2.id })).not.toBeNull();
    expect(await User.exists({ _id: f.staffB.id })).not.toBeNull();
    expect(await User.exists({ _id: f.ownerB.id })).not.toBeNull();
    expect(await User.exists({ _id: f.superAdmin.id })).not.toBeNull();

    const ok = await request(app).delete(`/api/staff/${f.staffA2.id}`).set('Authorization', f.auth.ownerA);
    expect(ok.status).toBe(200);
    expect(await User.exists({ _id: f.staffA2.id })).toBeNull();
  });

  it('validates salonId on the public listing', async () => {
    const res = await request(app).get('/api/staff/public?salonId[$ne]=x');
    expect(res.status).toBe(400);

    const ok = await request(app).get(`/api/staff/public?salonId=${f.salonA.id}`);
    expect(ok.status).toBe(200);
    for (const member of ok.body.staff) {
      expect(Object.keys(member).sort()).toEqual(['avatarUrl', 'fullName', 'id', 'role', 'specialty']);
    }
  });
});

describe('/api/services', () => {
  it('restricts creation to owners of the target salon', async () => {
    const payload = { name: 'New', price: 10, duration: 15 };
    const byStaff = await request(app).post('/api/services').set('Authorization', f.auth.staffA).send({ ...payload, salonId: f.salonA.id });
    expect(byStaff.status).toBe(403);

    const otherSalon = await request(app).post('/api/services').set('Authorization', f.auth.ownerA).send({ ...payload, salonId: f.salonB.id });
    expect(otherSalon.status).toBe(403);

    const ok = await request(app).post('/api/services').set('Authorization', f.auth.ownerA).send({ ...payload, salonId: f.salonA.id });
    expect(ok.status).toBe(201);
    expect(String(ok.body.service.salon_id)).toBe(f.salonA.id);
  });

  it('checks the salon before update/delete and whitelists fields', async () => {
    const crossPatch = await request(app).patch(`/api/services/${f.serviceB.id}`).set('Authorization', f.auth.ownerA).send({ price: 1 });
    expect(crossPatch.status).toBe(404);
    const crossDelete = await request(app).delete(`/api/services/${f.serviceB.id}`).set('Authorization', f.auth.ownerA);
    expect(crossDelete.status).toBe(404);
    const crossHardDelete = await request(app).delete(`/api/services/${f.serviceB.id}/hard`).set('Authorization', f.auth.ownerA);
    expect(crossHardDelete.status).toBe(404);
    const serviceB = await Service.findById(f.serviceB.id).lean();
    expect(serviceB?.price).toBe(40);
    expect(serviceB?.is_active).toBe(true);

    const byStaff = await request(app).delete(`/api/services/${f.serviceA.id}/hard`).set('Authorization', f.auth.staffA);
    expect(byStaff.status).toBe(403);

    const ok = await request(app)
      .patch(`/api/services/${f.serviceA.id}`)
      .set('Authorization', f.auth.ownerA)
      .send({ price: 30, salon_id: f.salonB.id });
    expect(ok.status).toBe(200);
    const serviceA = await Service.findById(f.serviceA.id).lean();
    expect(serviceA?.price).toBe(30);
    expect(String(serviceA?.salon_id)).toBe(f.salonA.id);
  });
});

describe('/api/salons', () => {
  it('does not expose private fields publicly', async () => {
    for (const path of [`/api/salons/${f.salonA.id}`, '/api/salons/slug/salon-a']) {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      expect(res.body.salon.name).toBe('Salon A');
      expect(res.body.salon).not.toHaveProperty('owner_email');
      expect(res.body.salon).not.toHaveProperty('total_revenue');
    }
  });

  it('only lets the salon owner update it', async () => {
    const otherOwner = await request(app).patch(`/api/salons/${f.salonB.id}`).set('Authorization', f.auth.ownerA).send({ name: 'Hacked' });
    expect(otherOwner.status).toBe(403);
    const byStaff = await request(app).patch(`/api/salons/${f.salonA.id}`).set('Authorization', f.auth.staffA).send({ name: 'Hacked' });
    expect(byStaff.status).toBe(403);
    expect((await Salon.findById(f.salonB.id).lean())?.name).toBe('Salon B');
    expect((await Salon.findById(f.salonA.id).lean())?.name).toBe('Salon A');

    const ok = await request(app)
      .patch(`/api/salons/${f.salonA.id}`)
      .set('Authorization', f.auth.ownerA)
      .send({ name: 'Renamed A', total_revenue: 0 });
    expect(ok.status).toBe(200);
    const salonA = await Salon.findById(f.salonA.id).lean();
    expect(salonA?.name).toBe('Renamed A');
    expect(salonA?.total_revenue).toBe(1000);
  });
});

describe('super admin API', () => {
  const base = () => env.superAdminApiBasePath;

  it('rejects anonymous, owner and staff callers', async () => {
    expect((await request(app).get(`${base()}/salons`)).status).toBe(401);
    expect((await request(app).get(`${base()}/salons`).set('Authorization', f.auth.ownerA)).status).toBe(403);
    expect((await request(app).get(`${base()}/overview`).set('Authorization', f.auth.staffA)).status).toBe(403);
    const del = await request(app).delete(`${base()}/salons/${f.salonB.id}`).set('Authorization', f.auth.ownerA);
    expect(del.status).toBe(403);
    expect(await Salon.exists({ _id: f.salonB.id })).not.toBeNull();
  });

  it('allows super admins and whitelists PATCH fields', async () => {
    const list = await request(app).get(`${base()}/salons`).set('Authorization', f.auth.superAdmin);
    expect(list.status).toBe(200);
    expect(list.body.salons).toHaveLength(2);

    const patch = await request(app)
      .patch(`${base()}/salons/${f.salonB.id}`)
      .set('Authorization', f.auth.superAdmin)
      .send({ status: 'suspended', total_revenue: 5 });
    expect(patch.status).toBe(200);
    const salonB = await Salon.findById(f.salonB.id).lean();
    expect(salonB?.status).toBe('suspended');
    expect(salonB?.total_revenue).toBe(2000);
  });
});

describe('/api/appointments (authenticated)', () => {
  it('pins listings to the caller salon', async () => {
    const crossTenant = await request(app).get(`/api/appointments?salonId=${f.salonB.id}`).set('Authorization', f.auth.ownerA);
    expect(crossTenant.status).toBe(403);

    const byForeignStaff = await request(app).get(`/api/appointments?staffId=${f.staffB.id}`).set('Authorization', f.auth.ownerA);
    expect(byForeignStaff.status).toBe(200);
    expect(byForeignStaff.body.appointments).toHaveLength(0);

    const staffOwn = await request(app).get(`/api/appointments?staffId=${f.staffA.id}`).set('Authorization', f.auth.staffA);
    expect(staffOwn.status).toBe(200);
    expect(staffOwn.body.appointments.map((a: { _id: string }) => a._id)).toEqual([f.appointmentA.id]);

    const staffSalon = await request(app).get(`/api/appointments?salonId=${f.salonA.id}`).set('Authorization', f.auth.staffA);
    expect(staffSalon.status).toBe(200);
    expect(staffSalon.body.appointments).toHaveLength(2);
    expect(JSON.stringify(staffSalon.body)).not.toContain('passwordHash');
  });

  it('checks the salon on GET /:id', async () => {
    expect((await request(app).get(`/api/appointments/${f.appointmentB.id}`).set('Authorization', f.auth.ownerA)).status).toBe(404);
    expect((await request(app).get(`/api/appointments/${f.appointmentB.id}`).set('Authorization', f.auth.staffA)).status).toBe(404);
    expect((await request(app).get(`/api/appointments/${f.appointmentA.id}`).set('Authorization', f.auth.ownerA)).status).toBe(200);
    expect((await request(app).get(`/api/appointments/${f.appointmentB.id}`).set('Authorization', f.auth.superAdmin)).status).toBe(200);
  });

  it('checks the salon before PATCH and whitelists fields', async () => {
    const crossTenant = await request(app)
      .patch(`/api/appointments/${f.appointmentB.id}`)
      .set('Authorization', f.auth.ownerA)
      .send({ status: 'Cancelled' });
    expect(crossTenant.status).toBe(404);
    expect((await Appointment.findById(f.appointmentB.id).lean())?.status).toBe('Pending');

    const ok = await request(app)
      .patch(`/api/appointments/${f.appointmentA.id}`)
      .set('Authorization', f.auth.ownerA)
      .send({ status: 'Confirmed', salon_id: f.salonB.id, booking_code: 'HACKED' });
    expect(ok.status).toBe(200);
    const stored = await Appointment.findById(f.appointmentA.id).lean();
    expect(stored?.status).toBe('Confirmed');
    expect(String(stored?.salon_id)).toBe(f.salonA.id);
    expect(stored?.booking_code).toBeUndefined();

    const foreignStaff = await request(app)
      .patch(`/api/appointments/${f.appointmentA.id}`)
      .set('Authorization', f.auth.ownerA)
      .send({ staff_id: f.staffB.id });
    expect(foreignStaff.status).toBe(400);
  });

  it('limits staff to updating their own appointments', async () => {
    const colleague = await request(app)
      .patch(`/api/appointments/${f.appointmentA2.id}`)
      .set('Authorization', f.auth.staffA)
      .send({ status: 'Completed' });
    expect(colleague.status).toBe(404);
    expect((await Appointment.findById(f.appointmentA2.id).lean())?.status).toBe('Pending');

    const own = await request(app)
      .patch(`/api/appointments/${f.appointmentA.id}`)
      .set('Authorization', f.auth.staffA)
      .send({ status: 'Completed', staff_id: f.staffA2.id });
    expect(own.status).toBe(200);
    const stored = await Appointment.findById(f.appointmentA.id).lean();
    expect(stored?.status).toBe('Completed');
    expect(String(stored?.staff_id)).toBe(f.staffA.id);
  });

  it('only lets owners delete appointments of their salon', async () => {
    expect((await request(app).delete(`/api/appointments/${f.appointmentA.id}`).set('Authorization', f.auth.staffA)).status).toBe(403);
    expect((await request(app).delete(`/api/appointments/${f.appointmentB.id}`).set('Authorization', f.auth.ownerA)).status).toBe(404);
    expect(await Appointment.exists({ _id: f.appointmentA.id })).not.toBeNull();
    expect(await Appointment.exists({ _id: f.appointmentB.id })).not.toBeNull();

    expect((await request(app).delete(`/api/appointments/${f.appointmentA.id}`).set('Authorization', f.auth.ownerA)).status).toBe(200);
    expect(await Appointment.exists({ _id: f.appointmentA.id })).toBeNull();
  });

  it('validates salon, staff and service on create', async () => {
    const base = {
      service_id: f.serviceA.id,
      customer_name: 'Walk-in',
      appointment_date: futureDateKey(),
      appointment_time: '15:00'
    };

    const otherSalon = await request(app)
      .post('/api/appointments')
      .set('Authorization', f.auth.ownerA)
      .send({ ...base, salon_id: f.salonB.id, staff_id: f.staffB.id, service_id: f.serviceB.id });
    expect(otherSalon.status).toBe(403);

    const foreignStaff = await request(app)
      .post('/api/appointments')
      .set('Authorization', f.auth.ownerA)
      .send({ ...base, salon_id: f.salonA.id, staff_id: f.staffB.id });
    expect(foreignStaff.status).toBe(400);

    const foreignService = await request(app)
      .post('/api/appointments')
      .set('Authorization', f.auth.ownerA)
      .send({ ...base, salon_id: f.salonA.id, staff_id: f.staffA.id, service_id: f.serviceB.id });
    expect(foreignService.status).toBe(400);

    const staffForColleague = await request(app)
      .post('/api/appointments')
      .set('Authorization', f.auth.staffA)
      .send({ ...base, salon_id: f.salonA.id, staff_id: f.staffA2.id });
    expect(staffForColleague.status).toBe(403);

    const staffForSelf = await request(app)
      .post('/api/appointments')
      .set('Authorization', f.auth.staffA)
      .send({ ...base, salon_id: f.salonA.id, staff_id: f.staffA.id });
    expect(staffForSelf.status).toBe(201);
  });

  it('limits staff stats to the caller', async () => {
    expect((await request(app).get(`/api/appointments/stats/staff/${f.staffA2.id}`).set('Authorization', f.auth.staffA)).status).toBe(403);
    expect((await request(app).get(`/api/appointments/stats/staff/${f.staffA.id}`).set('Authorization', f.auth.staffA)).status).toBe(200);
  });
});

describe('/api/appointments (public)', () => {
  const publicBooking = () => ({
    salon_id: f.salonA.id,
    staff_id: f.staffA.id,
    service_id: f.serviceA.id,
    customer_name: 'Online customer',
    customer_phone: '+216 22 222 222',
    appointment_date: futureDateKey(),
    appointment_time: '16:00'
  });

  it('ignores client-supplied status and amount', async () => {
    const res = await request(app)
      .post('/api/appointments/public')
      .send({ ...publicBooking(), status: 'Confirmed', amount: 1 });
    expect(res.status).toBe(201);
    expect(res.body.appointment.status).toBe('Pending');
    expect(res.body.appointment.amount).toBe(25);
  });

  it('rejects staff or services from another salon', async () => {
    const foreignStaff = await request(app).post('/api/appointments/public').send({ ...publicBooking(), staff_id: f.staffB.id });
    expect(foreignStaff.status).toBe(400);
    const foreignService = await request(app).post('/api/appointments/public').send({ ...publicBooking(), service_id: f.serviceB.id });
    expect(foreignService.status).toBe(400);
  });

  it('does not expose other customers through availability', async () => {
    const res = await request(app).get(
      `/api/appointments/public-availability?salonId=${f.salonB.id}&staffId=${f.staffB.id}&date=${futureDateKey()}`
    );
    expect(res.status).toBe(200);
    expect(res.body.bookedTimes).toEqual(['12:00']);
    expect(Object.keys(res.body).sort()).toEqual(['bookedTimes', 'count', 'date', 'serverNow']);
  });

  it('caps the spam-check window', async () => {
    const res = await request(app)
      .post('/api/appointments/public-spam-check')
      .send({ salon_id: f.salonA.id, customer_phone: '+216 11 111 111', window_minutes: 10_000_000 });
    expect(res.status).toBe(200);
    expect(res.body.windowMinutes).toBe(60);
  });
});

describe('/api/notifications', () => {
  it('scopes counts to the caller salon and staff member', async () => {
    const crossTenant = await request(app)
      .get(`/api/notifications/unread-count?salonId=${f.salonB.id}&role=owner`)
      .set('Authorization', f.auth.ownerA);
    expect(crossTenant.status).toBe(403);

    const owner = await request(app)
      .get(`/api/notifications/unread-count?salonId=${f.salonA.id}&role=owner`)
      .set('Authorization', f.auth.ownerA);
    expect(owner.body.count).toBe(2);

    // Staff cannot widen the scope by claiming the owner role
    const staff = await request(app)
      .get(`/api/notifications/unread-count?salonId=${f.salonA.id}&role=owner`)
      .set('Authorization', f.auth.staffA);
    expect(staff.body.count).toBe(1);
  });

  it('checks the salon before marking an appointment as read', async () => {
    const res = await request(app).post(`/api/notifications/mark-read/${f.appointmentB.id}`).set('Authorization', f.auth.ownerA);
    expect(res.status).toBe(404);
    expect((await Appointment.findById(f.appointmentB.id).lean())?.is_read).toBe(false);

    const markAll = await request(app)
      .post('/api/notifications/mark-all-read')
      .set('Authorization', f.auth.ownerA)
      .send({ salonId: f.salonB.id, role: 'owner' });
    expect(markAll.status).toBe(403);
    expect((await Appointment.findById(f.appointmentB.id).lean())?.is_read).toBe(false);
  });
});

describe('opt-in routes', () => {
  it('keeps seed routes disabled unless ENABLE_SEED_ROUTES=true', async () => {
    expect(env.enableSeedRoutes).toBe(false);
    const res = await request(app).post('/api/seed/init');
    expect(res.status).toBe(404);
    expect(await User.countDocuments({ role: 'super_admin' })).toBe(1);
  });

  it('keeps self-registration disabled unless ALLOW_PUBLIC_REGISTRATION=true', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'intruder@test.com', password: 'LongPassword123', salonId: f.salonA.id });
    expect(res.status).toBe(403);
    expect(await User.exists({ email: 'intruder@test.com' })).toBeNull();
  });
});
