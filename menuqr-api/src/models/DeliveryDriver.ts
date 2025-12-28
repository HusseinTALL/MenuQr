import mongoose, { Document, Schema } from 'mongoose';

// ============================================
// Types & Interfaces
// ============================================

export type VehicleType = 'bicycle' | 'scooter' | 'motorcycle' | 'car';
export type DriverStatus = 'pending' | 'verified' | 'suspended' | 'deactivated';
export type BackgroundCheckStatus = 'pending' | 'passed' | 'failed' | 'expired';
export type ShiftStatus = 'offline' | 'online' | 'on_break' | 'on_delivery' | 'returning';

export interface IDriverDocument {
  url: string;
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  expiresAt?: Date;
  rejectionReason?: string;
}

export interface IDriverStats {
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  completionRate: number;
  averageRating: number;
  totalRatings: number;
  onTimeRate: number;
  averageDeliveryTime: number; // minutes
  totalEarnings: number;
  totalTips: number;
}

export interface IDriverLocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
  updatedAt: Date;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

export interface IBankAccount {
  accountHolder: string;
  iban: string;
  bic: string;
  bankName?: string;
  isVerified: boolean;
}

export interface IDeliveryDriver extends Document {
  _id: mongoose.Types.ObjectId;

  // User reference (optional - for linking to existing user)
  userId?: mongoose.Types.ObjectId;

  // Authentication (separate from User model)
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  lastLoginAt?: Date;

  // Associated restaurants (can work for multiple)
  restaurantIds: mongoose.Types.ObjectId[];

  // Profile Information
  phone: string;
  profilePhoto?: string;
  dateOfBirth?: Date;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };

  // Vehicle Information
  vehicleType: VehicleType;
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  maxOrderCapacity: number;

  // Verification Status
  status: DriverStatus;
  documents: {
    idCard?: IDriverDocument;
    driverLicense?: IDriverDocument;
    vehicleRegistration?: IDriverDocument;
    insurance?: IDriverDocument;
    proofOfAddress?: IDriverDocument;
  };
  backgroundCheckStatus: BackgroundCheckStatus;
  backgroundCheckDate?: Date;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;

  // Availability & Location
  shiftStatus: ShiftStatus;
  isAvailable: boolean;
  currentLocation?: IDriverLocation;
  currentDeliveryId?: mongoose.Types.ObjectId;
  shiftStartedAt?: Date;
  lastActivityAt?: Date;

  // Performance Stats
  stats: IDriverStats;

  // Financial
  bankAccount?: IBankAccount;
  currentBalance: number; // Pending payout amount
  lifetimeEarnings: number;

  // Settings & Preferences
  preferredZones: string[]; // Postal code prefixes
  maxDeliveryRadius: number; // km
  acceptsContactlessDelivery: boolean;
  languagesSpoken: string[];

  // App & Notifications
  pushToken?: string;
  notificationPreferences: {
    newOrders: boolean;
    orderUpdates: boolean;
    promotions: boolean;
    earnings: boolean;
  };

  // Metadata
  notes?: string; // Admin notes
  suspensionReason?: string;
  deactivationReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Schema Definition
// ============================================

const driverDocumentSchema = new Schema<IDriverDocument>(
  {
    url: { type: String, required: true },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    expiresAt: { type: Date },
    rejectionReason: { type: String },
  },
  { _id: false }
);

const driverStatsSchema = new Schema<IDriverStats>(
  {
    totalDeliveries: { type: Number, default: 0 },
    completedDeliveries: { type: Number, default: 0 },
    cancelledDeliveries: { type: Number, default: 0 },
    completionRate: { type: Number, default: 100 },
    averageRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    onTimeRate: { type: Number, default: 100 },
    averageDeliveryTime: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    totalTips: { type: Number, default: 0 },
  },
  { _id: false }
);

const bankAccountSchema = new Schema<IBankAccount>(
  {
    accountHolder: { type: String, required: true },
    iban: { type: String, required: true },
    bic: { type: String, required: true },
    bankName: { type: String },
    isVerified: { type: Boolean, default: false },
  },
  { _id: false }
);

