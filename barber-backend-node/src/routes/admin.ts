import { Router, Response } from 'express';
import { Salon } from '../models/Salon.js';
import { User } from '../models/User.js';
import { Appointment } from '../models/Appointment.js';
import { hashPassword } from '../utils/password.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const adminRouter = Router();

const requireSuperAdmin = (req: AuthRequest, res: Response) => {
  if (!req.user?.isSuperAdmin) {
    res.status(403).json({ error: 'Super admin access required' });
    return false;
  }
  return true;
};

adminRouter.get('/overview', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;

  const [totalSalons, activeSalons] = await Promise.all([
    Salon.countDocuments(),
    Salon.countDocuments({ status: 'active' })
  ]);

  const revenueAgg = await Salon.aggregate([{ $group: { _id: null, total: { $sum: '$total_revenue' } } }]);
  const totalRevenue = revenueAgg[0]?.total ?? 0;

  return res.json({ stats: { totalSalons, activeSalons, totalRevenue } });
});

adminRouter.get('/salons', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;

  const salons = await Salon.find().sort({ created_at: -1 });
  const enriched = await Promise.all(
    salons.map(async (salon) => {
      const [staffCount, appointmentCount, owner] = await Promise.all([
        User.countDocuments({ salonId: salon.id, role: 'staff' }),
        Appointment.countDocuments({ salon_id: salon.id }),
        User.findOne({ salonId: salon.id, role: 'owner' }).select('email fullName')
      ]);

      const salonObj = salon.toObject();
      return {
        ...salonObj,
        id: salonObj._id?.toString() || salon.id,
        staff_count: staffCount,
        appointment_count: appointmentCount,
        owner_email: owner?.email ?? salon.owner_email,
        owner_name: owner?.fullName ?? ''
      };
    })
  );

  return res.json({ salons: enriched });
});

adminRouter.post('/salons', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;

  const { name, slug, ownerEmail, ownerPassword, ownerName } = req.body as {
    name?: string;
    slug?: string;
    ownerEmail?: string;
    ownerPassword?: string;
    ownerName?: string;
  };

  if (!name || !slug || !ownerEmail || !ownerPassword) {
    return res.status(400).json({ error: 'name, slug, ownerEmail, ownerPassword are required' });
  }

  const existing = await Salon.findOne({ slug });
  if (existing) {
    return res.status(409).json({ error: 'Salon slug already exists' });
  }

  const salon = await Salon.create({
    name,
    slug,
    owner_email: ownerEmail.toLowerCase(),
    status: 'active',
    subscription_plan: 'basic'
  });

  const passwordHash = await hashPassword(ownerPassword);
  await User.create({
    email: ownerEmail.toLowerCase(),
    passwordHash,
    role: 'owner',
    salonId: salon.id,
    fullName: ownerName
  });

  const salonObj = salon.toObject();
  return res.status(201).json({ 
    salon: {
      ...salonObj,
      id: salonObj._id?.toString() || salon.id
    }
  });
});

adminRouter.patch('/salons/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;

  const updates = req.body as Partial<{ name: string; slug: string; status: 'active' | 'suspended' | 'cancelled' }>;

  if (!updates.name && !updates.slug && !updates.status) {
    return res.status(400).json({ error: 'name, slug, or status is required' });
  }

  if (updates.slug) {
    const existing = await Salon.findOne({ slug: updates.slug, _id: { $ne: req.params.id } });
    if (existing) {
      return res.status(409).json({ error: 'Salon slug already exists' });
    }
  }

  const salon = await Salon.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!salon) {
    return res.status(404).json({ error: 'Salon not found' });
  }

  const salonObj = salon.toObject();
  return res.json({ 
    salon: {
      ...salonObj,
      id: salonObj._id?.toString() || salon.id
    }
  });
});

adminRouter.patch('/salons/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;

  const { status } = req.body as { status?: 'active' | 'suspended' | 'cancelled' };
  if (!status) {
    return res.status(400).json({ error: 'status is required' });
  }

  const salon = await Salon.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!salon) {
    return res.status(404).json({ error: 'Salon not found' });
  }

  const salonObj = salon.toObject();
  return res.json({ 
    salon: {
      ...salonObj,
      id: salonObj._id?.toString() || salon.id
    }
  });
});

adminRouter.delete('/salons/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;

  const salon = await Salon.findByIdAndDelete(req.params.id);
  if (!salon) {
    return res.status(404).json({ error: 'Salon not found' });
  }

  await User.deleteMany({ salonId: salon.id });
  await Appointment.deleteMany({ salon_id: salon.id });

  return res.json({ deleted: true });
});

adminRouter.post('/salons/:id/reset-owner-password', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!requireSuperAdmin(req, res)) return;

  const { newPassword } = req.body as { newPassword?: string };
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'newPassword (min 6 chars) is required' });
  }

  const owner = await User.findOne({ salonId: req.params.id, role: 'owner' });
  if (!owner) {
    return res.status(404).json({ error: 'Owner not found' });
  }

  owner.passwordHash = await hashPassword(newPassword);
  await owner.save();

  return res.json({ updated: true, ownerEmail: owner.email });
});
