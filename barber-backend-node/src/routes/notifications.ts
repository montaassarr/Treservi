import { Router, Response } from 'express';
import { Appointment } from '../models/Appointment.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const notificationsRouter = Router();

notificationsRouter.get('/unread-count', requireAuth, async (req: AuthRequest, res: Response) => {
  const salonId = req.query.salonId as string | undefined;
  const staffId = req.query.staffId as string | undefined;
  const role = req.query.role as 'owner' | 'staff' | undefined;

  if (!salonId || !role) {
    return res.status(400).json({ error: 'salonId and role are required' });
  }

  const query: Record<string, unknown> = { salon_id: salonId, is_read: false };
  if (role === 'staff' && staffId) {
    query.staff_id = staffId;
  }

  const count = await Appointment.countDocuments(query);
  return res.json({ count });
});

notificationsRouter.post('/mark-all-read', requireAuth, async (req: AuthRequest, res: Response) => {
  const { salonId, staffId, role } = req.body as {
    salonId?: string;
    staffId?: string;
    role?: 'owner' | 'staff';
  };

  if (!salonId || !role) {
    return res.status(400).json({ error: 'salonId and role are required' });
  }

  const query: Record<string, unknown> = { salon_id: salonId, is_read: false };
  if (role === 'staff' && staffId) {
    query.staff_id = staffId;
  }

  await Appointment.updateMany(query, { is_read: true });
  return res.json({ updated: true });
});

notificationsRouter.post('/mark-read/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const appointment = await Appointment.findByIdAndUpdate(req.params.id, { is_read: true }, { new: true });
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  return res.json({ appointment });
});
