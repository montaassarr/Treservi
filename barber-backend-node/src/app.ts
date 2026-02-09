import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authRouter } from './routes/auth.js';
import { salonsRouter } from './routes/salons.js';
import { servicesRouter } from './routes/services.js';
import { pushSubscriptionsRouter } from './routes/pushSubscriptions.js';
import { staffRouter } from './routes/staff.js';
import { appointmentsRouter } from './routes/appointments.js';
import { notificationsRouter } from './routes/notifications.js';
import { adminRouter } from './routes/admin.js';
import { seedRouter } from './routes/seed.js';

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true
    })
  );
  app.use(express.json());
  app.use(requestLogger);

  // Health check endpoint with detailed monitoring
  app.get('/health', async (_req, res) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      mongodb: 'disconnected',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      environment: env.nodeEnv
    };

    try {
      if (mongoose.connection.readyState === 1) {
        health.mongodb = 'connected';
      }
    } catch (error) {
      health.mongodb = 'error';
    }

    const statusCode = health.mongodb === 'connected' ? 200 : 503;
    res.status(statusCode).json(health);
  });

  // Readiness probe for Kubernetes/Docker health checks
  app.get('/ready', async (_req, res) => {
    if (mongoose.connection.readyState === 1) {
      res.status(200).json({ ready: true });
    } else {
      res.status(503).json({ ready: false, reason: 'database not connected' });
    }
  });

  // Liveness probe
  app.get('/live', (_req, res) => {
    res.status(200).json({ alive: true });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/salons', salonsRouter);
  app.use('/api/services', servicesRouter);
  app.use('/api/push-subscriptions', pushSubscriptionsRouter);
  app.use('/api/staff', staffRouter);
  app.use('/api/appointments', appointmentsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/seed', seedRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof Error) {
      logger.error(`Unhandled error: ${err.message}`, err, 'ERROR_HANDLER');
    } else {
      logger.error('Unhandled unknown error', err, 'ERROR_HANDLER');
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      ...(env.nodeEnv === 'development' && err instanceof Error && { message: err.message })
    });
  });

  return app;
};
