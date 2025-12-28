/**
 * Anomaly Detection Service
 * Detects suspicious login patterns and IP-based anomalies
 */

import { LoginHistory, SystemAlert, AuditLog } from '../models/index.js';
import logger from '../utils/logger.js';

// Thresholds for anomaly detection
const THRESHOLDS = {
  // Failed login thresholds
  FAILED_LOGINS_PER_IP_PER_HOUR: 10,
  FAILED_LOGINS_PER_IP_PER_DAY: 50,
  FAILED_LOGINS_TARGETING_MULTIPLE_ACCOUNTS: 5, // Same IP trying multiple emails

  // Velocity thresholds
  LOGINS_FROM_DIFFERENT_IPS_PER_HOUR: 5, // Same user from 5+ IPs in an hour
  LOGINS_FROM_DIFFERENT_COUNTRIES_PER_DAY: 3, // Impossible travel detection

  // Time-based thresholds
  OFF_HOURS_LOGIN_START: 0, // Midnight
  OFF_HOURS_LOGIN_END: 5, // 5 AM

  // Brute force detection
  RAPID_ATTEMPTS_WINDOW_SECONDS: 60,
  RAPID_ATTEMPTS_THRESHOLD: 5,
};

export interface AnomalyResult {
  isAnomaly: boolean;
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: Record<string, unknown>;
}

export type AnomalyType =
  | 'brute_force_single_account'
  | 'brute_force_multiple_accounts'
  | 'credential_stuffing'
  | 'velocity_anomaly'
  | 'impossible_travel'
  | 'off_hours_login'
  | 'suspicious_ip'
  | 'distributed_attack'
  | 'none';

/**
 * Analyze login attempt for anomalies
 */
