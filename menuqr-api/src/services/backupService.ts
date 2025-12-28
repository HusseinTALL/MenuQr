import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { createGzip } from 'zlib';
import { pipeline, Readable } from 'stream';
import {
  Backup,
  Restaurant,
  User,
  Order,
  Dish,
  Category,
  Customer,
  Subscription,
  Invoice,
  Reservation,
  Review,
  Campaign,
  LoyaltyTransaction,
} from '../models/index.js';
import logger from '../utils/logger.js';

const pipelineAsync = promisify(pipeline);

// Backup directory
const BACKUP_DIR = process.env.BACKUP_DIR || '/tmp/menuqr-backups';

// Ensure backup directory exists
const ensureBackupDir = async (): Promise<void> => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
};

// Collection configurations for export
const COLLECTIONS = {
  restaurants: {
    model: Restaurant,
    name: 'restaurants',
    select: '-__v',
  },
  users: {
    model: User,
    name: 'users',
    select: '-password -refreshTokens -__v',
  },
  orders: {
    model: Order,
    name: 'orders',
    select: '-__v',
  },
  dishes: {
    model: Dish,
    name: 'dishes',
    select: '-__v',
  },
  categories: {
    model: Category,
    name: 'categories',
    select: '-__v',
  },
  customers: {
    model: Customer,
    name: 'customers',
    select: '-__v',
  },
  subscriptions: {
    model: Subscription,
    name: 'subscriptions',
    select: '-__v',
  },
  invoices: {
    model: Invoice,
    name: 'invoices',
    select: '-__v',
  },
  reservations: {
    model: Reservation,
    name: 'reservations',
    select: '-__v',
  },
  reviews: {
    model: Review,
    name: 'reviews',
    select: '-__v',
  },
  campaigns: {
    model: Campaign,
    name: 'campaigns',
    select: '-__v',
  },
  loyaltyTransactions: {
    model: LoyaltyTransaction,
    name: 'loyaltyTransactions',
    select: '-__v',
  },
};

