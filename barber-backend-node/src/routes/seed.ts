import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Salon } from '../models/Salon.js';
import { User } from '../models/User.js';
import { hashPassword } from '../utils/password.js';

export const seedRouter = Router();

// 🌱 Seed database with initial data
seedRouter.post('/init', async (req, res) => {
  try {
    console.log('🌱 Starting database seed...');

    // Create salon
    const existingSalon = await Salon.findOne({ slug: env.seedSalonSlug });
    let salon = existingSalon;

    if (!existingSalon) {
      salon = await Salon.create({
        name: env.seedSalonName,
        slug: env.seedSalonSlug,
        owner_email: env.seedAdminEmail,
        status: 'active',
        subscription_plan: 'basic'
      });
      console.log('✅ Salon created:', salon.name);
    } else {
      console.log('✅ Salon already exists:', salon?.name);
    }

    // Create admin user (as super admin for full access)
    const existingUser = await User.findOne({ email: env.seedAdminEmail.toLowerCase() });
    if (!existingUser) {
      const passwordHash = await hashPassword(env.seedAdminPassword);
      const user = await User.create({
        email: env.seedAdminEmail.toLowerCase(),
        passwordHash,
        role: 'super_admin',
        isSuperAdmin: true,
        salonId: salon?.id,
        fullName: 'Owner Admin (Super Admin)'
      });
      console.log('✅ Admin user created as super admin:', user.email);
    } else {
      // Update existing user to super admin if not already
      if (!existingUser.isSuperAdmin) {
        existingUser.role = 'super_admin';
        existingUser.isSuperAdmin = true;
        await existingUser.save();
        console.log('✅ Updated existing user to super admin:', existingUser.email);
      } else {
        console.log('✅ Admin user already exists as super admin:', existingUser.email);
      }
    }

    // Create super admin
    const superAdminEmail = 'superadmin@barbershop.com';
    const existingSuperAdmin = await User.findOne({ email: superAdminEmail.toLowerCase() });
    if (!existingSuperAdmin) {
      const superHash = await hashPassword('SuperAdmin123!');
      const superAdmin = await User.create({
        email: superAdminEmail.toLowerCase(),
        passwordHash: superHash,
        role: 'super_admin',
        isSuperAdmin: true,
        fullName: 'Super Admin'
      });
      console.log('✅ Super admin created:', superAdmin.email);
    } else {
      console.log('✅ Super admin already exists:', existingSuperAdmin.email);
    }

    res.status(201).json({
      status: 'success',
      message: 'Database seeded successfully',
      data: {
        salon: salon?.name,
        users: [
          { email: 'owner@barbershop.com', role: 'super_admin', note: 'Use this for full admin access' },
          { email: 'superadmin@barbershop.com', role: 'super_admin', note: 'Alternative super admin' }
        ],
        credentials: {
          email: 'owner@barbershop.com',
          password: 'ChangeMe123!',
          access: 'Full super admin access to admin dashboard'
        }
      }
    });
  } catch (error) {
    console.error('❌ Seed error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to seed database',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ✅ Check seed status
seedRouter.get('/status', async (req, res) => {
  try {
    const adminExists = await User.findOne({ email: env.seedAdminEmail.toLowerCase() });
    const salonExists = await Salon.findOne({ slug: env.seedSalonSlug });
    const userCount = await User.countDocuments();

    res.json({
      status: 'ok',
      seeded: !!adminExists && !!salonExists,
      data: {
        adminUser: adminExists ? 'exists' : 'missing',
        salon: salonExists ? 'exists' : 'missing',
        totalUsers: userCount,
        totalSalons: await Salon.countDocuments()
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to check seed status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
