import { Request, Response } from 'express';
import { BackupService } from '../../services/backupService.js';
import { AuditLog } from '../../models/index.js';
import { asyncHandler, ApiError } from '../../middleware/errorHandler.js';

/**
 * Create a full backup
 */
export const createFullBackup = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }

    const backup = await BackupService.createFullBackup(req.user._id);

    // Log the action
    await AuditLog.create({
      action: 'create',
      category: 'system',
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      targetType: 'Backup',
      targetId: backup._id,
      targetName: backup.filename,
      description: `Created full database backup: ${backup.filename}`,
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Full backup created successfully',
      data: backup,
    });
  }
);

/**
 * Create a partial backup
 */
export const createPartialBackup = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }

    const { collections, filters } = req.body;

    if (!collections || !Array.isArray(collections) || collections.length === 0) {
      throw new ApiError(400, 'Collections array is required');
    }

    const backup = await BackupService.createPartialBackup(
      req.user._id,
      collections,
      filters
    );

    await AuditLog.create({
      action: 'create',
      category: 'system',
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      targetType: 'Backup',
      targetId: backup._id,
      targetName: backup.filename,
      description: `Created partial backup (${collections.join(', ')}): ${backup.filename}`,
      metadata: { collections, filters },
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Partial backup created successfully',
      data: backup,
    });
  }
);

/**
 * Get all backups with pagination
 */
export const getBackups = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      page = 1,
      limit = 20,
      status,
      type,
    } = req.query;

    const result = await BackupService.getBackups(
      Number(page),
      Number(limit),
      {
        status: status as string | undefined,
        type: type as string | undefined,
      }
    );

    res.json({
      success: true,
      data: result,
    });
  }
);

/**
 * Get backup by ID
 */
export const getBackupById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const backup = await BackupService.getBackupById(id);
    if (!backup) {
      throw new ApiError(404, 'Backup not found');
    }

    res.json({
      success: true,
      data: backup,
    });
  }
);

/**
 * Download backup
 */
export const downloadBackup = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const result = await BackupService.getBackupStream(id);
    if (!result) {
      throw new ApiError(404, 'Backup not found or not ready for download');
    }

    // Log the download
    if (req.user) {
      await AuditLog.create({
        action: 'export',
        category: 'system',
        userId: req.user._id,
        userName: req.user.name,
        userEmail: req.user.email,
        userRole: req.user.role,
        targetType: 'Backup',
        targetId: id,
        targetName: result.filename,
        description: `Downloaded backup: ${result.filename}`,
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
        userAgent: req.headers['user-agent'],
        status: 'success',
      });
    }

    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.size);

    result.stream.pipe(res);
  }
);

/**
 * Delete backup
 */
export const deleteBackup = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }

    const { id } = req.params;

    const backup = await BackupService.getBackupById(id);
    if (!backup) {
      throw new ApiError(404, 'Backup not found');
    }

    const deleted = await BackupService.deleteBackup(id);
    if (!deleted) {
      throw new ApiError(500, 'Failed to delete backup');
    }

    await AuditLog.create({
      action: 'delete',
      category: 'system',
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      targetType: 'Backup',
      targetId: id,
      targetName: backup.filename,
      description: `Deleted backup: ${backup.filename}`,
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    res.json({
      success: true,
      message: 'Backup deleted successfully',
    });
  }
);

/**
 * Get backup statistics
 */
export const getBackupStats = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const stats = await BackupService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  }
);

/**
 * Export restaurant data
 */
export const exportRestaurantData = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }

    const { restaurantId } = req.params;
    const { format = 'json' } = req.query;

    const data = await BackupService.exportRestaurantData(restaurantId);

    await AuditLog.create({
      action: 'export',
      category: 'restaurant',
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      targetType: 'Restaurant',
      targetId: restaurantId,
      description: `Exported restaurant data for restaurant ${restaurantId}`,
      metadata: { format },
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
      userAgent: req.headers['user-agent'],
      status: 'success',
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="restaurant-${restaurantId}-export.json"`);
      res.json(data);
    } else {
      res.json({
        success: true,
        data,
      });
    }
  }
);

/**
 * Cleanup old backups
 */
export const cleanupOldBackups = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }

    const deletedCount = await BackupService.cleanupOldBackups();

    if (deletedCount > 0) {
      await AuditLog.create({
        action: 'delete',
        category: 'system',
        userId: req.user._id,
        userName: req.user.name,
        userEmail: req.user.email,
        userRole: req.user.role,
        description: `Cleaned up ${deletedCount} old backups`,
        metadata: { deletedCount },
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
        userAgent: req.headers['user-agent'],
        status: 'success',
      });
    }

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old backups`,
      data: { deletedCount },
    });
  }
);
