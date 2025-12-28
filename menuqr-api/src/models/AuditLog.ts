import mongoose, { Document, Schema } from 'mongoose';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'password_reset'
  | 'password_change'
  | 'settings_change'
  | 'permission_change'
  | 'status_change'
  | 'export'
  | 'import'
  | 'impersonate'
  | 'bulk_action';

export type AuditCategory =
  | 'authentication'
  | 'user'
  | 'restaurant'
  | 'order'
  | 'subscription'
  | 'settings'
  | 'system'
  | 'billing';

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  action: AuditAction;
  category: AuditCategory;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  userRole: string;
  targetType?: string;
  targetId?: mongoose.Types.ObjectId;
  targetName?: string;
  description: string;
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'create',
        'update',
        'delete',
        'login',
        'logout',
        'login_failed',
        'password_reset',
        'password_change',
        'settings_change',
        'permission_change',
        'status_change',
        'export',
        'import',
        'impersonate',
        'bulk_action',
      ],
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'authentication',
        'user',
        'restaurant',
        'order',
        'subscription',
        'settings',
        'system',
        'billing',
      ],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    targetType: {
      type: String,
    },
    targetId: {
      type: Schema.Types.ObjectId,
    },
    targetName: {
      type: String,
    },
    description: {
      type: String,
      required: true,
    },
    changes: [
      {
        field: String,
        oldValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
      },
    ],
    metadata: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    status: {
      type: String,
      required: true,
      enum: ['success', 'failure'],
      default: 'success',
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Index for efficient querying
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

// TTL index to automatically delete old logs after 1 year
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Static method to create audit log
auditLogSchema.statics.log = async function (data: {
  action: AuditAction;
  category: AuditCategory;
  user: { _id: mongoose.Types.ObjectId; name: string; email: string; role: string };
  description: string;
  target?: { type: string; id: mongoose.Types.ObjectId; name: string };
  changes?: { field: string; oldValue: unknown; newValue: unknown }[];
  metadata?: Record<string, unknown>;
  request?: { ip?: string; userAgent?: string };
  status?: 'success' | 'failure';
  errorMessage?: string;
}) {
  return this.create({
    action: data.action,
    category: data.category,
    userId: data.user._id,
    userName: data.user.name,
    userEmail: data.user.email,
    userRole: data.user.role,
    targetType: data.target?.type,
    targetId: data.target?.id,
    targetName: data.target?.name,
    description: data.description,
    changes: data.changes,
    metadata: data.metadata,
    ipAddress: data.request?.ip,
    userAgent: data.request?.userAgent,
    status: data.status || 'success',
    errorMessage: data.errorMessage,
  });
};

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