const deliveryDriverSchema = new Schema<IDeliveryDriver>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    // Authentication
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    lastLoginAt: { type: Date },

    restaurantIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
    }],

    // Profile
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[+]?[\d\s-()]+$/, 'Please enter a valid phone number'],
    },
    profilePhoto: { type: String },
    dateOfBirth: { type: Date },
    address: {
      street: { type: String },
      city: { type: String },
      postalCode: { type: String },
      country: { type: String, default: 'France' },
    },

    // Vehicle
    vehicleType: {
      type: String,
      enum: ['bicycle', 'scooter', 'motorcycle', 'car'],
      required: [true, 'Vehicle type is required'],
    },
    vehiclePlate: { type: String, uppercase: true, trim: true },
    vehicleModel: { type: String },
    vehicleColor: { type: String },
    maxOrderCapacity: {
      type: Number,
      default: 3,
      min: 1,
      max: 10,
    },

    // Verification
    status: {
      type: String,
      enum: ['pending', 'verified', 'suspended', 'deactivated'],
      default: 'pending',
    },
    documents: {
      idCard: driverDocumentSchema,
      driverLicense: driverDocumentSchema,
      vehicleRegistration: driverDocumentSchema,
      insurance: driverDocumentSchema,
      proofOfAddress: driverDocumentSchema,
    },
    backgroundCheckStatus: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'expired'],
      default: 'pending',
    },
    backgroundCheckDate: { type: Date },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // Availability
    shiftStatus: {
      type: String,
      enum: ['offline', 'online', 'on_break', 'on_delivery', 'returning'],
      default: 'offline',
    },
    isAvailable: {
      type: Boolean,
      default: false,
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
      updatedAt: { type: Date },
      accuracy: { type: Number },
      heading: { type: Number },
      speed: { type: Number },
    },
    currentDeliveryId: {
      type: Schema.Types.ObjectId,
      ref: 'Delivery',
    },
    shiftStartedAt: { type: Date },
    lastActivityAt: { type: Date },

    // Stats
    stats: {
      type: driverStatsSchema,
      default: () => ({}),
    },

    // Financial
    bankAccount: bankAccountSchema,
    currentBalance: {
      type: Number,
      default: 0,
    },
    lifetimeEarnings: {
      type: Number,
      default: 0,
    },

    // Preferences
    preferredZones: [{ type: String }],
    maxDeliveryRadius: {
      type: Number,
      default: 10, // km
      min: 1,
      max: 50,
    },
    acceptsContactlessDelivery: {
      type: Boolean,
      default: true,
    },
    languagesSpoken: [{
      type: String,
      default: ['fr'],
    }],

    // Notifications
    pushToken: { type: String },
    notificationPreferences: {
      newOrders: { type: Boolean, default: true },
      orderUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      earnings: { type: Boolean, default: true },
    },

    // Admin
    notes: { type: String },
    suspensionReason: { type: String },
    deactivationReason: { type: String },
  },
  {
    timestamps: true,
  }
);

// ============================================
// Indexes
// ============================================

// Geospatial index for location-based queries
deliveryDriverSchema.index({ 'currentLocation': '2dsphere' });

// Compound index for finding available drivers
deliveryDriverSchema.index({
  status: 1,
  shiftStatus: 1,
  isAvailable: 1,
  restaurantIds: 1,
});

// Index for user lookup
deliveryDriverSchema.index({ userId: 1 });

// Index for restaurant lookup
deliveryDriverSchema.index({ restaurantIds: 1 });

// ============================================
// Virtual Fields
// ============================================

deliveryDriverSchema.virtual('isOnline').get(function() {
  return this.shiftStatus === 'online' || this.shiftStatus === 'on_delivery';
});

deliveryDriverSchema.virtual('canAcceptDelivery').get(function() {
  return (
    this.status === 'verified' &&
    this.shiftStatus === 'online' &&
    this.isAvailable &&
    !this.currentDeliveryId
  );
});

