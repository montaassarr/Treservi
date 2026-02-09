import { Router, Request, Response } from 'express';
import { User } from '../models/User.js';
import { hashPassword } from '../utils/password.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const staffRouter = Router();

staffRouter.get('/public', async (req: Request, res: Response) => {
  const salonId = req.query.salonId as string | undefined;
  if (!salonId) {
    return res.status(400).json({ error: 'salonId is required' });
  }

  const staff = await User.find({ salonId, role: 'staff' })
    .select('fullName specialty avatarUrl')
    .sort({ createdAt: -1 });

  const sanitized = staff.map((member) => ({
    id: member.id,
    fullName: member.fullName ?? '',
    specialty: member.specialty ?? '',
    avatarUrl: member.avatarUrl ?? ''
  }));

  return res.json({ staff: sanitized });
});

staffRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const salonId = (req.query.salonId as string | undefined) ?? req.user?.salonId;
  if (!salonId) {
    return res.status(400).json({ error: 'salonId is required' });
  }

  const staff = await User.find({ salonId, role: 'staff' }).sort({ createdAt: -1 });
  return res.json({ staff });
});

staffRouter.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const staff = await User.findById(req.params.id);
  if (!staff || staff.role !== 'staff') {
    return res.status(404).json({ error: 'Staff not found' });
  }
  return res.json({ staff });
});

staffRouter.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { email, password, fullName, salonId, phone, specialty, avatarUrl } = req.body as {
    email?: string;
    password?: string;
    fullName?: string;
    salonId?: string;
    phone?: string;
    specialty?: string;
    avatarUrl?: string;
  };

  const targetSalonId = salonId ?? req.user?.salonId;
  if (!email || !password || !targetSalonId) {
    return res.status(400).json({ error: 'email, password, and salonId are required' });
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
    salonId: targetSalonId,
    fullName,
    phone,
    specialty,
    avatarUrl
  });

  return res.status(201).json({ staff });
});

staffRouter.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const updates = req.body as Partial<{ fullName: string; phone: string; specialty: string; avatarUrl: string }>;
  const staff = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!staff || staff.role !== 'staff') {
    return res.status(404).json({ error: 'Staff not found' });
  }
  return res.json({ staff });
});

staffRouter.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const staff = await User.findByIdAndDelete(req.params.id);
  if (!staff || staff.role !== 'staff') {
    return res.status(404).json({ error: 'Staff not found' });
  }
  return res.json({ deleted: true });
});
