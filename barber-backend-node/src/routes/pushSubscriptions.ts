import { Router, Response } from 'express';
import { PushSubscription } from '../models/PushSubscription.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const pushSubscriptionsRouter = Router();

pushSubscriptionsRouter.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { endpoint, p256dh, auth, userAgent } = req.body as {
    endpoint?: string;
    p256dh?: string;
    auth?: string;
    userAgent?: string;
  };

  if (!endpoint || !p256dh || !auth) {
    return res.status(400).json({ error: 'endpoint, p256dh, and auth are required' });
  }

  const subscription = await PushSubscription.findOneAndUpdate(
    { endpoint },
    {
      user_id: req.user?.id,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent,
      last_used_at: new Date()
    },
    { upsert: true, new: true }
  );

  return res.status(201).json({ subscription });
});
