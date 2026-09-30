import { Router, Request, Response } from 'express';
import { Appointment } from '../models/Appointment.js';
import { User } from '../models/User.js';
import { Service } from '../models/Service.js';
import {
  requireAuth,
  requireRole,
  AuthRequest,
  AuthUser,
  canAccessSalon,
  isSuperAdminUser,
  isValidId,
  pickFields,
  resolveSalonId
} from '../middleware/auth.js';
import { sendPushToUsers } from '../services/pushNotifications.js';
import { logger } from '../utils/logger.js';

export const appointmentsRouter = Router();

const TUNIS_TIME_ZONE = 'Africa/Tunis';
const ACTIVE_SLOT_STATUSES = ['Pending', 'Confirmed', 'pending', 'confirmed'];
const CANCELED_SLOT_STATUSES = ['Cancelled', 'Canceled', 'cancelled', 'canceled'];
const DEFAULT_SPAM_WINDOW_MINUTES = 60;
const DEFAULT_SPAM_MAX_BOOKINGS = 3;
const DEFAULT_CANCELLATION_CUTOFF_MINUTES = 30;

const STAFF_APPOINTMENT_UPDATABLE_FIELDS = [
  'service_id',
  'customer_name',
  'customer_email',
  'customer_phone',
  'appointment_date',
  'appointment_time',
  'status',
  'amount',
  'notes',
  'is_read'
] as const;
const APPOINTMENT_UPDATABLE_FIELDS = [...STAFF_APPOINTMENT_UPDATABLE_FIELDS, 'staff_id'] as const;

const BOOKING_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const BOOKING_CODE_LENGTH = 6;

const isValidDateKey = (dateKey: string) => /^\d{4}-\d{2}-\d{2}$/.test(dateKey);

const parseTimeToMinutes = (timeValue: string) => {
  if (!/^\d{2}:\d{2}$/.test(timeValue)) {
    return null;
  }

  const [hoursRaw, minutesRaw] = timeValue.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
};

const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

const normalizeBookingCode = (value: string) => value.trim().toUpperCase();

const generateBookingCodeCandidate = () => {
  let code = '';
  for (let index = 0; index < BOOKING_CODE_LENGTH; index += 1) {
    const randomIndex = Math.floor(Math.random() * BOOKING_CODE_ALPHABET.length);
    code += BOOKING_CODE_ALPHABET[randomIndex];
  }
  return code;
};

const createUniqueBookingCode = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = generateBookingCodeCandidate();
    const existing = await Appointment.exists({ booking_code: candidate });
    if (!existing) {
      return candidate;
    }
  }

  return `${Date.now().toString(36).slice(-6)}`.toUpperCase();
};

const getTunisNow = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TUNIS_TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).formatToParts(now);

  const partMap = new Map(parts.map((part) => [part.type, part.value]));
  const dateKey = `${partMap.get('year')}-${partMap.get('month')}-${partMap.get('day')}`;
  const nowMinutes = Number(partMap.get('hour') ?? 0) * 60 + Number(partMap.get('minute') ?? 0);

  return {
    dateKey,
    nowMinutes
  };
};

const isPastSlotInTunis = (appointmentDate: string, appointmentTime: string) => {
  const slotMinutes = parseTimeToMinutes(appointmentTime);
  if (slotMinutes === null) {
    return true;
  }

  const tunisNow = getTunisNow();

  if (appointmentDate < tunisNow.dateKey) {
    return true;
  }

  if (appointmentDate > tunisNow.dateKey) {
    return false;
  }

  return slotMinutes <= tunisNow.nowMinutes;
};

const purgeCanceledAppointments = async (query: Record<string, unknown> = {}) => {
  await Appointment.deleteMany({
    ...query,
    status: { $in: CANCELED_SLOT_STATUSES }
  });
};

