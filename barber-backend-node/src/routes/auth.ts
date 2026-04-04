import { Router, Request, Response } from 'express';
import { User } from '../models/User.js';
import { Salon } from '../models/Salon.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const authRouter = Router();

type LoginAttempt = {
  failures: number;
  lockUntil?: number;
};

const loginAttempts = new Map<string, LoginAttempt>();

const getClientIp = (req: Request) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0]?.trim() || req.ip || 'unknown';
  }
  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0] || req.ip || 'unknown';
  }
  return req.ip || 'unknown';
};

const getLoginKey = (req: Request, email: string) => `${getClientIp(req)}:${email.toLowerCase()}`;

const getLockoutMs = () => env.authLockoutMinutes * 60 * 1000;

const getRetryAfterSeconds = (lockUntil?: number) => {
  if (!lockUntil) return 0;
  return Math.max(1, Math.ceil((lockUntil - Date.now()) / 1000));
};

const clearAttempt = (key: string) => {
  loginAttempts.delete(key);
};

const registerFailure = (key: string) => {
  const current = loginAttempts.get(key) ?? { failures: 0 };
  current.failures += 1;

  if (current.failures >= env.authMaxAttempts) {
    current.failures = 0;
    current.lockUntil = Date.now() + getLockoutMs();
  }

  loginAttempts.set(key, current);
  return current;
};

const activeLock = (key: string) => {
  const attempt = loginAttempts.get(key);
  if (!attempt?.lockUntil) {
    return null;
  }

  if (Date.now() >= attempt.lockUntil) {
    loginAttempts.delete(key);
    return null;
  }

  return attempt;
};

authRouter.post('/register', async (req: Request, res: Response) => {
  if (env.nodeEnv === 'production' && !env.allowPublicRegistration) {
    return res.status(403).json({ error: 'Self-registration is disabled' });
  }

  const { email, password, salonId, fullName } = req.body as {
    email?: string;
    password?: string;
    salonId?: string;
    fullName?: string;
  };

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (password.length < 10) {
    return res.status(400).json({ error: 'Password must be at least 10 characters long' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    role: 'owner',
    salonId,
    fullName,
    isSuperAdmin: false
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

  const normalizedEmail = email.toLowerCase();
  const loginKey = getLoginKey(req, normalizedEmail);
  const lock = activeLock(loginKey);

  if (lock?.lockUntil) {
    const retryAfter = getRetryAfterSeconds(lock.lockUntil);
    logger.warn('Blocked login attempt due to lockout', { email: normalizedEmail, ip: getClientIp(req), retryAfter }, 'AUTH');
    res.setHeader('Retry-After', retryAfter.toString());
    return res.status(429).json({ error: 'Too many failed attempts. Try again later.' });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    registerFailure(loginKey);
    logger.warn('Failed login: unknown email', { email: normalizedEmail, ip: getClientIp(req) }, 'AUTH');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    const attempt = registerFailure(loginKey);
    logger.warn('Failed login: invalid password', { email: normalizedEmail, ip: getClientIp(req), failures: attempt.failures }, 'AUTH');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  clearAttempt(loginKey);
  logger.info('Successful login', { email: normalizedEmail, role: user.role, ip: getClientIp(req) }, 'AUTH');

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
