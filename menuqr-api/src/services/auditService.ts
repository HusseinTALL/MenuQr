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

// ==============================================
// Generic CRUD Audit Events
// ==============================================

type EntityCategory =
  | 'dish'
  | 'category'
  | 'table'
  | 'reservation'
  | 'review'
  | 'campaign'
  | 'loyalty'
  | 'customer'
  | 'staff'
  | 'order'
  | 'restaurant'
  | 'settings'
  | 'user';

interface EntityTarget {
  type: string;
  id: mongoose.Types.ObjectId | string;
  name?: string;
}

/**
 * Log entity creation
 */
export const auditCreate = async (
  category: EntityCategory,
  user: AuditUser,
  target: EntityTarget,
  description?: string,
  request?: AuditRequest,
  metadata?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    action: 'create',
    category,
    user,
    description: description || `${target.type} "${target.name || target.id}" created`,
    target,
    request,
    metadata,
    status: 'success',
  });
};

/**
 * Log entity update
 */
export const auditUpdate = async (
  category: EntityCategory,
  user: AuditUser,
  target: EntityTarget,
  changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>,
  description?: string,
  request?: AuditRequest,
  metadata?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    action: 'update',
    category,
    user,
    description: description || `${target.type} "${target.name || target.id}" updated`,
    target,
    changes,
    request,
    metadata,
    status: 'success',
  });
};

/**
 * Log entity deletion
 */
export const auditDelete = async (
  category: EntityCategory,
  user: AuditUser,
  target: EntityTarget,
  description?: string,
  request?: AuditRequest,
  metadata?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    action: 'delete',
    category,
    user,
    description: description || `${target.type} "${target.name || target.id}" deleted`,
    target,
    request,
    metadata,
    status: 'success',
  });
};

/**
 * Log entity status change (e.g., order status, reservation status)
 */
export const auditStatusChange = async (
  category: EntityCategory,
  user: AuditUser,
  target: EntityTarget,
  oldStatus: string,
  newStatus: string,
  request?: AuditRequest,
  metadata?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    action: 'status_change',
    category,
    user,
    description: `${target.type} "${target.name || target.id}" status changed from "${oldStatus}" to "${newStatus}"`,
    target,
    changes: [{ field: 'status', oldValue: oldStatus, newValue: newStatus }],
    request,
    metadata,
    status: 'success',
  });
};

/**
 * Log bulk action
 */
export const auditBulkAction = async (
  category: EntityCategory,
  user: AuditUser,
  action: string,
  count: number,
  targetIds: (mongoose.Types.ObjectId | string)[],
  description?: string,
  request?: AuditRequest,
  metadata?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    action: 'bulk_action',
    category,
    user,
    description: description || `Bulk ${action} on ${count} ${category} items`,
    request,
    metadata: { ...metadata, action, count, targetIds },
    status: 'success',
  });
};

/**
 * Log settings change
 */
export const auditSettingsChange = async (
  user: AuditUser,
  settingType: string,
  changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>,
  request?: AuditRequest,
  metadata?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    action: 'settings_change',
    category: 'settings',
    user,
    description: `${settingType} settings updated`,
    changes,
    request,
    metadata: { ...metadata, settingType },
    status: 'success',
  });
};

/**
 * Log data export
 */
export const auditDataExport = async (
  user: AuditUser,
  exportType: string,
  recordCount: number,
  request?: AuditRequest,
  metadata?: Record<string, unknown>
): Promise<void> => {
  await createAuditLog({
    action: 'export',
    category: 'system',
    user,
    description: `Exported ${recordCount} ${exportType} records`,
    request,
    metadata: { ...metadata, exportType, recordCount },
    status: 'success',
  });
};

/**
 * Helper to extract request info from Express request
 */
export const getRequestInfo = (req: {
  ip?: string;
  headers?: { 'user-agent'?: string; 'x-forwarded-for'?: string };
}): AuditRequest => {
  return {
    ip: req.headers?.['x-forwarded-for']?.toString().split(',')[0] || req.ip,
    userAgent: req.headers?.['user-agent'],
  };
};

/**
 * Helper to create user object from request
 */
export const getUserFromRequest = (req: {
  user?: {
    _id: mongoose.Types.ObjectId | string;
    name?: string;
    email: string;
    role: string;
  };
}): AuditUser | null => {
  if (!req.user) {return null;}
  return {
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  };
};

/**
 * Helper to compute changes between old and new objects
 */
export const computeChanges = (
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  fieldsToTrack: string[]
): Array<{ field: string; oldValue: unknown; newValue: unknown }> => {
  const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];

  for (const field of fieldsToTrack) {
    const oldValue = oldObj[field];
    const newValue = newObj[field];

    // Deep comparison for objects/arrays
    const oldStr = JSON.stringify(oldValue);
    const newStr = JSON.stringify(newValue);

    if (oldStr !== newStr) {
      changes.push({ field, oldValue, newValue });
    }
  }

  return changes;
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
  // CRUD helpers
  auditCreate,
  auditUpdate,
  auditDelete,
  auditStatusChange,
  auditBulkAction,
  auditSettingsChange,
  auditDataExport,
  // Utility helpers
  getRequestInfo,
  getUserFromRequest,
  computeChanges,
};
