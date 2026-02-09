import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'owner' | 'staff' | 'super_admin';
    salonId?: string;
    isSuperAdmin?: boolean;
  };
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