export const analyzeLoginAttempt = async (options: {
  ipAddress?: string;
  email: string;
  isSuccess: boolean;
  userId?: string;
}): Promise<AnomalyResult[]> => {
  const { ipAddress, email, isSuccess, userId } = options;
  const anomalies: AnomalyResult[] = [];

  if (!ipAddress) {
    return anomalies;
  }

  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    // 1. Check for brute force attacks (rapid failed attempts)
    const rapidAttempts = await LoginHistory.countDocuments({
      ipAddress,
      status: 'failed',
      loginAt: { $gte: oneMinuteAgo },
    });

    if (rapidAttempts >= THRESHOLDS.RAPID_ATTEMPTS_THRESHOLD) {
      anomalies.push({
        isAnomaly: true,
        type: 'brute_force_single_account',
        severity: 'high',
        description: `Rapid login attempts detected: ${rapidAttempts} failed attempts in 1 minute from IP ${ipAddress}`,
        metadata: { ipAddress, attempts: rapidAttempts, email },
      });
    }

    // 2. Check for credential stuffing (same IP, different accounts)
    const uniqueEmailsFromIP = await LoginHistory.distinct('userEmail', {
      ipAddress,
      status: 'failed',
      loginAt: { $gte: oneHourAgo },
    });

    if (uniqueEmailsFromIP.length >= THRESHOLDS.FAILED_LOGINS_TARGETING_MULTIPLE_ACCOUNTS) {
      anomalies.push({
        isAnomaly: true,
        type: 'credential_stuffing',
        severity: 'critical',
        description: `Credential stuffing detected: ${uniqueEmailsFromIP.length} different accounts targeted from IP ${ipAddress}`,
        metadata: { ipAddress, targetedAccounts: uniqueEmailsFromIP.length },
      });
    }

    // 3. Check for excessive failed logins from IP
    const failedLoginsHour = await LoginHistory.countDocuments({
      ipAddress,
      status: 'failed',
      loginAt: { $gte: oneHourAgo },
    });

    if (failedLoginsHour >= THRESHOLDS.FAILED_LOGINS_PER_IP_PER_HOUR) {
      anomalies.push({
        isAnomaly: true,
        type: 'brute_force_multiple_accounts',
        severity: 'high',
        description: `Excessive failed logins: ${failedLoginsHour} failures in 1 hour from IP ${ipAddress}`,
        metadata: { ipAddress, failures: failedLoginsHour },
      });
    }

    // 4. Check for velocity anomaly (user logging in from many IPs)
    if (userId && isSuccess) {
      const recentUserIPs = await LoginHistory.distinct('ipAddress', {
        userId,
        status: 'success',
        loginAt: { $gte: oneHourAgo },
      });

      if (recentUserIPs.length >= THRESHOLDS.LOGINS_FROM_DIFFERENT_IPS_PER_HOUR) {
        anomalies.push({
          isAnomaly: true,
          type: 'velocity_anomaly',
          severity: 'medium',
          description: `Velocity anomaly: User logged in from ${recentUserIPs.length} different IPs in 1 hour`,
          metadata: { userId, email, ipCount: recentUserIPs.length, ips: recentUserIPs },
        });
      }
    }

    // 5. Check for off-hours login (successful logins during unusual hours)
    if (isSuccess) {
      const hour = now.getHours();
      if (hour >= THRESHOLDS.OFF_HOURS_LOGIN_START && hour < THRESHOLDS.OFF_HOURS_LOGIN_END) {
        // Check if user has logged in during these hours before
        const previousOffHoursLogins = await LoginHistory.countDocuments({
          userId,
          status: 'success',
          $expr: {
            $and: [
              { $gte: [{ $hour: '$loginAt' }, THRESHOLDS.OFF_HOURS_LOGIN_START] },
              { $lt: [{ $hour: '$loginAt' }, THRESHOLDS.OFF_HOURS_LOGIN_END] },
            ],
          },
          loginAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), $lt: now },
        });

        // Only flag if this is unusual for this user
        if (previousOffHoursLogins < 3) {
          anomalies.push({
            isAnomaly: true,
            type: 'off_hours_login',
            severity: 'low',
            description: `Off-hours login detected at ${hour}:00 for user ${email}`,
            metadata: { email, hour, previousOffHoursLogins },
          });
        }
      }
    }

    // 6. Check for distributed attack (many IPs targeting same email)
    const ipsTargetingEmail = await LoginHistory.distinct('ipAddress', {
      userEmail: email,
      status: 'failed',
      loginAt: { $gte: oneHourAgo },
    });

    if (ipsTargetingEmail.length >= 10) {
      anomalies.push({
        isAnomaly: true,
        type: 'distributed_attack',
        severity: 'critical',
        description: `Distributed attack detected: ${ipsTargetingEmail.length} different IPs targeting ${email}`,
        metadata: { email, attackingIps: ipsTargetingEmail.length },
      });
    }

    return anomalies;
  } catch (error) {
    logger.error('Failed to analyze login attempt for anomalies', { error, ipAddress, email });
    return anomalies;
  }
};

/**
 * Record anomaly and create system alert
 */
export const recordAnomaly = async (anomaly: AnomalyResult): Promise<void> => {
  try {
    // Create system alert for the anomaly
    const alertPriority = anomaly.severity === 'critical' ? 'critical' :
                          anomaly.severity === 'high' ? 'high' :
                          anomaly.severity === 'medium' ? 'medium' : 'low';

    const alertType = anomaly.severity === 'critical' || anomaly.severity === 'high' ? 'warning' : 'info';

    await SystemAlert.create({
      type: alertType,
      category: 'security',
      priority: alertPriority,
      title: `Security Anomaly: ${formatAnomalyType(anomaly.type)}`,
      message: anomaly.description,
      source: 'anomaly_detection',
      metadata: anomaly.metadata,
    });

    // Also create an audit log entry
    await AuditLog.create({
      action: 'security_alert',
      category: 'system',
      description: anomaly.description,
      status: 'warning',
      metadata: {
        anomalyType: anomaly.type,
        severity: anomaly.severity,
        ...anomaly.metadata,
      },
      ipAddress: anomaly.metadata.ipAddress as string,
    });

    logger.warn('Security anomaly detected', {
      type: anomaly.type,
      severity: anomaly.severity,
      description: anomaly.description,
    });
  } catch (error) {
    logger.error('Failed to record anomaly', { error, anomaly });
  }
};

/**
 * Format anomaly type for display
 */
