import mongoose from 'mongoose';
import { env } from './config/env.js';
import { Salon } from './models/Salon.js';
import { User } from './models/User.js';
import { hashPassword } from './utils/password.js';

const run = async () => {
  await mongoose.connect(env.mongoUri);

  const existingSalon = await Salon.findOne({ slug: env.seedSalonSlug });
  const salon = existingSalon
    ? existingSalon
    : await Salon.create({
        name: env.seedSalonName,
        slug: env.seedSalonSlug,
        owner_email: env.seedAdminEmail,
        status: 'active',
        subscription_plan: 'basic'
      });

  const existingUser = await User.findOne({ email: env.seedAdminEmail.toLowerCase() });
  if (!existingUser) {
    const passwordHash = await hashPassword(env.seedAdminPassword);
    await User.create({
      email: env.seedAdminEmail.toLowerCase(),
      passwordHash,
      role: 'owner',
      salonId: salon.id,
      fullName: 'Owner Admin'
    });
  }

  const existingSuperAdmin = await User.findOne({ email: env.seedSuperAdminEmail.toLowerCase() });
  if (!existingSuperAdmin) {
    const superHash = await hashPassword(env.seedSuperAdminPassword);
    await User.create({
      email: env.seedSuperAdminEmail.toLowerCase(),
      passwordHash: superHash,
      role: 'super_admin',
      isSuperAdmin: true,
      fullName: 'Super Admin'
    });
  }

  console.log('✅ Seed complete');
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
