import mongoose, { Document, Schema } from 'mongoose';

// ============================================
// Types & Interfaces
// ============================================

export type RoomType = 'standard' | 'superior' | 'deluxe' | 'suite' | 'penthouse' | 'studio' | 'apartment';
export type RoomStatus = 'vacant' | 'occupied' | 'checkout' | 'maintenance' | 'blocked' | 'cleaning';

export interface ICurrentGuest {
  guestId?: mongoose.Types.ObjectId;
  name: string;
  checkInDate: Date;
  checkOutDate: Date;
  pin?: string;             // Hashed room PIN
  accessCode?: string;      // Hashed check-in code
}

export interface IDeliveryPreferences {
  defaultTip?: number;
  preferredTime?: string;   // "morning", "afternoon", "evening"
  dietaryRestrictions?: string[];
  allergies?: string[];
  leaveAtDoor?: boolean;
  callBeforeDelivery?: boolean;
}

export interface IRoom extends Document {
  _id: mongoose.Types.ObjectId;
  hotelId: mongoose.Types.ObjectId;

  // Room Identity
  roomNumber: string;           // "101", "1205", "PH-A"
  displayName?: string;         // "Deluxe Suite", "Presidential Suite"

  // Location
  building?: string;            // Building code
  floor: number;
  zone?: string;               // "North Wing"

  // Room Details
  type: RoomType;
  maxOccupancy: number;
  amenities?: string[];        // "wifi", "minibar", "balcony"
  bedType?: string;            // "king", "queen", "twin"

  // QR Code
  qrCode: string;              // Unique QR code for this room
  qrCodeUrl?: string;          // URL to QR code image

  // Service Settings
  roomServiceEnabled: boolean;
  specialInstructions?: string; // "Leave at door", "Call before delivery"

  // Current Status
  status: RoomStatus;

  // Current Guest (if occupied)
  currentGuestId?: mongoose.Types.ObjectId;  // Reference to HotelGuest
  currentGuest?: ICurrentGuest;              // Embedded guest info for quick access

  // Timestamps for guest flow
  lastCheckIn?: Date;
  lastCheckOut?: Date;
  lastCleaned?: Date;

  // Preferences (saved from guests, used as defaults)
  deliveryPreferences?: IDeliveryPreferences;

  // Order Statistics
  totalOrders: number;
  totalRevenue: number;
  lastOrderAt?: Date;

  isActive: boolean;
  order: number;               // Sort order

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Schema Definition
// ============================================

const currentGuestSchema = new Schema<ICurrentGuest>(
  {
    guestId: { type: Schema.Types.ObjectId, ref: 'HotelGuest' },
    name: { type: String, required: true, trim: true },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    pin: { type: String, select: false },        // Hashed
    accessCode: { type: String, select: false }, // Hashed
  },
  { _id: false }
);

const deliveryPreferencesSchema = new Schema<IDeliveryPreferences>(
  {
    defaultTip: { type: Number, min: 0 },
    preferredTime: { type: String, enum: ['morning', 'afternoon', 'evening'] },
    dietaryRestrictions: [{ type: String }],
    allergies: [{ type: String }],
    leaveAtDoor: { type: Boolean, default: false },
    callBeforeDelivery: { type: Boolean, default: true },
  },
  { _id: false }
);

const roomSchema = new Schema<IRoom>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hotel',
      required: [true, 'Hotel ID is required'],
    },

    // Room Identity
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
      maxlength: [20, 'Room number cannot exceed 20 characters'],
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters'],
    },

    // Location
    building: {
      type: String,
      trim: true,
      uppercase: true,
    },
    floor: {
      type: Number,
      required: [true, 'Floor is required'],
      default: 1,
    },
    zone: {
      type: String,
      trim: true,
    },

    // Room Details
    type: {
      type: String,
      enum: ['standard', 'superior', 'deluxe', 'suite', 'penthouse', 'studio', 'apartment'],
      default: 'standard',
    },
    maxOccupancy: {
      type: Number,
      default: 2,
      min: 1,
      max: 20,
    },
    amenities: [{ type: String, trim: true }],
    bedType: {
      type: String,
      enum: ['king', 'queen', 'twin', 'double', 'single', 'sofa_bed'],
    },

    // QR Code
    qrCode: {
      type: String,
      required: true,
      unique: true,
    },
    qrCodeUrl: { type: String },

    // Service Settings
    roomServiceEnabled: {
      type: Boolean,
      default: true,
    },
    specialInstructions: {
      type: String,
      maxlength: [500, 'Special instructions cannot exceed 500 characters'],
    },

    // Status
    status: {
      type: String,
      enum: ['vacant', 'occupied', 'checkout', 'maintenance', 'blocked', 'cleaning'],
      default: 'vacant',
    },

    // Current Guest Reference
    currentGuestId: {
      type: Schema.Types.ObjectId,
      ref: 'HotelGuest',
    },

    // Current Guest (embedded for quick access)
    currentGuest: currentGuestSchema,

    // Guest flow timestamps
    lastCheckIn: { type: Date },
    lastCheckOut: { type: Date },
    lastCleaned: { type: Date },

    // Preferences
    deliveryPreferences: deliveryPreferencesSchema,

    // Statistics
    totalOrders: { type: Number, default: 0, min: 0 },
    totalRevenue: { type: Number, default: 0, min: 0 },
    lastOrderAt: { type: Date },

    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// Pre-save Hooks
