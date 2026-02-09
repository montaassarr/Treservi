import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: 'owner' | 'staff' | 'super_admin';
  salonId?: string;
  isSuperAdmin?: boolean;
}

export const signToken = (payload: AuthTokenPayload) => {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
};