export class BackupService {
  /**
   * Export a single collection to JSON
   */
  static async exportCollection(
    collectionName: keyof typeof COLLECTIONS,
    filters: Record<string, unknown> = {},
    limit?: number
  ): Promise<unknown[]> {
    const config = COLLECTIONS[collectionName];
    if (!config) {
      throw new Error(`Unknown collection: ${collectionName}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (config.model as any).find(filters).select(config.select);
    if (limit) {
      query = query.limit(limit);
    }

    const data = await query.lean();
    return data;
  }

  /**
   * Export all data for a specific restaurant
   */
  static async exportRestaurantData(restaurantId: string): Promise<Record<string, unknown[]>> {
    const result: Record<string, unknown[]> = {};

    // Get restaurant
    const restaurant = await Restaurant.findById(restaurantId).select('-__v').lean();
    if (restaurant) {
      result.restaurant = [restaurant];
    }

    // Get related data
    const relatedCollections = [
      { name: 'dishes', model: Dish },
      { name: 'categories', model: Category },
      { name: 'orders', model: Order },
      { name: 'customers', model: Customer },
      { name: 'reservations', model: Reservation },
      { name: 'reviews', model: Review },
      { name: 'campaigns', model: Campaign },
    ];

    for (const collection of relatedCollections) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await (collection.model as any)
        .find({ restaurantId })
        .select('-__v')
        .lean();
      result[collection.name] = data;
    }

    return result;
  }

  /**
   * Create a full backup of the database
   */
  static async createFullBackup(userId: mongoose.Types.ObjectId): Promise<typeof Backup.prototype> {
    await ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `full-backup-${timestamp}.json.gz`;
    const filePath = path.join(BACKUP_DIR, filename);

    // Create backup record
    const backup = await Backup.create({
      filename,
      type: 'full',
      collections: Object.keys(COLLECTIONS),
      status: 'in_progress',
      createdBy: userId,
    });

    try {
      const allData: Record<string, unknown[]> = {};
      let totalRecords = 0;

      // Export each collection
      const collectionNames = Object.keys(COLLECTIONS) as (keyof typeof COLLECTIONS)[];
      for (let i = 0; i < collectionNames.length; i++) {
        const collectionName = collectionNames[i];
        const data = await this.exportCollection(collectionName);
        allData[collectionName] = data;
        totalRecords += data.length;

        // Update progress
        const progress = Math.round(((i + 1) / collectionNames.length) * 80);
        await backup.updateProgress(progress);
      }

      // Write compressed file
      const jsonData = JSON.stringify(allData, null, 2);
      const writeStream = fs.createWriteStream(filePath);
      const gzip = createGzip();

      await pipelineAsync(
        Readable.from([jsonData]),
        gzip,
        writeStream
      );

      // Get file size
      const stats = fs.statSync(filePath);

      // Mark as completed
      await backup.markCompleted(
        stats.size,
        filePath,
        `/api/v1/superadmin/backups/${backup._id}/download`
      );

      backup.metadata = {
        recordCount: totalRecords,
        compressedSize: stats.size,
        format: 'json',
      };
      await backup.save();

      logger.info('Full backup created', {
        backupId: backup._id,
        size: stats.size,
        records: totalRecords,
      });

      return backup;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await backup.markFailed(errorMessage);
      logger.error('Backup failed', { backupId: backup._id, error: errorMessage });
      throw error;
    }
  }

  /**
   * Create a partial backup for specific collections
   */
  static async createPartialBackup(
    userId: mongoose.Types.ObjectId,
    collections: string[],
    filters?: Record<string, unknown>
  ): Promise<typeof Backup.prototype> {
    await ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `partial-backup-${timestamp}.json.gz`;
    const filePath = path.join(BACKUP_DIR, filename);

    const backup = await Backup.create({
      filename,
      type: 'partial',
      collections,
      filters,
      status: 'in_progress',
      createdBy: userId,
    });

    try {
      const allData: Record<string, unknown[]> = {};
      let totalRecords = 0;

      for (let i = 0; i < collections.length; i++) {
        const collectionName = collections[i] as keyof typeof COLLECTIONS;
        if (COLLECTIONS[collectionName]) {
          const data = await this.exportCollection(collectionName, filters);
          allData[collectionName] = data;
          totalRecords += data.length;
        }

        const progress = Math.round(((i + 1) / collections.length) * 80);
        await backup.updateProgress(progress);
      }

      const jsonData = JSON.stringify(allData, null, 2);
      const writeStream = fs.createWriteStream(filePath);
      const gzip = createGzip();

      await pipelineAsync(
        Readable.from([jsonData]),
        gzip,
        writeStream
      );

      const stats = fs.statSync(filePath);
      await backup.markCompleted(
        stats.size,
        filePath,
        `/api/v1/superadmin/backups/${backup._id}/download`
      );

      backup.metadata = {
        recordCount: totalRecords,
        compressedSize: stats.size,
        format: 'json',
      };
      await backup.save();

      return backup;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await backup.markFailed(errorMessage);
      throw error;
    }
  }

  /**
   * Get list of backups with pagination
   */
  static async getBackups(
    page: number = 1,
    limit: number = 20,
    filters: { status?: string; type?: string } = {}
  ): Promise<{ backups: (typeof Backup.prototype)[]; total: number; pages: number }> {
    const query: Record<string, unknown> = {};
    if (filters.status) {query.status = filters.status;}
    if (filters.type) {query.type = filters.type;}

    const skip = (page - 1) * limit;

    const [backups, total] = await Promise.all([
      Backup.find(query)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Backup.countDocuments(query),
    ]);

    return {
      backups,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get backup by ID
   */
  static async getBackupById(id: string): Promise<typeof Backup.prototype | null> {
    return Backup.findById(id).populate('createdBy', 'name email');
  }

  /**
   * Delete a backup
   */
  static async deleteBackup(id: string): Promise<boolean> {
    const backup = await Backup.findById(id);
    if (!backup) {
      return false;
    }

    // Delete file if exists
    if (backup.filePath && fs.existsSync(backup.filePath)) {
      fs.unlinkSync(backup.filePath);
    }

    await Backup.findByIdAndDelete(id);
    return true;
  }

  /**
   * Get backup file stream for download
   */
  static async getBackupStream(id: string): Promise<{
    stream: fs.ReadStream;
    filename: string;
    size: number;
  } | null> {
    const backup = await Backup.findById(id);
    if (!backup || backup.status !== 'completed' || !backup.filePath) {
      return null;
    }

    if (!fs.existsSync(backup.filePath)) {
      return null;
    }

    const stream = fs.createReadStream(backup.filePath);
    return {
      stream,
      filename: backup.filename,
      size: backup.size,
    };
  }

  /**
   * Get backup statistics
   */
  static async getStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    completedCount: number;
    failedCount: number;
    pendingCount: number;
    lastBackup: Date | null;
  }> {
    const [stats, lastBackup] = await Promise.all([
      Backup.aggregate([
        {
          $group: {
            _id: null,
            totalBackups: { $sum: 1 },
            totalSize: { $sum: '$size' },
            completedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            failedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
            pendingCount: {
              $sum: { $cond: [{ $in: ['$status', ['pending', 'in_progress']] }, 1, 0] },
            },
          },
        },
      ]),
      Backup.findOne({ status: 'completed' })
        .sort({ completedAt: -1 })
        .select('completedAt'),
    ]);

    const result = stats[0] || {
      totalBackups: 0,
      totalSize: 0,
      completedCount: 0,
      failedCount: 0,
      pendingCount: 0,
    };

    return {
      ...result,
      lastBackup: lastBackup?.completedAt || null,
    };
  }

  /**
   * Cleanup old backups (older than 30 days)
   */
  static async cleanupOldBackups(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldBackups = await Backup.find({
      createdAt: { $lt: thirtyDaysAgo },
      status: 'completed',
    });

    let deletedCount = 0;
    for (const backup of oldBackups) {
      if (backup.filePath && fs.existsSync(backup.filePath)) {
        fs.unlinkSync(backup.filePath);
      }
      await backup.deleteOne();
      deletedCount++;
    }

    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} old backups`);
    }

    return deletedCount;
  }
}

export default BackupService;
