import { Router } from 'express';
import { Salon } from '../models/Salon.js';

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
