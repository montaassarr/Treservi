import { Router, Request, Response } from 'express';
import { User } from '../models/User.js';
import { hashPassword } from '../utils/password.js';
import {
  requireAuth,
  requireRole,
  AuthRequest,
  canAccessSalon,
  isValidId,
  pickFields,
  resolveSalonId
} from '../middleware/auth.js';

export const staffRouter = Router();

const STAFF_UPDATABLE_FIELDS = ['fullName', 'phone', 'specialty', 'avatarUrl'] as const;

const salonMembersFilter = (salonId: string) => ({
  salonId,
  $or: [
    { role: 'staff' },
    { role: 'owner' },
    { role: 'super_admin', salonId: { $exists: true } }
  ]
});

/** Loads a staff member only if it belongs to a salon the caller can manage. */
const findManageableStaff = async (req: AuthRequest, id: string) => {
  if (!isValidId(id)) return null;
  const staff = await User.findOne({ _id: id, role: 'staff' });
  if (!staff || !canAccessSalon(req.user, staff.salonId)) return null;
  return staff;
};

staffRouter.get('/public', async (req: Request, res: Response) => {
  const salonId = req.query.salonId;
  if (!salonId) {
    return res.status(400).json({ error: 'salonId is required' });
  }
  if (!isValidId(salonId)) {
    return res.status(400).json({ error: 'Invalid salonId' });
  }

  // Get staff members AND salon owner (who also cuts hair)
  const staff = await User.find(salonMembersFilter(salonId))
    .select('fullName specialty avatarUrl role')
    .sort({ createdAt: -1 });

  const sanitized = staff.map((member) => ({
    id: member.id,
    fullName: member.fullName ?? '',
    specialty: member.specialty ?? 'Barber',
    avatarUrl: member.avatarUrl ?? '',
    role: member.role
  }));

  return res.json({ staff: sanitized });
});

staffRouter.get('/', requireAuth, requireRole('owner', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const resolved = resolveSalonId(req.user, req.query.salonId);
  if (!resolved.ok) {
    return res.status(resolved.status).json({ error: resolved.error });
  }

  // Include staff members AND salon owner
  const staff = await User.find(salonMembersFilter(resolved.salonId)).sort({ createdAt: -1 });

  return res.json({ staff });
});

staffRouter.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const isSelf = req.user?.id === req.params.id;
  if (req.user?.role === 'staff' && !isSelf) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const staff = await findManageableStaff(req, req.params.id);
  if (!staff) {
    return res.status(404).json({ error: 'Staff not found' });
  }
  return res.json({ staff });
});

staffRouter.post('/', requireAuth, requireRole('owner', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const { email, password, fullName, salonId, phone, specialty, avatarUrl } = req.body as {
    email?: string;
    password?: string;
    fullName?: string;
    salonId?: string;
    phone?: string;
    specialty?: string;
    avatarUrl?: string;
  };

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(400).json({ error: 'email, password, and salonId are required' });
  }

  const resolved = resolveSalonId(req.user, salonId);
  if (!resolved.ok) {
    return res.status(resolved.status).json({ error: resolved.error });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const passwordHash = await hashPassword(password);
  const staff = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    role: 'staff',
    isSuperAdmin: false,
    salonId: resolved.salonId,
    fullName,
    phone,
    specialty,
    avatarUrl
  });

  return res.status(201).json({ staff });
});

staffRouter.patch('/:id', requireAuth, requireRole('owner', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const updates = pickFields(req.body, STAFF_UPDATABLE_FIELDS);
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid update fields provided' });
  }

  const existing = await findManageableStaff(req, req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Staff not found' });
  }

  const staff = await User.findByIdAndUpdate(existing._id, { $set: updates }, { new: true, runValidators: true });
  if (!staff) {
    return res.status(404).json({ error: 'Staff not found' });
  }
  return res.json({ staff });
});

staffRouter.delete('/:id', requireAuth, requireRole('owner', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const staff = await findManageableStaff(req, req.params.id);
  if (!staff) {
    return res.status(404).json({ error: 'Staff not found' });
  }

  await User.deleteOne({ _id: staff._id, role: 'staff' });
  return res.json({ deleted: true });
});
