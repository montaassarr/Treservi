import { Router, Response } from 'express';
import { PushSubscription } from '../models/PushSubscription.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { sendPushToUser } from '../services/pushNotifications.js';

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

pushSubscriptionsRouter.post('/test', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body as {
    title?: string;
    message?: string;
    url?: string;
  };

  const result = await sendPushToUser(req.user.id, {
    title: body.title ?? 'Treservi Test Notification',
    body: body.message ?? 'Push delivery is working on this device.',
    url: body.url ?? '/dashboard',
    tag: 'test-notification'
  });

  return res.json({
    ok: true,
    result
  });
});
