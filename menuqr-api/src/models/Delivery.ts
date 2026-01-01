import mongoose, { Document, Schema } from 'mongoose';

// ============================================
// Types & Interfaces
// ============================================

export type DeliveryStatus =
  | 'pending'           // Waiting for driver assignment
  | 'assigned'          // Driver assigned, not yet accepted
  | 'accepted'          // Driver accepted the delivery
  | 'arriving_restaurant' // Driver heading to restaurant
  | 'at_restaurant'     // Driver arrived at restaurant
  | 'picked_up'         // Driver picked up the order
  | 'in_transit'        // On the way to customer
  | 'arrived'           // Arrived at customer location
  | 'delivered'         // Successfully delivered
  | 'failed'            // Delivery failed
  | 'cancelled'         // Delivery cancelled
  | 'returned';         // Order returned to restaurant

export type PODType = 'photo' | 'signature' | 'otp' | 'customer_confirm' | 'gps';

export type DeliveryIssueType =
  | 'wrong_address'
  | 'customer_unavailable'
  | 'customer_refused'
  | 'order_damaged'
  | 'items_missing'
  | 'traffic_delay'
  | 'vehicle_issue'
  | 'weather'
  | 'other';

export interface IDeliveryAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  additionalInfo?: string;
  instructions?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface ILocationPoint {
  lat: number;
  lng: number;
  timestamp: Date;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

export interface IProofOfDelivery {
  type: PODType;
  photoUrl?: string;
  signatureUrl?: string;
  otpCode?: string;
  otpVerified?: boolean;
  customerConfirmedAt?: Date;
  gpsVerified?: boolean;
  gpsCoordinates?: {
    lat: number;
    lng: number;
  };
  deliveryNotes?: string;
  recipientName?: string;
  completedAt: Date;
}

export interface IChatMessage {
  senderId: mongoose.Types.ObjectId;
  senderType: 'driver' | 'customer' | 'support' | 'system';
  message: string;
  messageType: 'text' | 'image' | 'location' | 'quick_reply';
  imageUrl?: string;
  location?: { lat: number; lng: number };
  isRead: boolean;
  timestamp: Date;
}

export interface IDeliveryEarnings {
  baseFee: number;
  distanceBonus: number;
  waitTimeBonus: number;
  peakHourBonus: number;
  tip: number;
  adjustments: number;
  total: number;
  currency: string;
}

export interface IDeliveryIssue {
  type: DeliveryIssueType;
  description: string;
  reportedBy: 'driver' | 'customer' | 'restaurant' | 'system';
  reportedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
  resolvedBy?: mongoose.Types.ObjectId;
  photos?: string[];
}

export interface IDeliveryTimestamp {
  event: string;
  timestamp: Date;
  location?: { lat: number; lng: number };
  note?: string;
}

export interface IDelivery extends Document {
  _id: mongoose.Types.ObjectId;

  // References
  orderId: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;

  // Delivery Number (for display)
  deliveryNumber: string;

  // Status
  status: DeliveryStatus;
  previousStatus?: DeliveryStatus;
  statusHistory: IDeliveryTimestamp[];

  // Assignment
  assignmentAttempts: number;
  assignedAt?: Date;
  acceptedAt?: Date;
  rejectedDriverIds: mongoose.Types.ObjectId[];
  assignmentExpiresAt?: Date;
  isPriority: boolean;

  // Addresses
  pickupAddress: IDeliveryAddress;
  deliveryAddress: IDeliveryAddress;

  // Route & Distance
  estimatedDistance: number; // km
  actualDistance?: number; // km
  estimatedDuration: number; // minutes
  actualDuration?: number; // minutes
  routePolyline?: string; // Encoded polyline for map

  // Timing
  estimatedPickupTime?: Date;
  actualPickupTime?: Date;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  customerRequestedTime?: Date; // For scheduled deliveries

  // Real-time Tracking
  currentDriverLocation?: {
    lat: number;
    lng: number;
    updatedAt: Date;
  };
  locationHistory: ILocationPoint[];
  lastLocationUpdate?: Date;

  // Proof of Delivery
  pod?: IProofOfDelivery;
  podRequired: {
    photo: boolean;
    signature: boolean;
    otp: boolean;
  };
  otpCode?: string; // Generated OTP for verification

  // Communication
  chatMessages: IChatMessage[];
  callLogs: {
    initiatedBy: 'driver' | 'customer';
    duration: number; // seconds
    timestamp: Date;
  }[];

  // Financial
  earnings: IDeliveryEarnings;
  deliveryFee: number; // Amount charged to customer
  tipAmount: number;
  tipAddedAt?: Date;

  // Issues & Notes
  issues: IDeliveryIssue[];
  driverNotes?: string;
  customerNotes?: string;
  adminNotes?: string;

  // Ratings
  customerRating?: {
    rating: number;
    comment?: string;
    ratedAt: Date;
  };
  restaurantRating?: {
    rating: number;
    comment?: string;
    ratedAt: Date;
  };

  // Metadata
  source: 'auto' | 'manual' | 'broadcast';
  isContactless: boolean;
  requiresAgeVerification: boolean;
  specialInstructions?: string;

  // Cancellation
  cancelledAt?: Date;
  cancelledBy?: 'customer' | 'driver' | 'restaurant' | 'system';
  cancellationReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Schema Definition
// ============================================

const deliveryAddressSchema = new Schema<IDeliveryAddress>(
  {
    street: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: 'France' },
    additionalInfo: { type: String },
    instructions: { type: String },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
  },
  { _id: false }
);

const locationPointSchema = new Schema<ILocationPoint>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    timestamp: { type: Date, required: true },
    accuracy: { type: Number },
    speed: { type: Number },
    heading: { type: Number },
  },
  { _id: false }
);