const autoCompletePastAppointments = async (query: Record<string, unknown> = {}) => {
  const tunisNow = getTunisNow();

  await Appointment.updateMany(
    {
      ...query,
      status: { $in: ACTIVE_SLOT_STATUSES },
      appointment_date: { $lt: tunisNow.dateKey }
    },
    {
      $set: { status: 'Completed' }
    }
  );

  const todaysActiveAppointments = await Appointment.find({
    ...query,
    status: { $in: ACTIVE_SLOT_STATUSES },
    appointment_date: tunisNow.dateKey
  })
    .select('_id appointment_time')
    .lean();

  const completedTodayIds = todaysActiveAppointments
    .filter((appointment) => {
      const normalizedTime = String(appointment.appointment_time ?? '').slice(0, 5);
      const minutes = parseTimeToMinutes(normalizedTime);
      return minutes !== null && minutes <= tunisNow.nowMinutes;
    })
    .map((appointment) => appointment._id);

  if (completedTodayIds.length > 0) {
    await Appointment.updateMany(
      { _id: { $in: completedTodayIds } },
      { $set: { status: 'Completed' } }
    );
  }
};

const hasDuplicateBooking = async (input: {
  salonId: string;
  staffId: string;
  customerPhone: string;
  appointmentDate: string;
  appointmentTime: string;
}) => {
  const cleanPhone = normalizePhone(input.customerPhone);
  if (!cleanPhone) {
    return false;
  }

  const appointments = await Appointment.find({
    salon_id: input.salonId,
    staff_id: input.staffId,
    appointment_date: input.appointmentDate,
    appointment_time: input.appointmentTime,
    status: { $in: ACTIVE_SLOT_STATUSES }
  })
    .select('customer_phone')
    .lean();

  return appointments.some((appointment) => normalizePhone(String(appointment.customer_phone ?? '')) === cleanPhone);
};

const getManageableAppointment = async (input: {
  salonId: string;
  bookingCode: string;
  customerPhone: string;
}) => {
  await purgeCanceledAppointments({ salon_id: input.salonId });
  await autoCompletePastAppointments({ salon_id: input.salonId });

  const bookingCode = normalizeBookingCode(input.bookingCode);
  const cleanPhone = normalizePhone(input.customerPhone);

  if (!bookingCode || !cleanPhone) {
    return null;
  }

  const appointmentCandidates = await Appointment.find({
    salon_id: input.salonId,
    booking_code: bookingCode
  })
    .sort({ created_at: -1 })
    .populate('service_id', 'name duration price')
    .populate('staff_id', 'fullName specialty')
    .lean();

  return (
    appointmentCandidates.find(
      (appointment) => normalizePhone(String(appointment.customer_phone ?? '')) === cleanPhone
    ) ?? null
  );
};

/** Salon filter applied to authenticated appointment queries; null if the user has no salon. */
const appointmentScope = (user?: AuthUser): Record<string, unknown> | null => {
  if (isSuperAdminUser(user)) return {};
  if (!user?.salonId) return null;
  return { salon_id: user.salonId };
};

/** Loads an appointment only if it belongs to a salon the caller can access. */
const findAccessibleAppointment = async (req: AuthRequest, id: string) => {
  if (!isValidId(id)) return null;
  const appointment = await Appointment.findById(id);
  if (!appointment || !canAccessSalon(req.user, appointment.salon_id)) return null;
  return appointment;
};

const isSalonMember = async (salonId: string, userId: unknown) => {
  if (!isValidId(userId)) return false;
  const member = await User.exists({ _id: userId, salonId, role: { $in: ['owner', 'staff', 'super_admin'] } });
  return Boolean(member);
};

const findSalonService = async (salonId: string, serviceId: unknown) => {
  if (!isValidId(serviceId)) return null;
  return Service.findOne({ _id: serviceId, salon_id: salonId }).select('_id price is_active').lean();
};

const getRecentBookingCountForPhone = async (input: {
  salonId: string;
  customerPhone: string;
  windowMinutes: number;
}) => {
  const cleanPhone = normalizePhone(input.customerPhone);
  if (!cleanPhone) {
    return 0;
  }

  const cutoffDate = new Date(Date.now() - input.windowMinutes * 60 * 1000);
  const appointments = await Appointment.find({
    salon_id: input.salonId,
    status: { $in: ACTIVE_SLOT_STATUSES },
    created_at: { $gte: cutoffDate }
  })
    .select('customer_phone')
    .lean();

  return appointments.filter((appointment) => normalizePhone(String(appointment.customer_phone ?? '')) === cleanPhone).length;
};

