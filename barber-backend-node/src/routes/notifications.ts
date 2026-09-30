import { Router, Response } from 'express';
import { Appointment } from '../models/Appointment.js';
import {
  requireAuth,
  requireRole,
  AuthRequest,
  canAccessSalon,
  isSuperAdminUser,
  isValidId,
  resolveSalonId
} from '../middleware/auth.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth, requireRole('owner', 'staff', 'super_admin'));

/**
 * Builds the unread-appointments filter for the caller.
 * The salon always comes from the token for owners/staff, and staff only ever see their own appointments.
 */
const buildUnreadQuery = (req: AuthRequest, input: { salonId?: unknown; staffId?: unknown; role?: unknown }) => {
  const resolved = resolveSalonId(req.user, input.salonId);
  if (!resolved.ok) {
    return resolved;
  }

  const query: Record<string, unknown> = { salon_id: resolved.salonId, is_read: false };
  if (req.user?.role === 'staff' && !isSuperAdminUser(req.user)) {
    query.staff_id = req.user.id;
  } else if (input.role === 'staff' && isValidId(input.staffId)) {
    query.staff_id = input.staffId;
  }

  return { ok: true as const, query };
};

notificationsRouter.get('/unread-count', async (req: AuthRequest, res: Response) => {
  const result = buildUnreadQuery(req, {
    salonId: req.query.salonId,
    staffId: req.query.staffId,
    role: req.query.role
  });
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }

  const count = await Appointment.countDocuments(result.query);
  return res.json({ count });
});

notificationsRouter.post('/mark-all-read', async (req: AuthRequest, res: Response) => {
  const { salonId, staffId, role } = (req.body ?? {}) as {
    salonId?: string;
    staffId?: string;
    role?: 'owner' | 'staff';
  };

  const result = buildUnreadQuery(req, { salonId, staffId, role });
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }

  await Appointment.updateMany(result.query, { is_read: true });
  return res.json({ updated: true });
});

notificationsRouter.post('/mark-read/:id', async (req: AuthRequest, res: Response) => {
  if (!isValidId(req.params.id)) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  const existing = await Appointment.findById(req.params.id).select('salon_id');
  if (!existing || !canAccessSalon(req.user, existing.salon_id)) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  const appointment = await Appointment.findByIdAndUpdate(existing._id, { is_read: true }, { new: true });
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  return res.json({ appointment });
});
