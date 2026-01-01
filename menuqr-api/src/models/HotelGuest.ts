import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// ============================================
// Types & Interfaces
// ============================================

export interface IHotelGuest extends Document {
  _id: mongoose.Types.ObjectId;
  hotelId: mongoose.Types.ObjectId;

  // Guest Identity
  name: string;
  email?: string;
  phone?: string;

  // Stay Information
  reservationNumber?: string;
  roomId: mongoose.Types.ObjectId;
  roomNumber: string;
  checkInDate: Date;
  checkOutDate: Date;

  // Authentication
  pin?: string;                 // Hashed
  accessCode?: string;          // Check-in code (hashed)
  isVerified: boolean;

  // Preferences
  language: string;
  dietaryPreferences?: string[];
  allergens?: string[];
  deliveryPreferences?: {
    leaveAtDoor: boolean;
    callBeforeDelivery: boolean;
    defaultTip?: number;
  };

  // Statistics
  totalOrders: number;
  totalSpent: number;
  lastOrderAt?: Date;

  // Loyalty (optional - link to customer)
  linkedCustomerId?: mongoose.Types.ObjectId;

  // Session
  refreshToken?: string;
  lastLoginAt?: Date;

  // Security - Rate Limiting
  failedPinAttempts: number;
  pinLockedUntil?: Date;
  lastFailedPinAttempt?: Date;
  failedAccessCodeAttempts: number;
  accessCodeLockedUntil?: Date;

  isActive: boolean;
  checkedOutAt?: Date;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePin(candidatePin: string): Promise<boolean>;
  compareAccessCode(candidateCode: string): Promise<boolean>;
  isPinLocked(): boolean;
  isAccessCodeLocked(): boolean;
  recordFailedPinAttempt(): Promise<void>;
  recordFailedAccessCodeAttempt(): Promise<void>;
  resetPinAttempts(): Promise<void>;
  resetAccessCodeAttempts(): Promise<void>;
}

// ============================================
// Schema Definition
// ============================================

