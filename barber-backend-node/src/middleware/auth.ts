import { Request, Response, NextFunction } from 'express';
import { isValidObjectId } from 'mongoose';
import { verifyToken } from '../utils/jwt.js';

export type UserRole = 'owner' | 'staff' | 'super_admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  salonId?: string;
  isSuperAdmin?: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const token = header.replace('Bearer ', '');
  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      salonId: payload.salonId,
      isSuperAdmin: payload.isSuperAdmin
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const isSuperAdminUser = (user?: AuthUser) =>
  Boolean(user && (user.role === 'super_admin' || user.isSuperAdmin === true));

/**
 * Allows the request through only if the authenticated user has one of the given roles.
 * Super admins are accepted whenever 'super_admin' is listed.
 * Must be used after requireAuth.
 */
export const requireRole =
  (...roles: UserRole[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    const allowed = roles.includes(user.role) || (roles.includes('super_admin') && isSuperAdminUser(user));
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };

export const requireSuperAdmin = requireRole('super_admin');

export const isValidId = (value: unknown): value is string =>
  typeof value === 'string' && isValidObjectId(value);

export type SalonResolution =
  | { ok: true; salonId: string }
  | { ok: false; status: number; error: string };

/**
 * Resolves the salon a request is allowed to act on.
 * - owners and staff are always pinned to their own salon; a different requested salon is rejected
 * - super admins may target any salon (falling back to their own salonId if they have one)
 */
export const resolveSalonId = (user: AuthUser | undefined, requested?: unknown): SalonResolution => {
  if (requested !== undefined && requested !== null && requested !== '' && !isValidId(requested)) {
    return { ok: false, status: 400, error: 'Invalid salonId' };
  }
  const requestedId = typeof requested === 'string' && requested ? requested : undefined;

  if (isSuperAdminUser(user)) {
    const salonId = requestedId ?? user?.salonId;
    if (!salonId) {
      return { ok: false, status: 400, error: 'salonId is required' };
    }
    return { ok: true, salonId };
  }

  if (!user?.salonId) {
    return { ok: false, status: 403, error: 'No salon associated with this account' };
  }

  if (requestedId && requestedId !== user.salonId) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  return { ok: true, salonId: user.salonId };
};

/** True if the user may act on resources belonging to the given salon. */
export const canAccessSalon = (user: AuthUser | undefined, salonId: unknown) => {
  if (!user) return false;
  if (isSuperAdminUser(user)) return true;
  return Boolean(user.salonId) && String(salonId ?? '') === user.salonId;
};

/** Copies only the whitelisted keys that are present in the body. */
export const pickFields = <K extends string>(body: unknown, allowed: readonly K[]) => {
  const source = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const result: Partial<Record<K, unknown>> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
};
