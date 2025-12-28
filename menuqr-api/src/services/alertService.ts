/**
 * Alert Service
 * Centralized service for creating and managing system alerts
 */

import { SystemAlert, LoginHistory, Subscription } from '../models/index.js';
import type { AlertType, AlertCategory, AlertPriority } from '../models/SystemAlert.js';
import logger from '../utils/logger.js';

interface CreateAlertOptions {
  type: AlertType;
  category: AlertCategory;
  priority?: AlertPriority;
  title: string;
  message: string;
  details?: Record<string, unknown>;
  source?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

class AlertService {
  /**
   * Create a new system alert
   */
  static async createAlert(options: CreateAlertOptions) {
    try {
      const alert = await SystemAlert.create({
        type: options.type,
        category: options.category,
        priority: options.priority || 'medium',
        title: options.title,
        message: options.message,
        details: options.details,
        source: options.source || 'system',
        expiresAt: options.expiresAt,
        metadata: options.metadata,
      });

      logger.info('System alert created', {
        alertId: alert._id,
        type: alert.type,
        category: alert.category,
        title: alert.title,
      });

      return alert;
    } catch (error) {
      logger.error('Failed to create system alert', { error, options });
      throw error;
    }
  }

  /**
   * Create a security alert
   */
  static async securityAlert(title: string, message: string, details?: Record<string, unknown>) {
    return this.createAlert({
      type: 'warning',
      category: 'security',
      priority: 'high',
      title,
      message,
      details,
      source: 'security-monitor',
    });
  }

  /**
   * Create a performance alert
   */
  static async performanceAlert(title: string, message: string, details?: Record<string, unknown>) {
    return this.createAlert({
      type: 'warning',
      category: 'performance',
      priority: 'medium',
      title,
      message,
      details,
      source: 'performance-monitor',
    });
  }

  /**
   * Create a billing alert
   */
  static async billingAlert(title: string, message: string, details?: Record<string, unknown>) {
    return this.createAlert({
      type: 'warning',
      category: 'billing',
      priority: 'high',
      title,
      message,
      details,
      source: 'billing-service',
    });
  }

  /**
   * Create a critical alert
   */
  static async criticalAlert(title: string, message: string, category: AlertCategory, details?: Record<string, unknown>) {
    return this.createAlert({
      type: 'critical',
      category,
      priority: 'urgent',
      title,
      message,
      details,
      source: 'system',
    });
  }

  /**
   * Create an info alert
   */
  static async infoAlert(title: string, message: string, category: AlertCategory = 'system', details?: Record<string, unknown>) {
    return this.createAlert({
      type: 'info',
      category,
      priority: 'low',
      title,
      message,
      details,
      source: 'system',
      // Info alerts expire after 7 days
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }

  // ================== AUTOMATED CHECKS ==================

  /**
   * Check for suspicious login activity
   * - Multiple failed logins from same IP
   * - Failed logins for admin/superadmin accounts
   */
  static async checkFailedLogins() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Check for IPs with multiple failed logins
      const suspiciousIPs = await LoginHistory.aggregate([
        {
          $match: {
            loginAt: { $gte: oneHourAgo },
            status: 'failed',
            ipAddress: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: '$ipAddress',
            count: { $sum: 1 },
            emails: { $addToSet: '$userEmail' },
          },
        },
        {
          $match: { count: { $gte: 5 } },
        },
      ]);

      for (const ip of suspiciousIPs) {
        // Check if we already have an unresolved alert for this IP
        const existingAlert = await SystemAlert.findOne({
          category: 'security',
          isResolved: false,
          'details.ipAddress': ip._id,
          createdAt: { $gte: oneHourAgo },
        });

        if (!existingAlert) {
          await this.securityAlert(
            'Activité de connexion suspecte',
            `${ip.count} tentatives de connexion échouées depuis l'IP ${ip._id} au cours de la dernière heure.`,
            {
              ipAddress: ip._id,
              failedAttempts: ip.count,
              targetedEmails: ip.emails,
              timeframe: '1 hour',
            }
          );
        }
      }

      // Check for failed logins to superadmin accounts
      const adminFailedLogins = await LoginHistory.aggregate([
        {
          $match: {
            loginAt: { $gte: oneHourAgo },
            status: 'failed',
            userRole: { $in: ['superadmin', 'admin'] },
          },
        },
        {
          $group: {
            _id: '$userEmail',
            count: { $sum: 1 },
            ips: { $addToSet: '$ipAddress' },
          },
        },
        {
          $match: { count: { $gte: 3 } },
        },
      ]);

      for (const admin of adminFailedLogins) {
        const existingAlert = await SystemAlert.findOne({
          category: 'security',
          isResolved: false,
          'details.targetEmail': admin._id,
          createdAt: { $gte: oneHourAgo },
        });

        if (!existingAlert) {
          await this.securityAlert(
            'Tentatives de connexion admin échouées',
            `${admin.count} tentatives de connexion échouées pour le compte ${admin._id}.`,
            {
              targetEmail: admin._id,
              failedAttempts: admin.count,
              sourceIPs: admin.ips,
              timeframe: '1 hour',
            }
          );
        }
      }

      logger.info('Failed login check completed', {
        suspiciousIPs: suspiciousIPs.length,
        adminFailedLogins: adminFailedLogins.length,
      });
    } catch (error) {
      logger.error('Failed login check error', { error });
    }
  }

