import mongoose, { Document, Schema, Types } from 'mongoose';

export type NotificationType =
  | 'info'
  | 'warning'
  | 'error'
  | 'success'
  | 'subscription_expiring'
  | 'subscription_expired'
  | 'payment_failed'
  | 'payment_success'
  | 'system_maintenance'
  | 'feature_update'
  | 'security_alert';

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface INotification extends Document {
  _id: Types.ObjectId;
  recipientType: 'user' | 'restaurant' | 'all';
  recipientId?: Types.ObjectId;
  recipientIds?: Types.ObjectId[];
  title: string;
  message: string;
  type: NotificationType;
  channels: NotificationChannel[];
  status: NotificationStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: {
    actionUrl?: string;
    actionLabel?: string;
    imageUrl?: string;
    data?: Record<string, unknown>;
  };
  scheduledAt?: Date;
  sentAt?: Date;
  readAt?: Date;
  expiresAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientType: {
      type: String,
      enum: ['user', 'restaurant', 'all'],
      required: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      refPath: 'recipientType',
    },
    recipientIds: [{
      type: Schema.Types.ObjectId,
    }],
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: [
        'info',
        'warning',
        'error',
        'success',
        'subscription_expiring',
        'subscription_expired',
        'payment_failed',
        'payment_success',
        'system_maintenance',
        'feature_update',
        'security_alert',
      ],
      default: 'info',
    },
    channels: [{
      type: String,
      enum: ['in_app', 'email', 'sms', 'push'],
      default: ['in_app'],
    }],
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    metadata: {
      actionUrl: String,
      actionLabel: String,
      imageUrl: String,
      data: Schema.Types.Mixed,
    },
    scheduledAt: Date,
    sentAt: Date,
    readAt: Date,
    expiresAt: Date,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ recipientType: 1, recipientId: 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ scheduledAt: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
