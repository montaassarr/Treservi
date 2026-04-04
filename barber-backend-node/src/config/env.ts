import dotenv from 'dotenv';

dotenv.config();

const getEnv = (key: string, fallback?: string) => {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const getRequiredEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}. Set it to your MongoDB Atlas connection string.`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT) || 4000,
  mongoUri: getRequiredEnv('MONGODB_URI'),
  jwtSecret: getEnv('JWT_SECRET', 'change-me'),
  jwtExpiresIn: '7d',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  allowPublicRegistration: process.env.ALLOW_PUBLIC_REGISTRATION === 'true',
  enableSeedRoutes:
    process.env.ENABLE_SEED_ROUTES === 'true' ||
    (process.env.NODE_ENV ?? 'development') !== 'production',
  authMaxAttempts: Number(process.env.AUTH_MAX_ATTEMPTS) || 5,
  authLockoutMinutes: Number(process.env.AUTH_LOCKOUT_MINUTES) || 15,
  superAdminApiBasePath: process.env.SUPERADMIN_API_BASE_PATH ?? '/api/sa-ops-8mK2r4',
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? 'owner@barbershop.com',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!',
  seedSalonName: process.env.SEED_SALON_NAME ?? 'Demo Salon',
  seedSalonSlug: process.env.SEED_SALON_SLUG ?? 'demo-salon',
  seedSuperAdminEmail: process.env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@barbershop.com',
  seedSuperAdminPassword: process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!',
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? process.env.VITE_VAPID_PUBLIC_KEY ?? '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
  vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:admin@treservi.app'
};

if (env.nodeEnv === 'production' && env.jwtSecret === 'change-me') {
  throw new Error('In production, JWT_SECRET must be set to a strong value.');
}
