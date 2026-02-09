import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.js';
import { salonsRouter } from './routes/salons.js';
import { servicesRouter } from './routes/services.js';
import { pushSubscriptionsRouter } from './routes/pushSubscriptions.js';
import { staffRouter } from './routes/staff.js';
import { appointmentsRouter } from './routes/appointments.js';
import { notificationsRouter } from './routes/notifications.js';
import { adminRouter } from './routes/admin.js';

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true
    })
  );
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/salons', salonsRouter);
  app.use('/api/services', servicesRouter);
  app.use('/api/push-subscriptions', pushSubscriptionsRouter);
  app.use('/api/staff', staffRouter);
  app.use('/api/appointments', appointmentsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/admin', adminRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
};
