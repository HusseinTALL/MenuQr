/**
 * Staff Controller
 * Handles staff management operations for restaurant owners
 */

import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import {
  ROLES,
  Role,
  getAssignableRoles,
  canAssignRole,
  getRoleDisplayName,
  getRolePermissions,
  PERMISSIONS,
  Permission,
} from '../config/permissions.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';
import * as auditService from '../services/auditService.js';

/**
 * Get all staff members for the current restaurant
 */
export const getStaff = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;

  if (!restaurantId) {
    throw new ApiError(400, 'No restaurant associated with this account');
  }

  const { role, search, isActive } = req.query;

  // Build query
  const query: Record<string, unknown> = {
    restaurantId,
    _id: { $ne: req.user!._id }, // Exclude current user
  };

  if (role) {
    query.role = role;
  }

  if (typeof isActive === 'string') {
    query.isActive = isActive === 'true';
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const staff = await User.find(query)
    .select('-password -refreshToken -twoFactorSecret -twoFactorBackupCodes')
    .sort({ createdAt: -1 });

  // Add display info
  const staffWithDisplayInfo = staff.map(member => ({
    id: member._id,
    email: member.email,
    name: member.name,
    role: member.role,
    roleDisplayName: getRoleDisplayName(member.role as Role),
    isActive: member.isActive,
    lastLogin: member.lastLogin,
    twoFactorEnabled: member.twoFactorEnabled,
    createdAt: member.createdAt,
    customPermissions: member.customPermissions,
  }));

  res.json({
    success: true,
    data: {
      staff: staffWithDisplayInfo,
      total: staff.length,
    },
  });
});

/**
 * Get a single staff member by ID
 */
export const getStaffMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { id } = req.params;

  if (!restaurantId) {
    throw new ApiError(400, 'No restaurant associated with this account');
  }

  const member = await User.findOne({
    _id: id,
    restaurantId,
  }).select('-password -refreshToken -twoFactorSecret -twoFactorBackupCodes');

  if (!member) {
    throw new ApiError(404, 'Staff member not found');
  }

  res.json({
    success: true,
    data: {
      staff: {
        id: member._id,
        email: member.email,
        name: member.name,
        role: member.role,
        roleDisplayName: getRoleDisplayName(member.role as Role),
        isActive: member.isActive,
        lastLogin: member.lastLogin,
        twoFactorEnabled: member.twoFactorEnabled,
        createdAt: member.createdAt,
        customPermissions: member.customPermissions,
        permissions: getRolePermissions(member.role as Role),
      },
    },
  });
});

/**
 * Create a new staff member
 */
export const createStaffMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const currentUserRole = req.user!.role as Role;

  if (!restaurantId) {
    throw new ApiError(400, 'No restaurant associated with this account');
  }

  const { email, name, role, customPermissions } = req.body;

  // Validate role
  if (!getAssignableRoles().includes(role as Role)) {
    throw new ApiError(400, `Invalid role: ${role}. Allowed roles: ${getAssignableRoles().join(', ')}`);
  }

  // Check if current user can assign this role
  if (!canAssignRole(currentUserRole, role as Role)) {
    throw new ApiError(403, `You cannot assign the ${role} role`);
  }

  // Check if email is already in use
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, 'A user with this email already exists');
  }

  // Validate custom permissions if provided
  if (customPermissions && Array.isArray(customPermissions)) {
    const validPermissions = Object.values(PERMISSIONS);
    const invalidPerms = customPermissions.filter((p: string) => !validPermissions.includes(p as Permission));
    if (invalidPerms.length > 0) {
      throw new ApiError(400, `Invalid permissions: ${invalidPerms.join(', ')}`);
    }
  }

  // Generate a temporary password
  const tempPassword = crypto.randomBytes(12).toString('base64').slice(0, 16) + 'A1!';

  // Create the staff member
  const newMember = await User.create({
    email,
    name,
    password: tempPassword,
    role,
    restaurantId,
    createdBy: req.user!._id,
    customPermissions: customPermissions || undefined,
    isActive: true,
  });

  logger.info('Staff member created', {
    staffId: newMember._id,
    email,
    role,
    createdBy: req.user!._id,
    restaurantId,
  });

  // Audit log
  const auditUser = auditService.getUserFromRequest(req);
  if (auditUser) {
    await auditService.auditCreate(
      'staff',
      auditUser,
      { type: 'Staff', id: newMember._id, name: newMember.name },
      `Staff member "${newMember.name}" (${newMember.email}) created with role ${role}`,
      auditService.getRequestInfo(req),
      { email, role }
    );
  }

  // TODO: Send email with temporary password to the new staff member

  res.status(201).json({
    success: true,
    message: 'Staff member created successfully',
    data: {
      staff: {
        id: newMember._id,
        email: newMember.email,
        name: newMember.name,
        role: newMember.role,
        roleDisplayName: getRoleDisplayName(newMember.role as Role),
        isActive: newMember.isActive,
        createdAt: newMember.createdAt,
      },
      temporaryPassword: tempPassword, // In production, this should be sent via email
    },
  });
});