  /**
   * Check for expiring subscriptions
   */
  static async checkExpiringSubscriptions() {
    try {
      const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const today = new Date();

      // Find subscriptions expiring in 7 days
      const expiringSubscriptions = await Subscription.find({
        status: 'active',
        currentPeriodEnd: { $gte: today, $lte: in7Days },
      }).populate('restaurantId', 'name');

      for (const sub of expiringSubscriptions) {
        const daysUntilExpiry = Math.ceil(
          (sub.currentPeriodEnd.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
        );

        // Check if we already have an alert for this subscription
        const existingAlert = await SystemAlert.findOne({
          category: 'billing',
          isResolved: false,
          'details.subscriptionId': sub._id.toString(),
        });

        if (!existingAlert) {
          await this.billingAlert(
            'Abonnement expirant bientôt',
            `L'abonnement du restaurant "${(sub.restaurantId as unknown as { name: string })?.name || 'Unknown'}" expire dans ${daysUntilExpiry} jour(s).`,
            {
              subscriptionId: sub._id.toString(),
              restaurantId: sub.restaurantId?.toString(),
              expiresAt: sub.currentPeriodEnd,
              daysUntilExpiry,
            }
          );
        }
      }

      // Find already expired subscriptions that are still marked as active
      const expiredSubscriptions = await Subscription.find({
        status: 'active',
        currentPeriodEnd: { $lt: today },
      });

      for (const sub of expiredSubscriptions) {
        const existingAlert = await SystemAlert.findOne({
          category: 'billing',
          isResolved: false,
          'details.subscriptionId': sub._id.toString(),
          title: 'Abonnement expiré',
        });

        if (!existingAlert) {
          await this.createAlert({
            type: 'error',
            category: 'billing',
            priority: 'high',
            title: 'Abonnement expiré',
            message: `L'abonnement ${sub._id} a expiré mais est toujours marqué comme actif.`,
            details: {
              subscriptionId: sub._id.toString(),
              expiredAt: sub.currentPeriodEnd,
            },
            source: 'billing-check',
          });
        }
      }

      logger.info('Subscription check completed', {
        expiring: expiringSubscriptions.length,
        expired: expiredSubscriptions.length,
      });
    } catch (error) {
      logger.error('Subscription check error', { error });
    }
  }

  /**
   * Clean up old resolved alerts
   */
  static async cleanupOldAlerts() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const result = await SystemAlert.deleteMany({
        isResolved: true,
        resolvedAt: { $lt: thirtyDaysAgo },
      });

      logger.info('Alert cleanup completed', { deleted: result.deletedCount });
    } catch (error) {
      logger.error('Alert cleanup error', { error });
    }
  }

  /**
   * Run all automated checks
   */
  static async runAllChecks() {
    logger.info('Running all automated alert checks...');

    await Promise.all([
      this.checkFailedLogins(),
      this.checkExpiringSubscriptions(),
      this.cleanupOldAlerts(),
    ]);

    logger.info('All automated alert checks completed');
  }
}

export default AlertService;