// ============================================
// Methods
// ============================================

deliveryDriverSchema.methods.goOnline = function() {
  this.shiftStatus = 'online';
  this.isAvailable = true;
  this.shiftStartedAt = new Date();
  this.lastActivityAt = new Date();
  return this.save();
};

deliveryDriverSchema.methods.goOffline = function() {
  this.shiftStatus = 'offline';
  this.isAvailable = false;
  this.currentDeliveryId = undefined;
  this.lastActivityAt = new Date();
  return this.save();
};

deliveryDriverSchema.methods.startDelivery = function(deliveryId: mongoose.Types.ObjectId) {
  this.shiftStatus = 'on_delivery';
  this.isAvailable = false;
  this.currentDeliveryId = deliveryId;
  this.lastActivityAt = new Date();
  return this.save();
};

deliveryDriverSchema.methods.completeDelivery = function() {
  this.shiftStatus = 'online';
  this.isAvailable = true;
  this.currentDeliveryId = undefined;
  this.lastActivityAt = new Date();
  return this.save();
};

deliveryDriverSchema.methods.updateLocation = function(
  longitude: number,
  latitude: number,
  accuracy?: number,
  heading?: number,
  speed?: number
) {
  this.currentLocation = {
    type: 'Point',
    coordinates: [longitude, latitude],
    updatedAt: new Date(),
    accuracy,
    heading,
    speed,
  };
  this.lastActivityAt = new Date();
  return this.save();
};

deliveryDriverSchema.methods.updateStats = function(
  delivered: boolean,
  rating?: number,
  deliveryTime?: number,
  earnings?: number,
  tip?: number
) {
  this.stats.totalDeliveries += 1;

  if (delivered) {
    this.stats.completedDeliveries += 1;
  } else {
    this.stats.cancelledDeliveries += 1;
  }

  this.stats.completionRate =
    (this.stats.completedDeliveries / this.stats.totalDeliveries) * 100;

  if (rating) {
    const totalRatingSum = this.stats.averageRating * this.stats.totalRatings;
    this.stats.totalRatings += 1;
    this.stats.averageRating = (totalRatingSum + rating) / this.stats.totalRatings;
  }

  if (deliveryTime) {
    const totalTime = this.stats.averageDeliveryTime * (this.stats.completedDeliveries - 1);
    this.stats.averageDeliveryTime = (totalTime + deliveryTime) / this.stats.completedDeliveries;
  }

  if (earnings) {
    this.stats.totalEarnings += earnings;
    this.currentBalance += earnings;
    this.lifetimeEarnings += earnings;
  }

  if (tip) {
    this.stats.totalTips += tip;
    this.currentBalance += tip;
    this.lifetimeEarnings += tip;
  }

  return this.save();
};

// ============================================
// Static Methods
// ============================================

deliveryDriverSchema.statics.findAvailableDrivers = function(
  restaurantId: mongoose.Types.ObjectId,
  coordinates?: [number, number],
  maxDistance?: number
) {
  const query: Record<string, unknown> = {
    status: 'verified',
    shiftStatus: 'online',
    isAvailable: true,
    restaurantIds: restaurantId,
  };

  if (coordinates && maxDistance) {
    query['currentLocation'] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates,
        },
        $maxDistance: maxDistance * 1000, // Convert km to meters
      },
    };
  }

  return this.find(query);
};

deliveryDriverSchema.statics.findNearestDriver = async function(
  restaurantId: mongoose.Types.ObjectId,
  coordinates: [number, number],
  maxDistance: number = 10 // km
) {
  const drivers = await this.find({
    status: 'verified',
    shiftStatus: 'online',
    isAvailable: true,
    restaurantIds: restaurantId,
    currentLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates,
        },
        $maxDistance: maxDistance * 1000,
      },
    },
  }).limit(1);

  return drivers[0] || null;
};

// ============================================
// Export
// ============================================

export const DeliveryDriver = mongoose.model<IDeliveryDriver>('DeliveryDriver', deliveryDriverSchema);
export default DeliveryDriver;