const proofOfDeliverySchema = new Schema<IProofOfDelivery>(
  {
    type: {
      type: String,
      enum: ['photo', 'signature', 'otp', 'customer_confirm', 'gps'],
      required: true,
    },
    photoUrl: { type: String },
    signatureUrl: { type: String },
    otpCode: { type: String },
    otpVerified: { type: Boolean },
    customerConfirmedAt: { type: Date },
    gpsVerified: { type: Boolean },
    gpsCoordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    deliveryNotes: { type: String },
    recipientName: { type: String },
    completedAt: { type: Date, required: true },
  },
  { _id: false }
);

const chatMessageSchema = new Schema<IChatMessage>(
  {
    senderId: { type: Schema.Types.ObjectId, required: true },
    senderType: {
      type: String,
      enum: ['driver', 'customer', 'support', 'system'],
      required: true,
    },
    message: { type: String, required: true },
    messageType: {
      type: String,
      enum: ['text', 'image', 'location', 'quick_reply'],
      default: 'text',
    },
    imageUrl: { type: String },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    isRead: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const deliveryEarningsSchema = new Schema<IDeliveryEarnings>(
  {
    baseFee: { type: Number, default: 0 },
    distanceBonus: { type: Number, default: 0 },
    waitTimeBonus: { type: Number, default: 0 },
    peakHourBonus: { type: Number, default: 0 },
    tip: { type: Number, default: 0 },
    adjustments: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: 'EUR' },
  },
  { _id: false }
);

const deliveryIssueSchema = new Schema<IDeliveryIssue>(
  {
    type: {
      type: String,
      enum: [
        'wrong_address',
        'customer_unavailable',
        'customer_refused',
        'order_damaged',
        'items_missing',
        'traffic_delay',
        'vehicle_issue',
        'weather',
        'other',
      ],
      required: true,
    },
    description: { type: String, required: true },
    reportedBy: {
      type: String,
      enum: ['driver', 'customer', 'restaurant', 'system'],
      required: true,
    },
    reportedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
    resolution: { type: String },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    photos: [{ type: String }],
  },
  { _id: true }
);

const timestampSchema = new Schema<IDeliveryTimestamp>(
  {
    event: { type: String, required: true },
    timestamp: { type: Date, required: true },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    note: { type: String },
  },
  { _id: false }
);

const deliverySchema = new Schema<IDelivery>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryDriver',
    },

    deliveryNumber: {
      type: String,
      unique: true,
      // Note: generated in pre-save hook if not provided
    },

    // Status
    status: {
      type: String,
      enum: [
        'pending', 'assigned', 'accepted', 'arriving_restaurant',
        'at_restaurant', 'picked_up', 'in_transit', 'arrived',
        'delivered', 'failed', 'cancelled', 'returned',
      ],
      default: 'pending',
    },
    previousStatus: {
      type: String,
      enum: [
        'pending', 'assigned', 'accepted', 'arriving_restaurant',
        'at_restaurant', 'picked_up', 'in_transit', 'arrived',
        'delivered', 'failed', 'cancelled', 'returned',
      ],
    },
    statusHistory: [timestampSchema],

    // Assignment
    assignmentAttempts: { type: Number, default: 0 },
    assignedAt: { type: Date },
    acceptedAt: { type: Date },
    rejectedDriverIds: [{
      type: Schema.Types.ObjectId,
      ref: 'DeliveryDriver',
    }],
    assignmentExpiresAt: { type: Date },
    isPriority: { type: Boolean, default: false },

    // Addresses
    pickupAddress: {
      type: deliveryAddressSchema,
      required: true,
    },
    deliveryAddress: {
      type: deliveryAddressSchema,
      required: true,
    },

    // Route
    estimatedDistance: { type: Number, default: 0 },
    actualDistance: { type: Number },
    estimatedDuration: { type: Number, default: 0 },
    actualDuration: { type: Number },
    routePolyline: { type: String },

    // Timing
    estimatedPickupTime: { type: Date },
    actualPickupTime: { type: Date },
    estimatedDeliveryTime: { type: Date },
    actualDeliveryTime: { type: Date },
    customerRequestedTime: { type: Date },

    // Tracking
    currentDriverLocation: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date },
    },
    locationHistory: [locationPointSchema],
    lastLocationUpdate: { type: Date },

    // POD
    pod: proofOfDeliverySchema,
    podRequired: {
      photo: { type: Boolean, default: false },
      signature: { type: Boolean, default: false },
      otp: { type: Boolean, default: false },
    },
    otpCode: { type: String },

    // Communication
    chatMessages: [chatMessageSchema],
    callLogs: [{
      initiatedBy: { type: String, enum: ['driver', 'customer'] },
      duration: { type: Number },
      timestamp: { type: Date },
    }],

    // Financial
    earnings: {
      type: deliveryEarningsSchema,
      default: () => ({}),
    },
    deliveryFee: { type: Number, default: 0 },
    tipAmount: { type: Number, default: 0 },
    tipAddedAt: { type: Date },

    // Issues
    issues: [deliveryIssueSchema],
    driverNotes: { type: String },
    customerNotes: { type: String },
    adminNotes: { type: String },

    // Ratings
    customerRating: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      ratedAt: { type: Date },
    },
    restaurantRating: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      ratedAt: { type: Date },
    },

    // Metadata
    source: {
      type: String,
      enum: ['auto', 'manual', 'broadcast'],
      default: 'auto',
    },
    isContactless: { type: Boolean, default: false },
    requiresAgeVerification: { type: Boolean, default: false },
    specialInstructions: { type: String },

    // Cancellation
    cancelledAt: { type: Date },
    cancelledBy: {
      type: String,
      enum: ['customer', 'driver', 'restaurant', 'system'],
    },
    cancellationReason: { type: String },
  },
  {
    timestamps: true,
  }
);

