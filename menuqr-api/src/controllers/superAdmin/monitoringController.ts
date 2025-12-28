import { Request, Response } from 'express';
import { MonitoringService } from '../../services/monitoringService.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

/**
 * Get system metrics (CPU, memory, disk)
 */
export const getSystemMetrics = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const metrics = MonitoringService.getSystemMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  }
);

/**
 * Get database metrics
 */
export const getDatabaseMetrics = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const metrics = await MonitoringService.getDatabaseMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  }
);

/**
 * Get application metrics
 */
export const getAppMetrics = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const metrics = await MonitoringService.getAppMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  }
);

/**
 * Get services health status
 */
export const getServicesHealth = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const health = await MonitoringService.getServicesHealth();

    res.json({
      success: true,
      data: health,
    });
  }
);

/**
 * Get comprehensive health check
 */
export const getHealthCheck = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const health = await MonitoringService.getHealthCheck();

    res.json({
      success: true,
      data: health,
    });
  }
);

/**
 * Get metrics history for charts
 */
export const getMetricsHistory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { hours = 24 } = req.query;
    const history = MonitoringService.getMetricsHistory(Number(hours));

    res.json({
      success: true,
      data: {
        history,
        count: history.length,
        hours: Number(hours),
      },
    });
  }
);

/**
 * Get all monitoring data in one call
 */
export const getAllMetrics = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { hours = 1 } = req.query;

    const [system, database, app, services, health, history] = await Promise.all([
      Promise.resolve(MonitoringService.getSystemMetrics()),
      MonitoringService.getDatabaseMetrics(),
      MonitoringService.getAppMetrics(),
      MonitoringService.getServicesHealth(),
      MonitoringService.getHealthCheck(),
      Promise.resolve(MonitoringService.getMetricsHistory(Number(hours))),
    ]);

    res.json({
      success: true,
      data: {
        system,
        database,
        app,
        services,
        health,
        history,
      },
      timestamp: new Date().toISOString(),
    });
  }
);
