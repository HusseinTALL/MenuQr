import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
  _id: mongoose.Types.ObjectId;
  phone: string;
  restaurantId: mongoose.Types.ObjectId;
  code: string;
  type: 'register' | 'login' | 'reset_password';
  expiresAt: Date;
  attempts: number;
  isUsed: boolean;
  createdAt: Date;
}

const otpSchema = new Schema<IOTP>(
  {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Restaurant ID is required'],
    },
    code: {
      type: String,
      required: [true, 'OTP code is required'],
      length: 6,
    },
    type: {
      type: String,
      enum: ['register', 'login', 'reset_password'],
      required: [true, 'OTP type is required'],
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    },
    attempts: {
      type: Number,
      default: 0,
      max: 3,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries and cleanup
otpSchema.index({ phone: 1, restaurantId: 1, type: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired OTPs

// Static method to generate OTP code
otpSchema.statics.generateCode = function (): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Method to check if OTP is valid
otpSchema.methods.isValid = function (): boolean {
  return !this.isUsed && this.attempts < 3 && new Date() < this.expiresAt;
};

// Method to increment attempts
otpSchema.methods.incrementAttempts = async function (): Promise<void> {
  this.attempts += 1;
  await this.save();
};

// Method to mark as used
otpSchema.methods.markAsUsed = async function (): Promise<void> {
  this.isUsed = true;
  await this.save();
};

export interface IOTPModel extends mongoose.Model<IOTP> {
  generateCode(): string;
}

export const OTP = mongoose.model<IOTP, IOTPModel>('OTP', otpSchema);
export default OTP;
