import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { signToken } from '../utils/jwt.js';

let mongoServer: MongoMemoryServer | undefined;

export const startTestDb = async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
};

export const stopTestDb = async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
};

export const clearTestDb = async () => {
  const collections = await mongoose.connection.db?.collections();
  await Promise.all((collections ?? []).map((collection) => collection.deleteMany({})));
};

type TokenUser = {
  id: string;
  email: string;
  role: 'owner' | 'staff' | 'super_admin';
  salonId?: unknown;
  isSuperAdmin?: boolean;
};

export const authHeader = (user: TokenUser) =>
  `Bearer ${signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    salonId: user.salonId ? String(user.salonId) : undefined,
    isSuperAdmin: Boolean(user.isSuperAdmin)
  })}`;

/** A YYYY-MM-DD date a few days in the future, safe for public booking tests. */
export const futureDateKey = () => {
  const date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
};
