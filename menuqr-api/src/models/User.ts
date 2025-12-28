import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { Permission } from '../config/permissions.js';

// Available roles for staff/admin users
export type UserRole = 'superadmin' | 'owner' | 'admin' | 'manager' | 'kitchen' | 'cashier' | 'staff';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  restaurantId?: mongoose.Types.ObjectId;
  isActive: boolean;
  refreshToken?: string;
  lastLogin?: Date;
  // Custom permissions (overrides role defaults if set)
  customPermissions?: Permission[];
  // Staff management
  createdBy?: mongoose.Types.ObjectId; // Who created this user (for staff tracking)
  // Account security
  failedLoginAttempts: number;
  lockUntil?: Date;
  isLocked: boolean;
  // Two-Factor Authentication
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
  twoFactorVerifiedAt?: Date;
  // Password expiration
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      validate: {
        validator: function (password: string) {
          // At least 1 uppercase, 1 lowercase, 1 number
          const hasUppercase = /[A-Z]/.test(password);
          const hasLowercase = /[a-z]/.test(password);
          const hasNumber = /\d/.test(password);
          return hasUppercase && hasLowercase && hasNumber;
        },
        message:
          'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      },
      select: false,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    role: {
      type: String,
      enum: ['superadmin', 'owner', 'admin', 'manager', 'kitchen', 'cashier', 'staff'],
      default: 'owner',
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
    },
    // Custom permissions - allows overriding default role permissions
    customPermissions: {
      type: [String],
      default: undefined, // null means use role defaults
    },
    // Track who created this staff member
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    lastLogin: {
      type: Date,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    // Two-Factor Authentication
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false, // Don't include in queries by default
    },
    twoFactorBackupCodes: {
      type: [String],
      select: false,
    },
    twoFactorVerifiedAt: {
      type: Date,
    },
    // Password expiration tracking
    passwordChangedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving and track password change
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  // Track when password was changed (for expiration policy)
  this.passwordChangedAt = new Date();
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes for faster queries (email index created by unique: true)
userSchema.index({ restaurantId: 1 });
userSchema.index({ createdBy: 1 });
userSchema.index({ restaurantId: 1, role: 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function () {
  // Check if lockUntil exists and is in the future
  return !!(this.lockUntil && this.lockUntil > new Date());
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

export const User = mongoose.model<IUser>('User', userSchema);
export default User;
