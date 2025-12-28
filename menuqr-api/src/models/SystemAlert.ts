import mongoose, { Document, Schema, Model } from 'mongoose';

export type AlertType = 'info' | 'warning' | 'error' | 'critical';
export type AlertCategory = 'security' | 'performance' | 'billing' | 'system' | 'database' | 'integration';
export type AlertPriority = 'low' | 'medium' | 'high' | 'urgent';

// Static methods interface
interface ISystemAlertStatics extends Model<ISystemAlert> {
  createAlert(data: {
    type: AlertType;
    category: AlertCategory;
    priority?: AlertPriority;
    title: string;
    message: string;
    details?: Record<string, unknown>;
    source?: string;
    expiresAt?: Date;
    metadata?: Record<string, unknown>;
  }): Promise<ISystemAlert>;
  acknowledge(alertId: mongoose.Types.ObjectId, user: { _id: mongoose.Types.ObjectId; name: string }): Promise<ISystemAlert | null>;
  resolve(alertId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId, resolutionNote?: string): Promise<ISystemAlert | null>;
  securityAlert(title: string, message: string, details?: Record<string, unknown>): Promise<ISystemAlert>;
  performanceAlert(title: string, message: string, details?: Record<string, unknown>): Promise<ISystemAlert>;
  billingAlert(title: string, message: string, details?: Record<string, unknown>): Promise<ISystemAlert>;
  criticalAlert(title: string, message: string, category: AlertCategory, details?: Record<string, unknown>): Promise<ISystemAlert>;
}

export interface ISystemAlert extends Document {
  _id: mongoose.Types.ObjectId;
  type: AlertType;
  category: AlertCategory;
  priority: AlertPriority;
  title: string;
  message: string;
  details?: Record<string, unknown>;
  source: string;
  isResolved: boolean;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  resolutionNote?: string;
  acknowledgedBy: {
    userId: mongoose.Types.ObjectId;
    userName: string;
    acknowledgedAt: Date;
  }[];
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const systemAlertSchema = new Schema<ISystemAlert>(
  {
    type: {
      type: String,
      required: true,
      enum: ['info', 'warning', 'error', 'critical'],
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['security', 'performance', 'billing', 'system', 'database', 'integration'],
      index: true,
    },
    priority: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    source: {
      type: String,
      required: true,
      default: 'system',
    },
    isResolved: {
      type: Boolean,
      default: false,
      index: true,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
    resolutionNote: {
      type: String,
    },
    acknowledgedBy: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        userName: {
          type: String,
          required: true,
        },
        acknowledgedAt: {
          type: Date,
          required: true,
          default: Date.now,
        },
      },
    ],
    expiresAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
systemAlertSchema.index({ createdAt: -1 });
systemAlertSchema.index({ isResolved: 1, createdAt: -1 });
systemAlertSchema.index({ type: 1, isResolved: 1, createdAt: -1 });
systemAlertSchema.index({ category: 1, isResolved: 1, createdAt: -1 });
systemAlertSchema.index({ priority: 1, isResolved: 1, createdAt: -1 });

// TTL index - auto-delete resolved alerts after 30 days
systemAlertSchema.index(
  { resolvedAt: 1 },
  {
    expireAfterSeconds: 30 * 24 * 60 * 60,
    partialFilterExpression: { isResolved: true }
  }
);

// Also expire based on expiresAt field
systemAlertSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { expiresAt: { $exists: true } }
  }
);

// Static method to create an alert
systemAlertSchema.statics.createAlert = async function (data: {
  type: AlertType;
  category: AlertCategory;
  priority?: AlertPriority;
  title: string;
  message: string;
  details?: Record<string, unknown>;
  source?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}) {
  return this.create({
    type: data.type,
    category: data.category,
    priority: data.priority || 'medium',
    title: data.title,
    message: data.message,
    details: data.details,
    source: data.source || 'system',
    expiresAt: data.expiresAt,
    metadata: data.metadata,
  });
};

// Static method to acknowledge an alert
systemAlertSchema.statics.acknowledge = async function (
  alertId: mongoose.Types.ObjectId,
  user: { _id: mongoose.Types.ObjectId; name: string }
) {
  return this.findByIdAndUpdate(
    alertId,
    {
      $addToSet: {
        acknowledgedBy: {
          userId: user._id,
          userName: user.name,
          acknowledgedAt: new Date(),
        },
      },
    },
    { new: true }
  );
};

// Static method to resolve an alert
systemAlertSchema.statics.resolve = async function (
  alertId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  resolutionNote?: string
) {
  return this.findByIdAndUpdate(
    alertId,
    {
      isResolved: true,
      resolvedBy: userId,
      resolvedAt: new Date(),
      resolutionNote,
    },
    { new: true }
  );
};

// Static helper methods for common alert types
systemAlertSchema.statics.securityAlert = async function (
  title: string,
  message: string,
  details?: Record<string, unknown>
) {
  const self = this as ISystemAlertStatics;
  return self.createAlert({
    type: 'warning',
    category: 'security',
    priority: 'high',
    title,
    message,
    details,
    source: 'security-monitor',
  });
};

systemAlertSchema.statics.performanceAlert = async function (
  title: string,
  message: string,
  details?: Record<string, unknown>
) {
  const self = this as ISystemAlertStatics;
  return self.createAlert({
    type: 'warning',
    category: 'performance',
    priority: 'medium',
    title,
    message,
    details,
    source: 'performance-monitor',
  });
};

systemAlertSchema.statics.billingAlert = async function (
  title: string,
  message: string,
  details?: Record<string, unknown>
) {
  const self = this as ISystemAlertStatics;
  return self.createAlert({
    type: 'warning',
    category: 'billing',
    priority: 'high',
    title,
    message,
    details,
    source: 'billing-service',
  });
};

systemAlertSchema.statics.criticalAlert = async function (
  title: string,
  message: string,
  category: AlertCategory,
  details?: Record<string, unknown>
) {
  const self = this as ISystemAlertStatics;
  return self.createAlert({
    type: 'critical',
    category,
    priority: 'urgent',
    title,
    message,
    details,
    source: 'system',
  });
};

// Virtual for isAcknowledged (by any user)
systemAlertSchema.virtual('isAcknowledged').get(function () {
  return this.acknowledgedBy && this.acknowledgedBy.length > 0;
});

// Ensure virtuals are included in JSON
systemAlertSchema.set('toJSON', { virtuals: true });
systemAlertSchema.set('toObject', { virtuals: true });

export const SystemAlert = mongoose.model<ISystemAlert, ISystemAlertStatics>('SystemAlert', systemAlertSchema);