// ============================================

// Generate QR code if not set
roomSchema.pre('save', async function () {
  if (!this.qrCode) {
    // Generate unique QR code: hotel-room-timestamp-random
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    this.qrCode = `${this.hotelId.toString().slice(-6)}-${this.roomNumber}-${timestamp}-${random}`.toUpperCase();
  }
});

// ============================================
// Indexes
// ============================================

roomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ hotelId: 1, floor: 1 });
roomSchema.index({ hotelId: 1, status: 1 });
roomSchema.index({ hotelId: 1, building: 1, floor: 1 });
roomSchema.index({ qrCode: 1 }, { unique: true });
roomSchema.index({ hotelId: 1, isActive: 1 });
roomSchema.index({ hotelId: 1, type: 1 });
roomSchema.index({ 'currentGuest.guestId': 1 });

// ============================================
// Virtual Properties
// ============================================

roomSchema.virtual('isOccupied').get(function () {
  return this.status === 'occupied' && this.currentGuest !== null;
});

roomSchema.virtual('fullRoomNumber').get(function () {
  if (this.building) {
    return `${this.building}-${this.roomNumber}`;
  }
  return this.roomNumber;
});

// Ensure virtuals are included in JSON
roomSchema.set('toJSON', { virtuals: true });
roomSchema.set('toObject', { virtuals: true });

// ============================================
// Static Methods
// ============================================

roomSchema.statics.findByQRCode = function (qrCode: string) {
  return this.findOne({ qrCode, isActive: true });
};

roomSchema.statics.findOccupiedRooms = function (hotelId: mongoose.Types.ObjectId) {
  return this.find({ hotelId, status: 'occupied', isActive: true });
};

roomSchema.statics.findVacantRooms = function (hotelId: mongoose.Types.ObjectId) {
  return this.find({ hotelId, status: 'vacant', isActive: true });
};

roomSchema.statics.findByFloor = function (hotelId: mongoose.Types.ObjectId, floor: number) {
  return this.find({ hotelId, floor, isActive: true }).sort({ roomNumber: 1 });
};

// ============================================
// Instance Methods
// ============================================

roomSchema.methods.checkIn = async function (
  guestId: mongoose.Types.ObjectId | undefined,
  guestName: string,
  checkInDate: Date,
  checkOutDate: Date,
  pin?: string,
  accessCode?: string
) {
  this.status = 'occupied';
  this.currentGuest = {
    guestId,
    name: guestName,
    checkInDate,
    checkOutDate,
    pin,        // Should be hashed before calling
    accessCode, // Should be hashed before calling
  };
  return this.save();
};

roomSchema.methods.checkOut = async function () {
  this.status = 'checkout';
  this.currentGuest = undefined;
  return this.save();
};

roomSchema.methods.setMaintenance = async function (reason?: string) {
  this.status = 'maintenance';
  if (reason) {
    this.specialInstructions = reason;
  }
  return this.save();
};

// ============================================
// Export
// ============================================

export const Room = mongoose.model<IRoom>('Room', roomSchema);
export default Room;