const formatAnomalyType = (type: AnomalyType): string => {
  const typeLabels: Record<AnomalyType, string> = {
    brute_force_single_account: 'Brute Force Attack',
    brute_force_multiple_accounts: 'Mass Brute Force Attack',
    credential_stuffing: 'Credential Stuffing Attack',
    velocity_anomaly: 'Unusual Login Velocity',
    impossible_travel: 'Impossible Travel Detected',
    off_hours_login: 'Off-Hours Login',
    suspicious_ip: 'Suspicious IP Address',
    distributed_attack: 'Distributed Attack',
    none: 'None',
  };
  return typeLabels[type] || type;
};

/**
 * Check if IP is blocked (exceeds thresholds)
 */
export const isIPBlocked = async (ipAddress: string): Promise<{ blocked: boolean; reason?: string }> => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Check for excessive failed logins
    const failedCount = await LoginHistory.countDocuments({
      ipAddress,
      status: 'failed',
      loginAt: { $gte: oneHourAgo },
    });

    if (failedCount >= THRESHOLDS.FAILED_LOGINS_PER_IP_PER_HOUR) {
      return {
        blocked: true,
        reason: `IP temporarily blocked due to ${failedCount} failed login attempts`,
      };
    }

    // Check for credential stuffing pattern
    const uniqueEmails = await LoginHistory.distinct('userEmail', {
      ipAddress,
      status: 'failed',
      loginAt: { $gte: oneHourAgo },
    });

    if (uniqueEmails.length >= THRESHOLDS.FAILED_LOGINS_TARGETING_MULTIPLE_ACCOUNTS) {
      return {
        blocked: true,
        reason: 'IP blocked due to suspicious activity targeting multiple accounts',
      };
    }

    return { blocked: false };
  } catch (error) {
    logger.error('Failed to check if IP is blocked', { error, ipAddress });
    return { blocked: false };
  }
};

/**
 * Process login and detect anomalies
 * Call this after a login attempt (successful or failed)
 */
export const processLoginForAnomalies = async (options: {
  ipAddress?: string;
  email: string;
  isSuccess: boolean;
  userId?: string;
}): Promise<void> => {
  try {
    const anomalies = await analyzeLoginAttempt(options);

    // Record all detected anomalies
    for (const anomaly of anomalies) {
      if (anomaly.isAnomaly) {
        await recordAnomaly(anomaly);
      }
    }
  } catch (error) {
    // Don't throw - anomaly detection should not break login flow
    logger.error('Failed to process login for anomalies', { error });
  }
};

/**
 * Get anomaly statistics for dashboard
 */
export const getAnomalyStats = async (days: number = 7): Promise<{
  total: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  topAttackingIPs: Array<{ ip: string; count: number }>;
  trend: Array<{ date: string; count: number }>;
}> => {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const [bySeverity, byType, topIPs, trend] = await Promise.all([
      // Stats by severity
      SystemAlert.aggregate([
        { $match: { category: 'security', createdAt: { $gte: startDate } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),

      // Stats by type
      SystemAlert.aggregate([
        { $match: { category: 'security', createdAt: { $gte: startDate } } },
        { $group: { _id: '$metadata.anomalyType', count: { $sum: 1 } } },
      ]),

      // Top attacking IPs
      LoginHistory.aggregate([
        { $match: { status: 'failed', loginAt: { $gte: startDate } } },
        { $group: { _id: '$ipAddress', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Daily trend
      SystemAlert.aggregate([
        { $match: { category: 'security', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
    ]);

    const total = bySeverity.reduce((sum, item) => sum + item.count, 0);

    return {
      total,
      bySeverity: bySeverity.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      byType: byType.reduce((acc, item) => {
        if (item._id) {
          acc[item._id] = item.count;
        }
        return acc;
      }, {} as Record<string, number>),
      topAttackingIPs: topIPs.map((item) => ({
        ip: item._id || 'unknown',
        count: item.count,
      })),
      trend: trend.map((d) => ({
        date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
        count: d.count,
      })),
    };
  } catch (error) {
    logger.error('Failed to get anomaly stats', { error });
    return {
      total: 0,
      bySeverity: {},
      byType: {},
      topAttackingIPs: [],
      trend: [],
    };
  }
};

export default {
  analyzeLoginAttempt,
  recordAnomaly,
  isIPBlocked,
  processLoginForAnomalies,
  getAnomalyStats,
};