const hotelGuestSchema = new Schema<IHotelGuest>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hotel',
      required: [true, 'Hotel ID is required'],
    },

    // Guest Identity
    name: {
      type: String,
      required: [true, 'Guest name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[+]?[\d\s-()]+$/, 'Please enter a valid phone number'],
    },

    // Stay Information
    reservationNumber: {
      type: String,
      trim: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room ID is required'],
    },
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
    },
    checkInDate: {
      type: Date,
      required: [true, 'Check-in date is required'],
    },
    checkOutDate: {
      type: Date,
      required: [true, 'Check-out date is required'],
    },

    // Authentication
    pin: {
      type: String,
      select: false,
    },
    accessCode: {
      type: String,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Preferences
    language: {
      type: String,
      default: 'fr',
    },
    dietaryPreferences: {
      type: [String],
      default: [],
      enum: ['vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher', 'lactose-free', 'nut-free'],
    },
    allergens: {
      type: [String],
      default: [],
    },
    deliveryPreferences: {
      leaveAtDoor: { type: Boolean, default: false },
      callBeforeDelivery: { type: Boolean, default: true },
      defaultTip: { type: Number, min: 0 },
    },

    // Statistics
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastOrderAt: {
      type: Date,
    },

    // Loyalty Link
    linkedCustomerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },

    // Session
    refreshToken: {
      type: String,
      select: false,
    },
    lastLoginAt: {
      type: Date,
    },

    // Security - Rate Limiting for PIN
    failedPinAttempts: {
      type: Number,
      default: 0,
    },
    pinLockedUntil: {
      type: Date,
    },
    lastFailedPinAttempt: {
      type: Date,
    },

    // Security - Rate Limiting for Access Code
    failedAccessCodeAttempts: {
      type: Number,
      default: 0,
    },
    accessCodeLockedUntil: {
      type: Date,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    checkedOutAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// Pre-save Hooks
// ============================================

// Hash PIN before saving
// Using 12 rounds for consistency with User and Customer models
const BCRYPT_ROUNDS = 12;

hotelGuestSchema.pre('save', async function () {
  if (this.isModified('pin') && this.pin) {
    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    this.pin = await bcrypt.hash(this.pin, salt);
  }

  if (this.isModified('accessCode') && this.accessCode) {
    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
    this.accessCode = await bcrypt.hash(this.accessCode, salt);
  }
});

// ============================================
// Instance Methods
// ============================================

hotelGuestSchema.methods.comparePin = async function (
  candidatePin: string
): Promise<boolean> {
  if (!this.pin) {return false;}
  return bcrypt.compare(candidatePin, this.pin);
};

hotelGuestSchema.methods.compareAccessCode = async function (
  candidateCode: string
): Promise<boolean> {
  if (!this.accessCode) {return false;}
  return bcrypt.compare(candidateCode, this.accessCode);
};

// Rate limiting constants
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MINUTES = 15;
const MAX_ACCESS_CODE_ATTEMPTS = 5;
const ACCESS_CODE_LOCKOUT_MINUTES = 30;

hotelGuestSchema.methods.isPinLocked = function (): boolean {
  if (!this.pinLockedUntil) {return false;}
  return new Date() < this.pinLockedUntil;
};

hotelGuestSchema.methods.isAccessCodeLocked = function (): boolean {
  if (!this.accessCodeLockedUntil) {return false;}
  return new Date() < this.accessCodeLockedUntil;
};

hotelGuestSchema.methods.recordFailedPinAttempt = async function (): Promise<void> {
  this.failedPinAttempts = (this.failedPinAttempts || 0) + 1;
  this.lastFailedPinAttempt = new Date();

  // Lock after MAX_PIN_ATTEMPTS failed attempts
  if (this.failedPinAttempts >= MAX_PIN_ATTEMPTS) {
    this.pinLockedUntil = new Date(Date.now() + PIN_LOCKOUT_MINUTES * 60 * 1000);
  }

  await this.save();
};

hotelGuestSchema.methods.recordFailedAccessCodeAttempt = async function (): Promise<void> {
  this.failedAccessCodeAttempts = (this.failedAccessCodeAttempts || 0) + 1;

  // Lock after MAX_ACCESS_CODE_ATTEMPTS failed attempts
  if (this.failedAccessCodeAttempts >= MAX_ACCESS_CODE_ATTEMPTS) {
    this.accessCodeLockedUntil = new Date(Date.now() + ACCESS_CODE_LOCKOUT_MINUTES * 60 * 1000);
  }

  await this.save();
};

hotelGuestSchema.methods.resetPinAttempts = async function (): Promise<void> {
  this.failedPinAttempts = 0;
  this.pinLockedUntil = undefined;
  this.lastFailedPinAttempt = undefined;
  await this.save();
};

hotelGuestSchema.methods.resetAccessCodeAttempts = async function (): Promise<void> {
  this.failedAccessCodeAttempts = 0;
  this.accessCodeLockedUntil = undefined;
  await this.save();
};

// ============================================
// Indexes
// ============================================

hotelGuestSchema.index({ hotelId: 1, roomId: 1, isActive: 1 });
hotelGuestSchema.index({ hotelId: 1, email: 1 }, { sparse: true });
hotelGuestSchema.index({ hotelId: 1, phone: 1 }, { sparse: true });
hotelGuestSchema.index({ hotelId: 1, reservationNumber: 1 }, { sparse: true });
hotelGuestSchema.index({ hotelId: 1, checkInDate: 1, checkOutDate: 1 });
hotelGuestSchema.index({ roomId: 1, isActive: 1 });
hotelGuestSchema.index({ linkedCustomerId: 1 }, { sparse: true });

// ============================================
// Virtual Properties
// ============================================

hotelGuestSchema.virtual('isStayActive').get(function () {
  const now = new Date();
  return this.isActive && this.checkInDate <= now && this.checkOutDate >= now;
});

hotelGuestSchema.virtual('stayDuration').get(function () {
  const checkIn = new Date(this.checkInDate);
  const checkOut = new Date(this.checkOutDate);
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Days
});

// Ensure virtuals are included in JSON
hotelGuestSchema.set('toJSON', { virtuals: true });
hotelGuestSchema.set('toObject', { virtuals: true });

// ============================================
// Static Methods
// ============================================

hotelGuestSchema.statics.findActiveByRoom = function (
  hotelId: mongoose.Types.ObjectId,
  roomId: mongoose.Types.ObjectId
) {
  return this.findOne({
    hotelId,
    roomId,
    isActive: true,
    checkOutDate: { $gte: new Date() },
  });
};

hotelGuestSchema.statics.findCurrentGuests = function (hotelId: mongoose.Types.ObjectId) {
  const now = new Date();
  return this.find({
    hotelId,
    isActive: true,
    checkInDate: { $lte: now },
    checkOutDate: { $gte: now },
  }).populate('roomId');
};

hotelGuestSchema.statics.findCheckingOutToday = function (hotelId: mongoose.Types.ObjectId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.find({
    hotelId,
    isActive: true,
    checkOutDate: { $gte: today, $lt: tomorrow },
  }).populate('roomId');
};

// ============================================
// Export
// ============================================

export const HotelGuest = mongoose.model<IHotelGuest>('HotelGuest', hotelGuestSchema);
export default HotelGuest;
