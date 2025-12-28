/**
 * Session Model
 * Tracks active user sessions with device information
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  refreshToken: string;
  deviceInfo: {
    type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    browser?: string;
    os?: string;
    name?: string; // User-friendly device name
  };
  ipAddress?: string;
  location?: {
    country?: string;
    city?: string;
  };
  lastActiveAt: Date;
  createdAt: Date;
  expiresAt: Date;
  isCurrent?: boolean; // Virtual - set at query time
}

interface ISessionStatics extends Model<ISession> {
  parseUserAgent(userAgent?: string): ISession['deviceInfo'];
  cleanupExpiredSessions(): Promise<number>;
}

const sessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshToken: {
      type: String,
      required: true,
      unique: true,
      select: false, // Don't expose token in queries
    },
    deviceInfo: {
      type: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'unknown'],
        default: 'unknown',
      },
      browser: String,
      os: String,
      name: String,
    },
    ipAddress: {
      type: String,
    },
    location: {
      country: String,
      city: String,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for cleanup of expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for user session queries
sessionSchema.index({ userId: 1, lastActiveAt: -1 });

/**
 * Parse user agent string to extract device info
 */
sessionSchema.statics.parseUserAgent = function (userAgent?: string): ISession['deviceInfo'] {
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
  if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('opera')) browser = 'Opera';

  // Detect OS
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac os')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  // Generate device name
  const name = `${browser} on ${os}`;

  return { type, browser, os, name };
};

/**
 * Cleanup expired sessions (backup, TTL index should handle this)
 */
sessionSchema.statics.cleanupExpiredSessions = async function (): Promise<number> {
  const result = await this.deleteMany({ expiresAt: { $lt: new Date() } });
  return result.deletedCount;
};

export const Session = mongoose.model<ISession, ISessionStatics>('Session', sessionSchema);
export default Session;
