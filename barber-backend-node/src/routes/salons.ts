import { Router } from 'express';
import { Salon } from '../models/Salon.js';
import { requireAuth, requireRole, AuthRequest, canAccessSalon, isValidId } from '../middleware/auth.js';

export const salonsRouter = Router();

// Fields that are only meant for the platform admin console, never for public salon pages
const PRIVATE_SALON_FIELDS = ['owner_email', 'total_revenue', 'subscription_plan'] as const;

const toPublicSalon = (salon: InstanceType<typeof Salon>) => {
  const salonObj: Record<string, unknown> = salon.toObject();
  for (const field of PRIVATE_SALON_FIELDS) {
    delete salonObj[field];
  }
  return {
    ...salonObj,
    id: salonObj._id?.toString() || salon.id
  };
};

salonsRouter.get('/slug/:slug', async (req, res) => {
  const salon = await Salon.findOne({ slug: String(req.params.slug) });
  if (!salon) {
    return res.status(404).json({ error: 'Salon not found' });
  }
  return res.json({ salon: toPublicSalon(salon) });
});

salonsRouter.get('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(404).json({ error: 'Salon not found' });
  }
  const salon = await Salon.findById(req.params.id);
  if (!salon) {
    return res.status(404).json({ error: 'Salon not found' });
  }
  return res.json({ salon: toPublicSalon(salon) });
});

salonsRouter.patch('/:id', requireAuth, requireRole('owner', 'super_admin'), async (req: AuthRequest, res) => {
  const allowedUpdates = [
    'name',
    'address',
    'city',
    'country',
    'contact_phone',
    'contact_email',
    'logo_url',
    'opening_time',
    'closing_time',
    'open_days',
    'latitude',
    'longitude'
  ] as const;

  const requestedEntries = Object.entries(req.body ?? {}).filter(([key]) =>
    allowedUpdates.includes(key as (typeof allowedUpdates)[number])
  );

  if (requestedEntries.length === 0) {
    return res.status(400).json({ error: 'No valid update fields provided' });
  }

  if (!isValidId(req.params.id)) {
    return res.status(404).json({ error: 'Salon not found' });
  }

  const updates = Object.fromEntries(requestedEntries);
  const salon = await Salon.findById(req.params.id);

  if (!salon) {
    return res.status(404).json({ error: 'Salon not found' });
  }

  // Owners can only edit their own salon; super admins can edit any salon
  if (!canAccessSalon(req.user, salon.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const updatedSalon = await Salon.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });

  if (!updatedSalon) {
    return res.status(404).json({ error: 'Salon not found' });
  }

  const salonObj = updatedSalon.toObject();
  return res.json({
    salon: {
      ...salonObj,
      id: salonObj._id?.toString() || updatedSalon.id
    }
  });
});
