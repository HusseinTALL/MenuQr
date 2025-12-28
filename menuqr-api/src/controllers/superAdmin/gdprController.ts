/**
 * GDPR Controller
 * Handles GDPR compliance operations for super admin
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler, ApiError } from '../../middleware/errorHandler.js';
import * as gdprService from '../../services/gdprService.js';

/**
 * Export user data
 */
export const exportUserData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, 'Invalid user ID');
  }

  const requestedBy = {
    _id: req.user!._id,
    email: req.user!.email,
    name: req.user!.name,
    role: req.user!.role,
  };

  const exportData = await gdprService.exportUserData(userId, requestedBy);

  res.json({
    success: true,
    message: 'User data exported successfully',
    data: exportData,
  });
});

/**
 * Export customer data
 */
export const exportCustomerData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { customerId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    throw new ApiError(400, 'Invalid customer ID');
  }

  const requestedBy = {
    _id: req.user!._id,
    email: req.user!.email,
    name: req.user!.name,
    role: req.user!.role,
  };

  const exportData = await gdprService.exportCustomerData(customerId, requestedBy);

  res.json({
    success: true,
    message: 'Customer data exported successfully',
    data: exportData,
  });
});

/**
 * Delete user data (GDPR right to be forgotten)
 */
export const deleteUserData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { hardDelete = false } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, 'Invalid user ID');
  }

  // Prevent self-deletion
  if (userId === req.user!._id.toString()) {
    throw new ApiError(400, 'Cannot delete your own account through this endpoint');
  }

  const requestedBy = {
    _id: req.user!._id,
    email: req.user!.email,
    name: req.user!.name,
    role: req.user!.role,
  };

  const result = await gdprService.deleteUserData(userId, requestedBy, hardDelete);

  if (!result.success) {
    throw new ApiError(400, result.errors.join(', '));
  }

  res.json({
    success: true,
    message: 'User data deleted successfully',
    data: result,
  });
});

/**
 * Delete customer data (GDPR right to be forgotten)
 */
export const deleteCustomerData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { customerId } = req.params;
  const { hardDelete = false } = req.body;

  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    throw new ApiError(400, 'Invalid customer ID');
  }

  const requestedBy = {
    _id: req.user!._id,
    email: req.user!.email,
    name: req.user!.name,
    role: req.user!.role,
  };

  const result = await gdprService.deleteCustomerData(customerId, requestedBy, hardDelete);

  if (!result.success) {
    throw new ApiError(400, result.errors.join(', '));
  }

  res.json({
    success: true,
    message: 'Customer data deleted successfully',
    data: result,
  });
});

/**
 * Get GDPR statistics
 */
export const getGDPRStats = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const stats = await gdprService.getGDPRStats();

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * Download user data as JSON file
 */
export const downloadUserData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, 'Invalid user ID');
  }

  const requestedBy = {
    _id: req.user!._id,
    email: req.user!.email,
    name: req.user!.name,
    role: req.user!.role,
  };

  const exportData = await gdprService.exportUserData(userId, requestedBy);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}.json"`);
  res.json(exportData);
});

/**
 * Download customer data as JSON file
 */
export const downloadCustomerData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { customerId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    throw new ApiError(400, 'Invalid customer ID');
  }

  const requestedBy = {
    _id: req.user!._id,
    email: req.user!.email,
    name: req.user!.name,
    role: req.user!.role,
  };

  const exportData = await gdprService.exportCustomerData(customerId, requestedBy);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="customer-data-${customerId}.json"`);
  res.json(exportData);
});
