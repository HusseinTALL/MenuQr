import { Request, Response, NextFunction } from 'express';
import { MonitoringService } from '../services/monitoringService.js';

/**
 * Middleware to record request metrics for monitoring
 * Tracks response time, status codes, paths, and methods
 */
export const requestMetricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;

    MonitoringService.recordRequest({
      responseTime,
      statusCode: res.statusCode,
      path: req.path,
      method: req.method,
    });
  });

  next();
};
