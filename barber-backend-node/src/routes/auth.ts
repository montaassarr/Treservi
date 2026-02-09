import { Router, Request, Response } from 'express';
import { User } from '../models/User.js';
import { Salon } from '../models/Salon.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', async (req: Request, res: Response) => {
  const { email, password, salonId, role, fullName } = req.body as {
    email?: string;
    password?: string;
    salonId?: string;
    role?: 'owner' | 'staff' | 'super_admin';
    fullName?: string;
  };

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    role: role ?? 'owner',
    salonId,
    fullName,
    isSuperAdmin: role === 'super_admin'
  });

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    salonId: user.salonId?.toString(),
    isSuperAdmin: user.isSuperAdmin
  });

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      salonId: user.salonId?.toString(),
      isSuperAdmin: user.isSuperAdmin,
      fullName: user.fullName ?? ''
    }
  });
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    salonId: user.salonId?.toString(),
    isSuperAdmin: user.isSuperAdmin
  });

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      salonId: user.salonId?.toString(),
      isSuperAdmin: user.isSuperAdmin,
      fullName: user.fullName ?? ''
    }
  });
});

authRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user?.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  let salonSlug: string | undefined;
  if (user.salonId) {
    const salon = await Salon.findById(user.salonId);
    salonSlug = salon?.slug;
  }

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      salonId: user.salonId?.toString(),
      isSuperAdmin: user.isSuperAdmin,
      fullName: user.fullName ?? '',
      salonSlug
    }
  });
});
