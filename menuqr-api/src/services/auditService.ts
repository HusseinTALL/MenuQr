import mongoose from 'mongoose';
import { AuditLog, AuditAction, AuditCategory } from '../models/AuditLog.js';
import logger from '../utils/logger.js';

interface AuditUser {
  _id: mongoose.Types.ObjectId | string;
  name?: string;
  email: string;
  role: string;
}

interface AuditRequest {
  ip?: string;
  userAgent?: string;
}

interface AuditOptions {
  action: AuditAction;
  category: AuditCategory;
  user: AuditUser;
  description: string;
  target?: {
    type: string;
    id: mongoose.Types.ObjectId | string;
    name?: string;
  };
  changes?: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  metadata?: Record<string, unknown>;
  request?: AuditRequest;
  status?: 'success' | 'failure';
  errorMessage?: string;
}

/**
 * Create an audit log entry
 */
export const createAuditLog = async (options: AuditOptions): Promise<void> => {
  try {
    await AuditLog.create({
      action: options.action,
      category: options.category,
      userId: options.user._id,
      userName: options.user.name || options.user.email,
      userEmail: options.user.email,
      userRole: options.user.role,
      targetType: options.target?.type,
      targetId: options.target?.id,
      targetName: options.target?.name,
      description: options.description,
      changes: options.changes,
      metadata: options.metadata,
      ipAddress: options.request?.ip,
      userAgent: options.request?.userAgent,
      status: options.status || 'success',
      errorMessage: options.errorMessage,
    });
  } catch (error) {
    // Don't throw - audit logging should never break the main flow
    logger.error('Failed to create audit log', { error, options });
  }
};

// ==============================================
// Authentication Audit Events
// ==============================================

/**
 * Log successful login
 */
export const auditLoginSuccess = async (
  user: AuditUser,
  request?: AuditRequest,
  metadata?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    action: 'login',
    category: 'authentication',
    user,
    description: `User ${user.email} logged in successfully`,
    request,
    metadata,
    status: 'success',
  });
};

/**
 * Log failed login attempt
 */
export const auditLoginFailure = async (
  email: string,
  reason: string,
  request?: AuditRequest,
  metadata?: Record<string, unknown>
): Promise<void> => {
  // Create a minimal user object for failed logins
  const unknownUser: AuditUser = {
    _id: new mongoose.Types.ObjectId(),
    email,
    role: 'unknown',
  };

  await createAuditLog({
    action: 'login_failed',
    category: 'authentication',
    user: unknownUser,
    description: `Failed login attempt for ${email}: ${reason}`,
    request,
    metadata: { ...metadata, reason },
    status: 'failure',
    errorMessage: reason,
  });
};

/**
 * Log logout
 */
export const auditLogout = async (
  user: AuditUser,
  request?: AuditRequest
): Promise<void> => {
  await createAuditLog({
    action: 'logout',
    category: 'authentication',
    user,
    description: `User ${user.email} logged out`,
    request,
    status: 'success',
  });
};

/**
 * Log password change
 */
export const auditPasswordChange = async (
  user: AuditUser,
  request?: AuditRequest
): Promise<void> => {
  await createAuditLog({
    action: 'password_change',
    category: 'authentication',
    user,
    description: `User ${user.email} changed their password`,
    request,
    status: 'success',
  });
};

/**
 * Log password reset request
 */
export const auditPasswordResetRequest = async (
  email: string,
  request?: AuditRequest
): Promise<void> => {
  const unknownUser: AuditUser = {
    _id: new mongoose.Types.ObjectId(),
    email,
    role: 'unknown',
  };

  await createAuditLog({
    action: 'password_reset',
    category: 'authentication',
    user: unknownUser,
    description: `Password reset requested for ${email}`,
    request,
    status: 'success',
  });
};

/**
 * Log password reset completion
 */
export const auditPasswordResetComplete = async (
  user: AuditUser,
  request?: AuditRequest
): Promise<void> => {
  await createAuditLog({
    action: 'password_reset',
    category: 'authentication',
    user,
    description: `User ${user.email} completed password reset`,
    request,
    status: 'success',
  });
};

/**
 * Log account lockout
 */
export const auditAccountLockout = async (
  email: string,
  request?: AuditRequest
): Promise<void> => {
  const unknownUser: AuditUser = {
    _id: new mongoose.Types.ObjectId(),
    email,
    role: 'unknown',
  };

  await createAuditLog({
    action: 'login_failed',
    category: 'authentication',
    user: unknownUser,
    description: `Account ${email} locked due to too many failed attempts`,
    request,
    metadata: { lockout: true },
    status: 'failure',
    errorMessage: 'Account locked',
  });
};

/**
 * Log impersonation start
 */
export const auditImpersonationStart = async (
  superAdmin: AuditUser,
  targetUser: { _id: mongoose.Types.ObjectId | string; email: string },
  request?: AuditRequest
): Promise<void> => {
  await createAuditLog({
    action: 'impersonate',
    category: 'authentication',
    user: superAdmin,
    description: `Super admin ${superAdmin.email} started impersonating ${targetUser.email}`,
    target: {
      type: 'User',
      id: targetUser._id,
      name: targetUser.email,
    },
    request,
    status: 'success',
  });
};

/**
 * Log token refresh
 */
export const auditTokenRefresh = async (
  user: AuditUser,
  request?: AuditRequest
): Promise<void> => {
  await createAuditLog({
    action: 'login',
    category: 'authentication',
    user,
    description: `Token refreshed for ${user.email}`,
    request,
    metadata: { tokenRefresh: true },
    status: 'success',
  });
};

// ==============================================
// Permission Audit Events
// ==============================================

/**
 * Log permission denied
 */
export const auditPermissionDenied = async (
  user: AuditUser | null,
  resource: string,
  action: string,
  request?: AuditRequest
): Promise<void> => {
  const auditUser = user || {
    _id: new mongoose.Types.ObjectId(),
    email: 'anonymous',
    role: 'anonymous',
  };

  await createAuditLog({
    action: 'permission_change',
    category: 'authentication',
    user: auditUser,
    description: `Permission denied: ${action} on ${resource}`,
    metadata: { resource, action },
    request,
    status: 'failure',
    errorMessage: 'Permission denied',
  });
};

// ==============================================
// User Management Audit Events
// ==============================================

/**
 * Log user registration
 */
export const auditUserRegistration = async (
  user: AuditUser,
  request?: AuditRequest
): Promise<void> => {
  await createAuditLog({
    action: 'create',
    category: 'user',
    user,
    description: `New user registered: ${user.email}`,
    target: {
      type: 'User',
      id: user._id,
      name: user.email,
    },
    request,
    status: 'success',
  });
};

/**
 * Log user profile update
 */
export const auditProfileUpdate = async (
  user: AuditUser,
  changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>,
  request?: AuditRequest
): Promise<void> => {
  await createAuditLog({
    action: 'update',
    category: 'user',
    user,
    description: `User ${user.email} updated their profile`,
    target: {
      type: 'User',
      id: user._id,
      name: user.email,
    },
    changes,
    request,
    status: 'success',
  });
};

export default {
  createAuditLog,
  auditLoginSuccess,
  auditLoginFailure,
  auditLogout,
  auditPasswordChange,
  auditPasswordResetRequest,
  auditPasswordResetComplete,
  auditAccountLockout,
  auditImpersonationStart,
  auditTokenRefresh,
  auditPermissionDenied,
  auditUserRegistration,
  auditProfileUpdate,
};
