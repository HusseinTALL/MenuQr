import mongoose, { Schema, Document } from 'mongoose';

export interface ITokenBlacklist extends Document {
  token: string;
  userId: mongoose.Types.ObjectId;
  type: 'access' | 'refresh';
  expiresAt: Date;
  createdAt: Date;
}

const tokenBlacklistSchema = new Schema<ITokenBlacklist>(
  {
    token: {
      type: String,
      required: true,
      unique: true, // unique: true automatically creates an index
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['access', 'refresh'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// TTL index - automatically delete expired tokens
tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to check if token is blacklisted
tokenBlacklistSchema.statics.isBlacklisted = async function (token: string): Promise<boolean> {
  const found = await this.findOne({ token });
  return !!found;
};

// Static method to blacklist a token
tokenBlacklistSchema.statics.blacklistToken = async function (
  token: string,
  userId: mongoose.Types.ObjectId,
  type: 'access' | 'refresh',
  expiresAt: Date
): Promise<ITokenBlacklist> {
  return this.create({ token, userId, type, expiresAt });
};

// Static method to blacklist all tokens for a user
tokenBlacklistSchema.statics.blacklistAllUserTokens = async function (
  _userId: mongoose.Types.ObjectId
): Promise<void> {
  // This is a placeholder - in practice, we'd need to track all active tokens
  // For now, we just ensure the user's refresh token in the User model is cleared
};

export const TokenBlacklist = mongoose.model<ITokenBlacklist>('TokenBlacklist', tokenBlacklistSchema);
export default TokenBlacklist;
