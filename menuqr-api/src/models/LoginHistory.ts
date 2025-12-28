import mongoose, { Document, Schema, Model } from 'mongoose';

export type LoginStatus = 'success' | 'failed';
export type LoginFailureReason =
  | 'invalid_credentials'
  | 'account_locked'
  | 'account_disabled'
  | 'session_expired'
  | 'token_revoked'
  | 'ip_blocked'
  | 'too_many_attempts'
  | 'other';

// Static methods interface
interface ILoginHistoryStatics extends Model<ILoginHistory> {
  parseUserAgent(userAgent?: string): ILoginHistory['device'];
  logLogin(data: {
    user?: { _id: mongoose.Types.ObjectId; name: string; email: string; role: string };
    email: string;
    status: LoginStatus;
    failureReason?: LoginFailureReason;
    request?: { ip?: string; userAgent?: string };
    sessionId?: string;
  }): Promise<ILoginHistory>;
  logLogout(sessionId: string): Promise<ILoginHistory | null>;
}

export interface ILoginHistory extends Document {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  userEmail: string;
  userName?: string;
  userRole?: string;
  loginAt: Date;
  logoutAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  device?: {
    type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    browser?: string;
    os?: string;
  };
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
  status: LoginStatus;
  failureReason?: LoginFailureReason;
  sessionId?: string;
  createdAt: Date;
}

const loginHistorySchema = new Schema<ILoginHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      index: true,
    },
    userName: {
      type: String,
    },
    userRole: {
      type: String,
    },
    loginAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    logoutAt: {
      type: Date,
    },
    ipAddress: {
      type: String,
      index: true,
    },
    userAgent: {
      type: String,
    },
    device: {
      type: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'unknown'],
        default: 'unknown',
      },
      browser: String,
      os: String,
    },
    location: {
      country: String,
      city: String,
      region: String,
    },
    status: {
      type: String,
      required: true,
      enum: ['success', 'failed'],
      index: true,
    },
    failureReason: {
      type: String,
      enum: [
        'invalid_credentials',
        'account_locked',
        'account_disabled',
        'session_expired',
        'token_revoked',
        'ip_blocked',
        'too_many_attempts',
        'other',
      ],
    },
    sessionId: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for efficient querying
loginHistorySchema.index({ loginAt: -1 });
loginHistorySchema.index({ userId: 1, loginAt: -1 });
loginHistorySchema.index({ status: 1, loginAt: -1 });
loginHistorySchema.index({ ipAddress: 1, loginAt: -1 });

// TTL index - auto-delete after 90 days
loginHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Helper to parse user agent
loginHistorySchema.statics.parseUserAgent = function (userAgent?: string): ILoginHistory['device'] {
  if (!userAgent) {
    return { type: 'unknown' };
  }

  const ua = userAgent.toLowerCase();
  let type: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';
  let browser = 'Unknown';
  let os = 'Unknown';

  // Detect device type
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
    type = 'mobile';
  } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
    type = 'tablet';
  } else if (/windows|macintosh|linux|x11/i.test(ua)) {
    type = 'desktop';
  }

  // Detect browser
  if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('edg/')) {
    browser = 'Edge';
  } else if (ua.includes('chrome')) {
    browser = 'Chrome';
  } else if (ua.includes('safari')) {
    browser = 'Safari';
  } else if (ua.includes('opera') || ua.includes('opr/')) {
    browser = 'Opera';
  }

  // Detect OS
  if (ua.includes('windows')) {
    os = 'Windows';
  } else if (ua.includes('mac os')) {
    os = 'macOS';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    os = 'iOS';
  }

  return { type, browser, os };
};

// Static method to log a login attempt
loginHistorySchema.statics.logLogin = async function (data: {
  user?: { _id: mongoose.Types.ObjectId; name: string; email: string; role: string };
  email: string;
  status: LoginStatus;
  failureReason?: LoginFailureReason;
  request?: { ip?: string; userAgent?: string };
  sessionId?: string;
}) {
  const self = this as ILoginHistoryStatics;
  const device = self.parseUserAgent(data.request?.userAgent);

  return this.create({
    userId: data.user?._id,
    userEmail: data.email,
    userName: data.user?.name,
    userRole: data.user?.role,
    loginAt: new Date(),
    ipAddress: data.request?.ip,
    userAgent: data.request?.userAgent,
    device,
    status: data.status,
    failureReason: data.failureReason,
    sessionId: data.sessionId,
  });
};

// Static method to log a logout
loginHistorySchema.statics.logLogout = async function (sessionId: string) {
  return this.findOneAndUpdate(
    { sessionId, logoutAt: null },
    { logoutAt: new Date() },
    { sort: { loginAt: -1 } }
  );
};

// Virtual for session duration
loginHistorySchema.virtual('sessionDuration').get(function () {
  if (!this.logoutAt) {return null;}
  return this.logoutAt.getTime() - this.loginAt.getTime();
});

// Ensure virtuals are included in JSON
loginHistorySchema.set('toJSON', { virtuals: true });
loginHistorySchema.set('toObject', { virtuals: true });

export const LoginHistory = mongoose.model<ILoginHistory, ILoginHistoryStatics>('LoginHistory', loginHistorySchema);
