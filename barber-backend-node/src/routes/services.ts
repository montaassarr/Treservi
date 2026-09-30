import { Router, Request, Response } from 'express';
import { Service } from '../models/Service.js';
import {
  requireAuth,
  requireRole,
  AuthRequest,
  canAccessSalon,
  isValidId,
  pickFields,
  resolveSalonId
} from '../middleware/auth.js';

export const servicesRouter = Router();

const SERVICE_UPDATABLE_FIELDS = ['name', 'price', 'duration', 'description', 'is_active'] as const;

/** Loads a service only if it belongs to a salon the caller can manage. */
const findManageableService = async (req: AuthRequest, id: string) => {
  if (!isValidId(id)) return null;
  const service = await Service.findById(id);
  if (!service || !canAccessSalon(req.user, service.salon_id)) return null;
  return service;
};

servicesRouter.get('/', async (req: Request, res: Response) => {
  const salonId = req.query.salonId;
  if (!salonId) {
    return res.status(400).json({ error: 'salonId is required' });
  }
  if (!isValidId(salonId)) {
    return res.status(400).json({ error: 'Invalid salonId' });
  }

  const services = await Service.find({ salon_id: salonId, is_active: true }).sort({ name: 1 });
  return res.json({ services });
});

servicesRouter.get('/:id', async (req: Request, res: Response) => {
  if (!isValidId(req.params.id)) {
    return res.status(404).json({ error: 'Service not found' });
  }
  const service = await Service.findById(req.params.id);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  return res.json({ service });
});

servicesRouter.post('/', requireAuth, requireRole('owner', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const { salonId, name, price, duration, description } = req.body as {
    salonId?: string;
    name?: string;
    price?: number;
    duration?: number;
    description?: string;
  };

  if (!name || typeof price !== 'number' || typeof duration !== 'number') {
    return res.status(400).json({ error: 'salonId, name, price, and duration are required' });
  }

  const resolved = resolveSalonId(req.user, salonId);
  if (!resolved.ok) {
    return res.status(resolved.status).json({ error: resolved.error });
  }

  const service = await Service.create({
    salon_id: resolved.salonId,
    name,
    price,
    duration,
    description,
    is_active: true
  });

  return res.status(201).json({ service });
});

servicesRouter.patch('/:id', requireAuth, requireRole('owner', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const updates = pickFields(req.body, SERVICE_UPDATABLE_FIELDS);
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid update fields provided' });
  }

  const existing = await findManageableService(req, req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Service not found' });
  }

  const service = await Service.findByIdAndUpdate(existing._id, { $set: updates }, { new: true, runValidators: true });
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  return res.json({ service });
});

servicesRouter.delete('/:id', requireAuth, requireRole('owner', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const existing = await findManageableService(req, req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Service not found' });
  }

  const service = await Service.findByIdAndUpdate(existing._id, { is_active: false }, { new: true });
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  return res.json({ service });
});

servicesRouter.delete('/:id/hard', requireAuth, requireRole('owner', 'super_admin'), async (req: AuthRequest, res: Response) => {
  const existing = await findManageableService(req, req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Service not found' });
  }

  await Service.deleteOne({ _id: existing._id });
  return res.json({ deleted: true });
});
