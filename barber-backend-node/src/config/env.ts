import dotenv from 'dotenv';

dotenv.config();

const getEnv = (key: string, fallback?: string) => {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT) || 10000,
  mongoUri: getEnv('MONGODB_URI', 'mongodb://localhost:27017/reservi'),
  jwtSecret: getEnv('JWT_SECRET', 'change-me'),
  jwtExpiresIn: '7d',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? 'owner@barbershop.com',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!',
  seedSalonName: process.env.SEED_SALON_NAME ?? 'Demo Salon',
  seedSalonSlug: process.env.SEED_SALON_SLUG ?? 'demo-salon',
  seedSuperAdminEmail: process.env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@barbershop.com',
  seedSuperAdminPassword: process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!'
};