/**
 * Update a staff member
 */
export const updateStaffMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const currentUserRole = req.user!.role as Role;
  const { id } = req.params;

  if (!restaurantId) {
    throw new ApiError(400, 'No restaurant associated with this account');
  }

  const member = await User.findOne({
    _id: id,
    restaurantId,
  });

  if (!member) {
    throw new ApiError(404, 'Staff member not found');
  }

  // Cannot modify yourself through this endpoint
  if (member._id.toString() === req.user!._id.toString()) {
    throw new ApiError(400, 'Cannot modify your own account through this endpoint. Use profile settings.');
  }

  const { name, role, isActive, customPermissions } = req.body;

  // If changing role, validate the new role
  if (role && role !== member.role) {
    if (!getAssignableRoles().includes(role as Role)) {
      throw new ApiError(400, `Invalid role: ${role}`);
    }

    if (!canAssignRole(currentUserRole, role as Role)) {
      throw new ApiError(403, `You cannot assign the ${role} role`);
    }
  }

  // Validate custom permissions if provided
  if (customPermissions && Array.isArray(customPermissions)) {
    const validPermissions = Object.values(PERMISSIONS);
    const invalidPerms = customPermissions.filter((p: string) => !validPermissions.includes(p as Permission));
    if (invalidPerms.length > 0) {
      throw new ApiError(400, `Invalid permissions: ${invalidPerms.join(', ')}`);
    }
  }

  // Update fields
  if (name) {member.name = name;}
  if (role) {member.role = role;}
  if (typeof isActive === 'boolean') {member.isActive = isActive;}
  if (customPermissions !== undefined) {
    member.customPermissions = customPermissions.length > 0 ? customPermissions : undefined;
  }

  await member.save();

  logger.info('Staff member updated', {
    staffId: member._id,
    updatedBy: req.user!._id,
    changes: { name, role, isActive, hasCustomPermissions: !!customPermissions },
  });

  // Audit log
  const auditUser = auditService.getUserFromRequest(req);
  if (auditUser) {
    const changes = [];
    if (name) {changes.push({ field: 'name', oldValue: 'previous', newValue: name });}
    if (role) {changes.push({ field: 'role', oldValue: 'previous', newValue: role });}
    if (typeof isActive === 'boolean') {changes.push({ field: 'isActive', oldValue: !isActive, newValue: isActive });}

    await auditService.auditUpdate(
      'staff',
      auditUser,
      { type: 'Staff', id: member._id, name: member.name },
      changes.length > 0 ? changes : undefined,
      `Staff member "${member.name}" updated`,
      auditService.getRequestInfo(req)
    );
  }

  res.json({
    success: true,
    message: 'Staff member updated successfully',
    data: {
      staff: {
        id: member._id,
        email: member.email,
        name: member.name,
        role: member.role,
        roleDisplayName: getRoleDisplayName(member.role as Role),
        isActive: member.isActive,
        customPermissions: member.customPermissions,
      },
    },
  });
});

