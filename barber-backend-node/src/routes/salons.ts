import { Router } from 'express';
import { Salon } from '../models/Salon.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const salonsRouter = Router();

salonsRouter.get('/slug/:slug', async (req, res) => {
  const salon = await Salon.findOne({ slug: req.params.slug });
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

salonsRouter.get('/:id', async (req, res) => {
  const salon = await Salon.findById(req.params.id);
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

salonsRouter.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
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

  const updates = Object.fromEntries(requestedEntries);
  const salon = await Salon.findById(req.params.id);

  if (!salon) {
    return res.status(404).json({ error: 'Salon not found' });
  }

  const isSuperAdmin = req.user?.role === 'super_admin' || req.user?.isSuperAdmin;
  const isOwnerOfSalon = req.user?.role === 'owner' && req.user?.salonId === salon.id;

  if (!isSuperAdmin && !isOwnerOfSalon) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const updatedSalon = await Salon.findByIdAndUpdate(req.params.id, updates, { new: true });

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