// ============================================
// Indexes
// ============================================

deliverySchema.index({ orderId: 1 });
deliverySchema.index({ restaurantId: 1, status: 1 });
deliverySchema.index({ driverId: 1, status: 1 });
deliverySchema.index({ customerId: 1 });
deliverySchema.index({ status: 1, createdAt: -1 });
deliverySchema.index({ deliveryNumber: 1 });
deliverySchema.index({ 'deliveryAddress.coordinates': '2dsphere' });

// ============================================
// Pre-save Hooks
// ============================================

deliverySchema.pre('save', async function() {
  // Generate delivery number if not set
  if (!this.deliveryNumber) {
    const count = await mongoose.model('Delivery').countDocuments();
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    this.deliveryNumber = `DLV-${dateStr}-${String(count + 1).padStart(5, '0')}`;
  }

  // Track status changes
  if (this.isModified('status') && this.previousStatus !== this.status) {
    this.statusHistory.push({
      event: this.status,
      timestamp: new Date(),
      location: this.currentDriverLocation ? {
        lat: this.currentDriverLocation.lat,
        lng: this.currentDriverLocation.lng,
      } : undefined,
    });
    this.previousStatus = this.status;
  }

});

// ============================================
// Methods
// ============================================

deliverySchema.methods.updateStatus = function(
  newStatus: DeliveryStatus,
  location?: { lat: number; lng: number },
  note?: string
) {
  this.previousStatus = this.status;
  this.status = newStatus;
  this.statusHistory.push({
    event: newStatus,
    timestamp: new Date(),
    location,
    note,
  });

  // Set relevant timestamps
  switch (newStatus) {
    case 'assigned':
      this.assignedAt = new Date();
      break;
    case 'accepted':
      this.acceptedAt = new Date();
      break;
    case 'picked_up':
      this.actualPickupTime = new Date();
      break;
    case 'delivered':
      this.actualDeliveryTime = new Date();
      if (this.actualPickupTime) {
        this.actualDuration = Math.round(
          (this.actualDeliveryTime.getTime() - this.actualPickupTime.getTime()) / 60000
        );
      }
      break;
    case 'cancelled':
      this.cancelledAt = new Date();
      break;
  }

  return this.save();
};

