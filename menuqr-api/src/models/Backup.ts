import mongoose, { Document, Schema } from 'mongoose';

export type BackupType = 'full' | 'partial' | 'export';
export type BackupStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface IBackup extends Document {
  _id: mongoose.Types.ObjectId;
  filename: string;
  type: BackupType;
  size: number; // bytes
  collections: string[];
  filters?: Record<string, unknown>;
  status: BackupStatus;
  progress?: number; // 0-100
  createdBy: mongoose.Types.ObjectId;
  completedAt?: Date;
  expiresAt?: Date;
  downloadUrl?: string;
  filePath?: string;
  error?: string;
  metadata?: {
    recordCount?: number;
    compressedSize?: number;
    format?: 'json' | 'csv' | 'zip';
  };
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  markCompleted(size: number, filePath: string, downloadUrl?: string): Promise<IBackup>;
  markFailed(error: string): Promise<IBackup>;
  updateProgress(progress: number): Promise<IBackup>;
}

const backupSchema = new Schema<IBackup>(
  {
    filename: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['full', 'partial', 'export'],
      index: true,
    },
    size: {
      type: Number,
      default: 0,
    },
    collections: [{
      type: String,
    }],
    filters: {
      type: Schema.Types.Mixed,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'in_progress', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    completedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    downloadUrl: {
      type: String,
    },
    filePath: {
      type: String,
    },
    error: {
      type: String,
    },
    metadata: {
      recordCount: Number,
      compressedSize: Number,
      format: {
        type: String,
        enum: ['json', 'csv', 'zip'],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding expired backups
backupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for efficient querying
backupSchema.index({ createdAt: -1 });
backupSchema.index({ status: 1, createdAt: -1 });

// Static method to get backup stats
backupSchema.statics.getStats = async function () {
  const [stats] = await this.aggregate([
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
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
        },
      },
    },
  ]);

  return stats || {
    totalBackups: 0,
    totalSize: 0,
    completedCount: 0,
    failedCount: 0,
    pendingCount: 0,
  };
};

// Instance method to mark as completed
backupSchema.methods.markCompleted = async function (size: number, filePath: string, downloadUrl?: string) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.size = size;
  this.filePath = filePath;
  this.downloadUrl = downloadUrl;
  this.progress = 100;
  // Set expiration to 30 days from now
  this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return this.save();
};

// Instance method to mark as failed
backupSchema.methods.markFailed = async function (error: string) {
  this.status = 'failed';
  this.error = error;
  return this.save();
};

// Instance method to update progress
backupSchema.methods.updateProgress = async function (progress: number) {
  this.progress = Math.min(100, Math.max(0, progress));
  if (this.status === 'pending') {
    this.status = 'in_progress';
  }
  return this.save();
};

export const Backup = mongoose.model<IBackup>('Backup', backupSchema);