appointmentsRouter.get('/public-availability', async (req: Request, res: Response) => {
  const salonId = String(req.query.salonId ?? '');
  const staffId = String(req.query.staffId ?? '');
  const date = String(req.query.date ?? '');

  if (!salonId || !staffId || !date) {
    return res.status(400).json({ error: 'salonId, staffId and date are required' });
  }

  if (!isValidDateKey(date)) {
    return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
  }

  const appointments = await Appointment.find({
    salon_id: salonId,
    staff_id: staffId,
    appointment_date: date,
    status: { $in: ACTIVE_SLOT_STATUSES }
  })
    .select('appointment_time')
    .lean();

  const bookedTimes = appointments
    .map((appointment) => (appointment.appointment_time || '').slice(0, 5))
    .filter(Boolean);

  return res.json({
    date,
    bookedTimes,
    count: bookedTimes.length,
    serverNow: getTunisNow()
  });
});

appointmentsRouter.post('/public-duplicate-check', async (req: Request, res: Response) => {
  const body = req.body as {
    salon_id?: string;
    staff_id?: string;
    customer_phone?: string;
    appointment_date?: string;
    appointment_time?: string;
  };

  const required = ['salon_id', 'staff_id', 'customer_phone', 'appointment_date', 'appointment_time'];
  for (const key of required) {
    if (!body[key as keyof typeof body]) {
      return res.status(400).json({ error: `${key} is required` });
    }
  }

  const appointmentDate = String(body.appointment_date ?? '');
  const appointmentTime = String(body.appointment_time ?? '');

  if (!isValidDateKey(appointmentDate)) {
    return res.status(400).json({ error: 'appointment_date must be in YYYY-MM-DD format' });
  }

  if (parseTimeToMinutes(appointmentTime) === null) {
    return res.status(400).json({ error: 'appointment_time must be in HH:mm format' });
  }

  const isDuplicate = await hasDuplicateBooking({
    salonId: String(body.salon_id),
    staffId: String(body.staff_id),
    customerPhone: String(body.customer_phone),
    appointmentDate,
    appointmentTime
  });

  return res.json({
    isDuplicate
  });
});

