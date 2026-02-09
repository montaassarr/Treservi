import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Log request
  logger.debug(
    `${req.method} ${req.path}`,
    {
      requestId,
      ip: req.ip,
      userAgent: req.get('user-agent')?.substring(0, 100)
    },
    'REQUEST'
  );

  // Capture response
  const originalJson = res.json.bind(res);
  let responseBody: unknown;

  res.json = function(body: unknown) {
    responseBody = body;
    return originalJson(body);
  };

  // Log response when sent
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const isError = res.statusCode >= 400;

    logger.info(
      `${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
      {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        size: JSON.stringify(responseBody).length
      },
      isError ? 'RESPONSE_ERROR' : 'RESPONSE'
    );
  });

  next();
};