deliverySchema.methods.addChatMessage = function(
  senderId: mongoose.Types.ObjectId,
  senderType: 'driver' | 'customer' | 'support' | 'system',
  message: string,
  messageType: 'text' | 'image' | 'location' | 'quick_reply' = 'text',
  extra?: { imageUrl?: string; location?: { lat: number; lng: number } }
) {
  this.chatMessages.push({
    senderId,
    senderType,
    message,
    messageType,
    imageUrl: extra?.imageUrl,
    location: extra?.location,
    isRead: false,
    timestamp: new Date(),
  });
  return this.save();
};

deliverySchema.methods.updateDriverLocation = function(
  lat: number,
  lng: number,
  accuracy?: number,
  speed?: number,
  heading?: number
) {
  const timestamp = new Date();

  this.currentDriverLocation = { lat, lng, updatedAt: timestamp };
  this.lastLocationUpdate = timestamp;

  // Add to history (but limit to prevent unbounded growth)
  this.locationHistory.push({ lat, lng, timestamp, accuracy, speed, heading });
  if (this.locationHistory.length > 1000) {
    this.locationHistory = this.locationHistory.slice(-500);
  }

  return this.save();
};

deliverySchema.methods.calculateEarnings = function(
  baseFee: number,
  distanceRate: number = 0.5, // per km
  peakMultiplier: number = 1,
  waitTimeMinutes: number = 0
) {
  const distanceBonus = Math.max(0, (this.actualDistance || this.estimatedDistance) - 2) * distanceRate;
  const waitTimeBonus = waitTimeMinutes > 10 ? (waitTimeMinutes - 10) * 0.10 : 0;
  const peakHourBonus = baseFee * (peakMultiplier - 1);

  this.earnings = {
    baseFee,
    distanceBonus,
    waitTimeBonus,
    peakHourBonus,
    tip: this.tipAmount || 0,
    adjustments: 0,
    total: baseFee + distanceBonus + waitTimeBonus + peakHourBonus + (this.tipAmount || 0),
    currency: 'EUR',
  };

  return this.save();
};

deliverySchema.methods.generateOTP = function() {
  this.otpCode = Math.floor(1000 + Math.random() * 9000).toString();
  return this.save();
};

deliverySchema.methods.verifyOTP = function(code: string): boolean {
  return this.otpCode === code;
};

// ============================================
// Static Methods
// ============================================

deliverySchema.statics.findPendingDeliveries = function(restaurantId: mongoose.Types.ObjectId) {
  return this.find({
    restaurantId,
    status: 'pending',
  }).sort({ isPriority: -1, createdAt: 1 });
};

deliverySchema.statics.findActiveDeliveries = function(driverId: mongoose.Types.ObjectId) {
  return this.find({
    driverId,
    status: { $in: ['assigned', 'accepted', 'arriving_restaurant', 'at_restaurant', 'picked_up', 'in_transit', 'arrived'] },
  });
};

deliverySchema.statics.getDriverStats = async function(
  driverId: mongoose.Types.ObjectId,
  startDate?: Date,
  endDate?: Date
) {
  const match: Record<string, unknown> = { driverId };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) { (match.createdAt as Record<string, Date>).$gte = startDate; }
    if (endDate) { (match.createdAt as Record<string, Date>).$lte = endDate; }
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalDeliveries: { $sum: 1 },
        completedDeliveries: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
        },
        cancelledDeliveries: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
        },
        totalEarnings: { $sum: '$earnings.total' },
        totalTips: { $sum: '$tipAmount' },
        avgRating: { $avg: '$customerRating.rating' },
        avgDeliveryTime: { $avg: '$actualDuration' },
      },
    },
  ]);

  return stats[0] || {
    totalDeliveries: 0,
    completedDeliveries: 0,
    cancelledDeliveries: 0,
    totalEarnings: 0,
    totalTips: 0,
    avgRating: 0,
    avgDeliveryTime: 0,
  };
};

// ============================================
// Export
// ============================================

export const Delivery = mongoose.model<IDelivery>('Delivery', deliverySchema);
export default Delivery;