appointmentsRouter.post('/public-spam-check', async (req: Request, res: Response) => {
  const body = req.body as {
    salon_id?: string;
    customer_phone?: string;
    window_minutes?: number;
    max_bookings?: number;
  };

  if (!body.salon_id || !body.customer_phone) {
    return res.status(400).json({ error: 'salon_id and customer_phone are required' });
  }

  const windowMinutesRaw = Number(body.window_minutes ?? DEFAULT_SPAM_WINDOW_MINUTES);
  const maxBookingsRaw = Number(body.max_bookings ?? DEFAULT_SPAM_MAX_BOOKINGS);
  // Capped so this public endpoint cannot be used to probe a phone number's booking history
  const windowMinutes =
    Number.isFinite(windowMinutesRaw) && windowMinutesRaw > 0
      ? Math.min(windowMinutesRaw, DEFAULT_SPAM_WINDOW_MINUTES)
      : DEFAULT_SPAM_WINDOW_MINUTES;
  const maxBookings = Number.isFinite(maxBookingsRaw) && maxBookingsRaw > 0 ? maxBookingsRaw : DEFAULT_SPAM_MAX_BOOKINGS;

  const recentCount = await getRecentBookingCountForPhone({
    salonId: String(body.salon_id),
    customerPhone: String(body.customer_phone),
    windowMinutes
  });

  return res.json({
    isSpam: recentCount >= maxBookings,
    recentCount,
    windowMinutes,
    maxBookings
  });
});

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

  const appointmentDate = String(body.appointment_date ?? '');
  const appointmentTime = String(body.appointment_time ?? '');

  if (!isValidDateKey(appointmentDate)) {
    return res.status(400).json({ error: 'appointment_date must be in YYYY-MM-DD format' });
  }

  if (parseTimeToMinutes(appointmentTime) === null) {
    return res.status(400).json({ error: 'appointment_time must be in HH:mm format' });
  }

  if (isPastSlotInTunis(appointmentDate, appointmentTime)) {
    return res.status(409).json({ error: 'Selected slot is in the past for Tunisia time' });
  }

  if (!isValidId(body.salon_id)) {
    return res.status(400).json({ error: 'Invalid salon_id' });
  }

  if (!(await isSalonMember(body.salon_id, body.staff_id))) {
    return res.status(400).json({ error: 'staff_id does not belong to this salon' });
  }

  const service = await findSalonService(body.salon_id, body.service_id);
  if (!service || service.is_active === false) {
    return res.status(400).json({ error: 'service_id does not belong to this salon' });
  }

  const existing = await Appointment.findOne({
    salon_id: body.salon_id,
    staff_id: body.staff_id,
    appointment_date: appointmentDate,
    appointment_time: appointmentTime,
    status: { $in: ACTIVE_SLOT_STATUSES }
  })
    .select('_id')
    .lean();

  if (existing) {
    return res.status(409).json({ error: 'This slot is already booked' });
  }

  const isDuplicate = await hasDuplicateBooking({
    salonId: String(body.salon_id),
    staffId: String(body.staff_id),
    customerPhone: String(body.customer_phone ?? ''),
    appointmentDate,
    appointmentTime
  });

  if (isDuplicate) {
    return res.status(409).json({ error: 'You already have this booking for the selected slot' });
  }

  const recentCount = await getRecentBookingCountForPhone({
    salonId: String(body.salon_id),
    customerPhone: String(body.customer_phone ?? ''),
    windowMinutes: DEFAULT_SPAM_WINDOW_MINUTES
  });

  if (recentCount >= DEFAULT_SPAM_MAX_BOOKINGS) {
    return res.status(429).json({
      error: `Too many bookings in ${DEFAULT_SPAM_WINDOW_MINUTES} minutes`,
      recentCount,
      maxBookings: DEFAULT_SPAM_MAX_BOOKINGS
    });
  }

  const bookingCode = await createUniqueBookingCode();

  const appointment = await Appointment.create({
    salon_id: body.salon_id,
    staff_id: body.staff_id,
    service_id: body.service_id,
    customer_name: body.customer_name,
    customer_email: body.customer_email,
    customer_phone: body.customer_phone,
    booking_code: bookingCode,
    appointment_date: appointmentDate,
    appointment_time: appointmentTime,
    // Public bookings always start as Pending and are priced from the service
    status: 'Pending',
    amount: service.price ?? 0,
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

appointmentsRouter.post('/public-manage/lookup', async (req: Request, res: Response) => {
  const body = req.body as {
    salon_id?: string;
    booking_code?: string;
    customer_phone?: string;
  };

  if (!body.salon_id || !body.booking_code || !body.customer_phone) {
    return res.status(400).json({ error: 'salon_id, booking_code and customer_phone are required' });
  }

  const appointment = await getManageableAppointment({
    salonId: String(body.salon_id),
    bookingCode: String(body.booking_code),
    customerPhone: String(body.customer_phone)
  });

  if (!appointment) {
    return res.status(404).json({ error: 'Booking not found. Please verify code and phone number.' });
  }

  return res.json({ appointment });
});

appointmentsRouter.post('/public-manage/cancel', async (req: Request, res: Response) => {
  const body = req.body as {
    salon_id?: string;
    booking_code?: string;
    customer_phone?: string;
  };

  if (!body.salon_id || !body.booking_code || !body.customer_phone) {
    return res.status(400).json({ error: 'salon_id, booking_code and customer_phone are required' });
  }

  const appointment = await getManageableAppointment({
    salonId: String(body.salon_id),
    bookingCode: String(body.booking_code),
    customerPhone: String(body.customer_phone)
  });

  if (!appointment) {
    return res.status(404).json({ error: 'Booking not found. Please verify code and phone number.' });
  }

  if (appointment.status === 'Cancelled') {
    return res.status(409).json({ error: 'This booking is already cancelled' });
  }

  if (appointment.status === 'Completed') {
    return res.status(409).json({ error: 'Completed bookings cannot be cancelled' });
  }

  const slotMinutes = parseTimeToMinutes(String(appointment.appointment_time));
  if (slotMinutes === null) {
    return res.status(409).json({ error: 'This booking cannot be managed due to invalid time format' });
  }

  const tunisNow = getTunisNow();
  const appointmentDate = String(appointment.appointment_date);

  if (appointmentDate < tunisNow.dateKey) {
    return res.status(409).json({ error: 'Past bookings cannot be cancelled' });
  }

  if (
    appointmentDate === tunisNow.dateKey &&
    slotMinutes - tunisNow.nowMinutes < DEFAULT_CANCELLATION_CUTOFF_MINUTES
  ) {
    return res.status(409).json({
      error: `Cancellation is allowed only at least ${DEFAULT_CANCELLATION_CUTOFF_MINUTES} minutes before the appointment`
    });
  }

  await Appointment.findByIdAndDelete(appointment._id);

  return res.json({
    deleted: true,
    message: 'Booking cancelled permanently and access code removed'
  });
});

appointmentsRouter.post('/public-manage/reschedule', async (req: Request, res: Response) => {
  const body = req.body as {
    salon_id?: string;
    booking_code?: string;
    customer_phone?: string;
    appointment_date?: string;
    appointment_time?: string;
  };

  const required = ['salon_id', 'booking_code', 'customer_phone', 'appointment_date', 'appointment_time'];
  for (const key of required) {
    if (!body[key as keyof typeof body]) {
      return res.status(400).json({ error: `${key} is required` });
    }
  }

  const nextDate = String(body.appointment_date);
  const nextTime = String(body.appointment_time);

  if (!isValidDateKey(nextDate)) {
    return res.status(400).json({ error: 'appointment_date must be in YYYY-MM-DD format' });
  }

  if (parseTimeToMinutes(nextTime) === null) {
    return res.status(400).json({ error: 'appointment_time must be in HH:mm format' });
  }

  if (isPastSlotInTunis(nextDate, nextTime)) {
    return res.status(409).json({ error: 'Selected slot is in the past for Tunisia time' });
  }

  const appointment = await getManageableAppointment({
    salonId: String(body.salon_id),
    bookingCode: String(body.booking_code),
    customerPhone: String(body.customer_phone)
  });

  if (!appointment) {
    return res.status(404).json({ error: 'Booking not found. Please verify code and phone number.' });
  }

  if (appointment.status === 'Cancelled') {
    return res.status(409).json({ error: 'Cancelled bookings cannot be rescheduled' });
  }

  if (appointment.status === 'Completed') {
    return res.status(409).json({ error: 'Completed bookings cannot be rescheduled' });
  }

  const staffId = String(appointment.staff_id?._id ?? appointment.staff_id ?? '');

  if (!staffId) {
    return res.status(409).json({ error: 'This booking cannot be managed because staff is missing' });
  }

  const isSameSlot = String(appointment.appointment_date) === nextDate && String(appointment.appointment_time) === nextTime;
  if (isSameSlot) {
    return res.status(200).json({ appointment });
  }

  const existing = await Appointment.findOne({
    _id: { $ne: appointment._id },
    salon_id: body.salon_id,
    staff_id: staffId,
    appointment_date: nextDate,
    appointment_time: nextTime,
    status: { $in: ACTIVE_SLOT_STATUSES }
  })
    .select('_id')
    .lean();

  if (existing) {
    return res.status(409).json({ error: 'This slot is already booked' });
  }

  const updatedAppointment = await Appointment.findByIdAndUpdate(
    appointment._id,
    {
      appointment_date: nextDate,
      appointment_time: nextTime,
      status: 'Pending'
    },
    { new: true }
  )
    .populate('service_id', 'name duration price')
    .populate('staff_id', 'fullName specialty');

  return res.json({ appointment: updatedAppointment });
});

appointmentsRouter.get('/', requireAuth, requireRole('owner', 'staff', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const salonId = req.query.salonId;
  const staffId = req.query.staffId;

  if (!salonId && !staffId) {
    return res.status(400).json({ error: 'salonId or staffId is required' });
  }

  if (staffId !== undefined && !isValidId(staffId)) {
    return res.status(400).json({ error: 'Invalid staffId' });
  }

  const query: Record<string, unknown> = {};
  if (isSuperAdminUser(req.user) && !salonId) {
    query.staff_id = staffId;
  } else {
    // Owners and staff are always pinned to their own salon
    const resolved = resolveSalonId(req.user, salonId);
    if (!resolved.ok) {
      return res.status(resolved.status).json({ error: resolved.error });
    }
    query.salon_id = resolved.salonId;
    if (staffId) query.staff_id = staffId;
  }

  await purgeCanceledAppointments(query);
  await autoCompletePastAppointments(query);

  const appointments = await Appointment.find(query)
    .sort({ appointment_date: 1, appointment_time: 1 })
    .populate('service_id')
    .populate('staff_id', 'fullName email specialty');

  return res.json({ appointments });
});


appointmentsRouter.post('/', requireAuth, requireRole('owner', 'staff', 'super_admin'), async (req: AuthRequest, res: Response) => {
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

  const resolved = resolveSalonId(req.user, body.salon_id);
  if (!resolved.ok) {
    return res.status(resolved.status).json({ error: resolved.error });
  }
  const salonId = resolved.salonId;

  // Staff can only book appointments for themselves
  if (req.user?.role === 'staff' && String(body.staff_id) !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!(await isSalonMember(salonId, body.staff_id))) {
    return res.status(400).json({ error: 'staff_id does not belong to this salon' });
  }

  if (!(await findSalonService(salonId, body.service_id))) {
    return res.status(400).json({ error: 'service_id does not belong to this salon' });
  }

  const appointment = await Appointment.create({
    salon_id: salonId,
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

appointmentsRouter.patch('/:id', requireAuth, requireRole('owner', 'staff', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const isStaff = req.user?.role === 'staff' && !isSuperAdminUser(req.user);
  const updates = pickFields(
    req.body,
    isStaff ? STAFF_APPOINTMENT_UPDATABLE_FIELDS : APPOINTMENT_UPDATABLE_FIELDS
  ) as Record<string, unknown>;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid update fields provided' });
  }

  const existing = await findAccessibleAppointment(req, req.params.id);
  // Staff may only update appointments assigned to them
  if (!existing || (isStaff && String(existing.staff_id) !== req.user?.id)) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  const salonId = String(existing.salon_id);
  if (updates.staff_id !== undefined && !(await isSalonMember(salonId, updates.staff_id))) {
    return res.status(400).json({ error: 'staff_id does not belong to this salon' });
  }
  if (updates.service_id !== undefined && !(await findSalonService(salonId, updates.service_id))) {
    return res.status(400).json({ error: 'service_id does not belong to this salon' });
  }

  const appointment = await Appointment.findByIdAndUpdate(existing._id, { $set: updates }, { new: true, runValidators: true });
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  return res.json({ appointment });
});

appointmentsRouter.delete('/:id', requireAuth, requireRole('owner', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const existing = await findAccessibleAppointment(req, req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  await Appointment.deleteOne({ _id: existing._id });
  return res.json({ deleted: true });
});

appointmentsRouter.get('/stats/staff/:staffId', requireAuth, requireRole('owner', 'staff', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const staffId = req.params.staffId;
  if (!isValidId(staffId)) {
    return res.status(400).json({ error: 'Invalid staffId' });
  }

  // Staff can only see their own stats
  if (req.user?.role === 'staff' && staffId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const scope = appointmentScope(req.user);
  if (!scope) {
    return res.status(403).json({ error: 'No salon associated with this account' });
  }

  const query = { ...scope, staff_id: staffId };
  await purgeCanceledAppointments(query);
  await autoCompletePastAppointments(query);

  const today = getTunisNow().dateKey;
  const appointments = await Appointment.find(query);

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

appointmentsRouter.get('/:id', requireAuth, requireRole('owner', 'staff', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const scope = appointmentScope(req.user);
  if (!scope || !isValidId(req.params.id)) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  const appointment = await Appointment.findOne({ ...scope, _id: req.params.id })
    .populate('service_id')
    .populate('staff_id', 'fullName email specialty');
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  return res.json({ appointment });
});
