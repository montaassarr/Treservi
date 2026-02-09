import { Router, Request, Response } from 'express';
import { Service } from '../models/Service.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const servicesRouter = Router();

servicesRouter.get('/', async (req: Request, res: Response) => {
  const salonId = req.query.salonId as string | undefined;
  if (!salonId) {
    return res.status(400).json({ error: 'salonId is required' });
  }

  const services = await Service.find({ salon_id: salonId, is_active: true }).sort({ name: 1 });
  return res.json({ services });
});

servicesRouter.get('/:id', async (req: Request, res: Response) => {
  const service = await Service.findById(req.params.id);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  return res.json({ service });
});

servicesRouter.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { salonId, name, price, duration, description } = req.body as {
    salonId?: string;
    name?: string;
    price?: number;
    duration?: number;
    description?: string;
  };

  if (!salonId || !name || typeof price !== 'number' || typeof duration !== 'number') {
    return res.status(400).json({ error: 'salonId, name, price, and duration are required' });
  }

  const service = await Service.create({
    salon_id: salonId,
    name,
    price,
    duration,
    description,
    is_active: true
  });

  return res.status(201).json({ service });
});

servicesRouter.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const updates = req.body as Partial<{ name: string; price: number; duration: number; description: string; is_active: boolean }>;
  const service = await Service.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  return res.json({ service });
});

servicesRouter.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const service = await Service.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true });
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  return res.json({ service });
});

servicesRouter.delete('/:id/hard', requireAuth, async (req: AuthRequest, res: Response) => {
  const service = await Service.findByIdAndDelete(req.params.id);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  return res.json({ deleted: true });
});
