import { Router, Request, Response } from 'express';
import { Appointment } from '../models/Appointment.js';
import { User } from '../models/User.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { sendPushToUsers } from '../services/pushNotifications.js';
import { logger } from '../utils/logger.js';

export const appointmentsRouter = Router();

appointmentsRouter.post('/public', async (req: Request, res: Response) => {
  const body = req.body as {
    salon_id?: string;
    staff_id?: string;
    service_id?: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    appointment_date?: string;
    appointment_time?: string;
    status?: string;
    amount?: number;
    notes?: string;
  };

  const required = ['salon_id', 'staff_id', 'service_id', 'customer_name', 'appointment_date', 'appointment_time'];
  for (const key of required) {
    if (!body[key as keyof typeof body]) {
      return res.status(400).json({ error: `${key} is required` });
    }
  }

  const appointment = await Appointment.create({
    salon_id: body.salon_id,
    staff_id: body.staff_id,
    service_id: body.service_id,
    customer_name: body.customer_name,
    customer_email: body.customer_email,
    customer_phone: body.customer_phone,
    appointment_date: body.appointment_date,
    appointment_time: body.appointment_time,
    status: body.status ?? 'Pending',
    amount: body.amount ?? 0,
    notes: body.notes
  });

  const owners = await User.find({ salonId: appointment.salon_id, role: 'owner' })
    .select('_id')
    .lean();
  const recipientUserIds = [
    ...owners.map((owner) => String(owner._id)),
    String(appointment.staff_id)
  ];

  sendPushToUsers(recipientUserIds, {
    title: 'New Appointment',
    body: `${appointment.customer_name} booked for ${appointment.appointment_date} at ${appointment.appointment_time}`,
    url: '/dashboard',
    appointmentId: String(appointment._id)
  }).catch((error) => {
    logger.error('Push notification dispatch failed after public appointment creation', error, 'APPOINTMENTS');
  });

  return res.status(201).json({ appointment });
});

appointmentsRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const salonId = req.query.salonId as string | undefined;
  const staffId = req.query.staffId as string | undefined;

  if (!salonId && !staffId) {
    return res.status(400).json({ error: 'salonId or staffId is required' });
  }

  const query: Record<string, unknown> = {};
  if (salonId) query.salon_id = salonId;
  if (staffId) query.staff_id = staffId;

  const appointments = await Appointment.find(query)
    .sort({ appointment_date: 1, appointment_time: 1 })
    .populate('service_id')
    .populate('staff_id', 'fullName email specialty');

  return res.json({ appointments });
});


appointmentsRouter.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const body = req.body as {
    salon_id?: string;
    staff_id?: string;
    service_id?: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    appointment_date?: string;
    appointment_time?: string;
    status?: string;
    amount?: number;
    notes?: string;
  };

  const required = ['salon_id', 'staff_id', 'service_id', 'customer_name', 'appointment_date', 'appointment_time'];
  for (const key of required) {
    if (!body[key as keyof typeof body]) {
      return res.status(400).json({ error: `${key} is required` });
    }
  }

  const appointment = await Appointment.create({
    salon_id: body.salon_id,
    staff_id: body.staff_id,
    service_id: body.service_id,
    customer_name: body.customer_name,
    customer_email: body.customer_email,
    customer_phone: body.customer_phone,
    appointment_date: body.appointment_date,
    appointment_time: body.appointment_time,
    status: body.status ?? 'Pending',
    amount: body.amount ?? 0,
    notes: body.notes
  });

  const owners = await User.find({ salonId: appointment.salon_id, role: 'owner' })
    .select('_id')
    .lean();
  const recipientUserIds = [
    ...owners.map((owner) => String(owner._id)),
    String(appointment.staff_id)
  ];

  sendPushToUsers(recipientUserIds, {
    title: 'New Appointment',
    body: `${appointment.customer_name} booked for ${appointment.appointment_date} at ${appointment.appointment_time}`,
    url: '/dashboard',
    appointmentId: String(appointment._id)
  }).catch((error) => {
    logger.error('Push notification dispatch failed after authenticated appointment creation', error, 'APPOINTMENTS');
  });

  return res.status(201).json({ appointment });
});

appointmentsRouter.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const updates = req.body as Partial<{
    staff_id: string;
    service_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    appointment_date: string;
    appointment_time: string;
    status: string;
    amount: number;
    notes: string;
    is_read: boolean;
  }>;

  const appointment = await Appointment.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  return res.json({ appointment });
});

appointmentsRouter.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const appointment = await Appointment.findByIdAndDelete(req.params.id);
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  return res.json({ deleted: true });
});

appointmentsRouter.get('/stats/staff/:staffId', requireAuth, async (req: AuthRequest, res: Response) => {
  const staffId = req.params.staffId;
  const today = new Date().toISOString().split('T')[0];
  const appointments = await Appointment.find({ staff_id: staffId });

  let today_appointments = 0;
  let today_earnings = 0;
  let completed_appointments = 0;
  let total_earnings = 0;

  appointments.forEach((apt) => {
    const isCompleted = apt.status === 'Completed';
    const isCancelled = apt.status === 'Cancelled';
    const isToday = apt.appointment_date === today;

    if (isToday && !isCancelled) {
      today_appointments += 1;
      today_earnings += Number(apt.amount || 0);
    }

    if (isCompleted) {
      completed_appointments += 1;
      total_earnings += Number(apt.amount || 0);
    }
  });

  return res.json({
    stats: { today_appointments, today_earnings, completed_appointments, total_earnings }
  });
});

appointmentsRouter.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('service_id')
    .populate('staff_id', 'fullName email specialty');
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  return res.json({ appointment });
});
