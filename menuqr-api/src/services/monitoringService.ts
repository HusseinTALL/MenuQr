import os from 'os';
import mongoose from 'mongoose';
import { User, Restaurant, Order, Customer, Subscription } from '../models/index.js';
import logger from '../utils/logger.js';

// In-memory metrics storage for request tracking
interface RequestMetric {
  timestamp: Date;
  responseTime: number;
  statusCode: number;
  path: string;
  method: string;
}

interface MetricsHistory {
  timestamp: Date;
  cpu: number;
  memory: number;
  requests: number;
  avgResponseTime: number;
  errorRate: number;
}

class MonitoringServiceClass {
  private requestMetrics: RequestMetric[] = [];
  private metricsHistory: MetricsHistory[] = [];
  private maxHistorySize = 1440; // 24 hours at 1-minute intervals
  private collectionInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Start collecting metrics history
   */
  startCollection(): void {
    if (this.collectionInterval) {return;}

    // Collect every minute
    this.collectionInterval = setInterval(() => {
      this.collectHistoryPoint();
    }, 60 * 1000);

    // Collect immediately on start
    this.collectHistoryPoint();

    logger.info('Monitoring service started');
  }

  /**
   * Stop collecting metrics
   */
  stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }

  /**
   * Record a request metric
   */
  recordRequest(metric: Omit<RequestMetric, 'timestamp'>): void {
    this.requestMetrics.push({
      ...metric,
      timestamp: new Date(),
    });

    // Keep only last 5 minutes of request data
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    this.requestMetrics = this.requestMetrics.filter(
      (m) => m.timestamp > fiveMinutesAgo
    );
  }

  /**
   * Collect a history point
   */
  private async collectHistoryPoint(): Promise<void> {
    try {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

      // Get requests in the last minute
      const recentRequests = this.requestMetrics.filter(
        (m) => m.timestamp > oneMinuteAgo
      );

      const errorCount = recentRequests.filter((m) => m.statusCode >= 400).length;
      const totalResponseTime = recentRequests.reduce(
        (sum, m) => sum + m.responseTime,
        0
      );

      const historyPoint: MetricsHistory = {
        timestamp: now,
        cpu: this.getCpuUsage(),
        memory: this.getMemoryUsage(),
        requests: recentRequests.length,
        avgResponseTime:
          recentRequests.length > 0 ? totalResponseTime / recentRequests.length : 0,
        errorRate: recentRequests.length > 0 ? (errorCount / recentRequests.length) * 100 : 0,
      };

      this.metricsHistory.push(historyPoint);

      // Keep only maxHistorySize entries
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
      }
    } catch (error) {
      logger.error('Error collecting metrics history', error);
    }
  }

  /**
   * Get CPU usage percentage
   */
  private getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = ((total - idle) / total) * 100;

    return Math.round(usage * 100) / 100;
  }

  /**
   * Get memory usage percentage
   */
  private getMemoryUsage(): number {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    return Math.round((usedMem / totalMem) * 100 * 100) / 100;
  }

  /**
   * Get system metrics (CPU, memory, disk, uptime)
   */
  getSystemMetrics(): {
    cpu: { usage: number; cores: number; model: string };
    memory: { total: number; used: number; free: number; percentage: number };
    uptime: { system: number; process: number };
    nodeVersion: string;
    platform: string;
    hostname: string;
  } {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpus = os.cpus();

    return {
      cpu: {
        usage: this.getCpuUsage(),
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown',
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        percentage: Math.round((usedMem / totalMem) * 100 * 100) / 100,
      },
      uptime: {
        system: os.uptime(),
        process: process.uptime(),
      },
      nodeVersion: process.version,
      platform: os.platform(),
      hostname: os.hostname(),
    };
  }

  /**
   * Get database metrics
   */
  async getDatabaseMetrics(): Promise<{
    status: string;
    host: string;
    database: string;
    collections: { name: string; count: number; size: number }[];
    totalSize: number;
    connections: number;
  }> {
    const connection = mongoose.connection;

    if (connection.readyState !== 1) {
      return {
        status: 'disconnected',
        host: '',
        database: '',
        collections: [],
        totalSize: 0,
        connections: 0,
      };
    }

    try {
      const db = connection.db;
      if (!db) {
        throw new Error('Database not available');
      }

      // Get database stats
      const dbStats = await db.stats();

      // Get collection stats
      const collectionList = await db.listCollections().toArray();
      const collectionStats = await Promise.all(
        collectionList.map(async (col) => {
          try {
            // Use aggregate $collStats for MongoDB 4.0+
            const statsResult = await db.collection(col.name).aggregate([
              { $collStats: { storageStats: {} } }
            ]).toArray();
            const stats = statsResult[0]?.storageStats || {};
            return {
              name: col.name,
              count: stats.count || 0,
              size: stats.size || 0,
            };
          } catch {
            return {
              name: col.name,
              count: 0,
              size: 0,
            };
          }
        })
      );

      return {
        status: 'connected',
        host: connection.host || '',
        database: connection.name || '',
        collections: collectionStats.sort((a, b) => b.size - a.size),
        totalSize: dbStats.dataSize || 0,
        connections: dbStats.connections || 0,
      };
    } catch (error) {
      logger.error('Error getting database metrics', error);
      return {
        status: 'error',
        host: connection.host || '',
        database: connection.name || '',
        collections: [],
        totalSize: 0,
        connections: 0,
      };
    }
  }

  /**
   * Get application metrics
   */
  async getAppMetrics(): Promise<{
    activeUsers: number;
    activeRestaurants: number;
    ordersToday: number;
    customersTotal: number;
    activeSubscriptions: number;
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  }> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    // Get recent requests for rate calculations
    const recentRequests = this.requestMetrics.filter(
      (m) => m.timestamp > oneMinuteAgo
    );

    const errorCount = recentRequests.filter((m) => m.statusCode >= 400).length;
    const totalResponseTime = recentRequests.reduce(
      (sum, m) => sum + m.responseTime,
      0
    );

    const [
      activeUsers,
      activeRestaurants,
      ordersToday,
      customersTotal,
      activeSubscriptions,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Restaurant.countDocuments({ isActive: true }),
      Order.countDocuments({ createdAt: { $gte: startOfDay } }),
      Customer.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
    ]);

    return {
      activeUsers,
      activeRestaurants,
      ordersToday,
      customersTotal,
      activeSubscriptions,
      requestsPerMinute: recentRequests.length,
      averageResponseTime:
        recentRequests.length > 0 ? totalResponseTime / recentRequests.length : 0,
      errorRate:
        recentRequests.length > 0 ? (errorCount / recentRequests.length) * 100 : 0,
    };
  }

  /**
   * Get services health status
   */
  async getServicesHealth(): Promise<{
    mongodb: { status: string; latency: number };
    scheduler: { status: string };
    sms: { status: string };
    email: { status: string };
  }> {
    // Check MongoDB
    let mongoStatus = 'disconnected';
    let mongoLatency = 0;

    try {
      const startTime = Date.now();
      if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
        mongoLatency = Date.now() - startTime;
        mongoStatus = 'connected';
      }
    } catch {
      mongoStatus = 'error';
    }

    return {
      mongodb: {
        status: mongoStatus,
        latency: mongoLatency,
      },
      scheduler: {
        status: 'running', // Scheduler is always running if the server is up
      },
      sms: {
        status: process.env.SMS_PROVIDER !== 'mock' ? 'configured' : 'mock',
      },
      email: {
        status: process.env.SMTP_HOST ? 'configured' : 'not_configured',
      },
    };
  }

  /**
   * Get metrics history for charts
   */
  getMetricsHistory(
    hours: number = 24
  ): MetricsHistory[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metricsHistory.filter((m) => m.timestamp > cutoff);
  }

  /**
   * Get comprehensive health check
   */
  async getHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
      database: boolean;
      memory: boolean;
      cpu: boolean;
    };
    details: {
      database: string;
      memoryUsage: number;
      cpuUsage: number;
      uptime: number;
    };
  }> {
    const systemMetrics = this.getSystemMetrics();
    const dbMetrics = await this.getDatabaseMetrics();

    const dbHealthy = dbMetrics.status === 'connected';
    const memoryHealthy = systemMetrics.memory.percentage < 90;
    const cpuHealthy = systemMetrics.cpu.usage < 90;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (!dbHealthy) {
      status = 'unhealthy';
    } else if (!memoryHealthy || !cpuHealthy) {
      status = 'degraded';
    }

    return {
      status,
      checks: {
        database: dbHealthy,
        memory: memoryHealthy,
        cpu: cpuHealthy,
      },
      details: {
        database: dbMetrics.status,
        memoryUsage: systemMetrics.memory.percentage,
        cpuUsage: systemMetrics.cpu.usage,
        uptime: systemMetrics.uptime.process,
      },
    };
  }
}

// Export singleton instance
export const MonitoringService = new MonitoringServiceClass();

export default MonitoringService;