/**
 * Delete a staff member
 */
export const deleteStaffMember = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { id } = req.params;

  if (!restaurantId) {
    throw new ApiError(400, 'No restaurant associated with this account');
  }

  const member = await User.findOne({
    _id: id,
    restaurantId,
  });

  if (!member) {
    throw new ApiError(404, 'Staff member not found');
  }

  // Cannot delete yourself
  if (member._id.toString() === req.user!._id.toString()) {
    throw new ApiError(400, 'Cannot delete your own account');
  }

  // Cannot delete owners
  if (member.role === ROLES.OWNER) {
    throw new ApiError(403, 'Cannot delete restaurant owner');
  }

  // Store info for audit before deletion
  const memberName = member.name;
  const memberEmail = member.email;
  const memberId = member._id;

  await member.deleteOne();

  logger.info('Staff member deleted', {
    staffId: memberId,
    email: memberEmail,
    deletedBy: req.user!._id,
    restaurantId,
  });

  // Audit log
  const auditUser = auditService.getUserFromRequest(req);
  if (auditUser) {
    await auditService.auditDelete(
      'staff',
      auditUser,
      { type: 'Staff', id: memberId, name: memberName },
      `Staff member "${memberName}" (${memberEmail}) deleted`,
      auditService.getRequestInfo(req)
    );
  }

  res.json({
    success: true,
    message: 'Staff member deleted successfully',
  });
});

/**
 * Reset staff member password
 */
export const resetStaffPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { id } = req.params;

  if (!restaurantId) {
    throw new ApiError(400, 'No restaurant associated with this account');
  }

  const member = await User.findOne({
    _id: id,
    restaurantId,
  });

  if (!member) {
    throw new ApiError(404, 'Staff member not found');
  }

  // Cannot reset your own password through this endpoint
  if (member._id.toString() === req.user!._id.toString()) {
    throw new ApiError(400, 'Use the change password feature in settings');
  }

  // Generate new temporary password
  const tempPassword = crypto.randomBytes(12).toString('base64').slice(0, 16) + 'A1!';

  member.password = tempPassword;
  await member.save();

  logger.info('Staff member password reset', {
    staffId: member._id,
    resetBy: req.user!._id,
    restaurantId,
  });

  // Audit log
  const auditUser = auditService.getUserFromRequest(req);
  if (auditUser) {
    await auditService.auditUpdate(
      'staff',
      auditUser,
      { type: 'Staff', id: member._id, name: member.name },
      [{ field: 'password', oldValue: '[REDACTED]', newValue: '[RESET]' }],
      `Password reset for staff member "${member.name}"`,
      auditService.getRequestInfo(req)
    );
  }

  // TODO: Send email with new temporary password

  res.json({
    success: true,
    message: 'Password reset successfully',
    data: {
      temporaryPassword: tempPassword, // In production, send via email
    },
  });
});

/**
 * Get available roles for staff assignment
 */
export const getAvailableRoles = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const currentUserRole = req.user!.role as Role;

  const assignableRoles = getAssignableRoles()
    .filter(role => canAssignRole(currentUserRole, role))
    .map(role => ({
      value: role,
      label: getRoleDisplayName(role),
      permissions: getRolePermissions(role),
    }));

  res.json({
    success: true,
    data: {
      roles: assignableRoles,
    },
  });
});

/**
 * Get all available permissions
 */
export const getAvailablePermissions = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const permissions = Object.entries(PERMISSIONS).map(([key, value]) => ({
    key,
    value,
  }));

  res.json({
    success: true,
    data: {
      permissions,
    },
  });
});

export default {
  getStaff,
  getStaffMember,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  resetStaffPassword,
  getAvailableRoles,
  getAvailablePermissions,
};
