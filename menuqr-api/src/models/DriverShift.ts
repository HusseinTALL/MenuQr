import mongoose, { Document, Schema } from 'mongoose';

// ============================================
// Types & Interfaces
// ============================================

export type ShiftEndReason = 'manual' | 'auto_timeout' | 'system' | 'admin';

export interface IBreakPeriod {
  startedAt: Date;
  endedAt?: Date;
  duration?: number; // minutes
  reason?: string;
}

export interface IShiftLocation {
  lat: number;
  lng: number;
  timestamp: Date;
}

export interface IShiftStats {
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  totalDistance: number; // km
  totalActiveTime: number; // minutes (excluding breaks)
  totalBreakTime: number; // minutes
  averageDeliveryTime: number; // minutes
}

export interface IDriverShift extends Document {
  _id: mongoose.Types.ObjectId;

  // References
  driverId: mongoose.Types.ObjectId;
  restaurantIds: mongoose.Types.ObjectId[]; // Restaurants worked for during shift

  // Timing
  startedAt: Date;
  endedAt?: Date;
  scheduledStart?: Date; // For pre-scheduled shifts
  scheduledEnd?: Date;
  duration?: number; // Total duration in minutes

  // Status
  isActive: boolean;
  endReason?: ShiftEndReason;

  // Breaks
  breaks: IBreakPeriod[];
  currentBreakStartedAt?: Date;

  // Location
  startLocation?: IShiftLocation;
  endLocation?: IShiftLocation;
  locationSnapshots: IShiftLocation[]; // Periodic location logs

  // Performance
  stats: IShiftStats;
  deliveryIds: mongoose.Types.ObjectId[]; // All deliveries during this shift

  // Earnings
  earnings: {
    deliveryFees: number;
    distanceBonuses: number;
    waitTimeBonuses: number;
    peakHourBonuses: number;
    tips: number;
    incentiveBonus: number;
    total: number;
  };

  // Goals & Incentives
  goals?: {
    deliveryTarget?: number;
    earningsTarget?: number;
    achievedDeliveries: number;
    achievedEarnings: number;
  };

  // Notes
  notes?: string;
  adminNotes?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Schema Definition
// ============================================

const breakPeriodSchema = new Schema<IBreakPeriod>(
  {
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    duration: { type: Number },
    reason: { type: String },
  },
  { _id: true }
);

const shiftLocationSchema = new Schema<IShiftLocation>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    timestamp: { type: Date, required: true },
  },
  { _id: false }
);

const shiftStatsSchema = new Schema<IShiftStats>(
  {
    totalDeliveries: { type: Number, default: 0 },
    completedDeliveries: { type: Number, default: 0 },
    cancelledDeliveries: { type: Number, default: 0 },
    totalDistance: { type: Number, default: 0 },
    totalActiveTime: { type: Number, default: 0 },
    totalBreakTime: { type: Number, default: 0 },
    averageDeliveryTime: { type: Number, default: 0 },
  },
  { _id: false }
);

const driverShiftSchema = new Schema<IDriverShift>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryDriver',
      required: true,
    },
    restaurantIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
    }],

    // Timing
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endedAt: { type: Date },
    scheduledStart: { type: Date },
    scheduledEnd: { type: Date },
    duration: { type: Number },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    endReason: {
      type: String,
      enum: ['manual', 'auto_timeout', 'system', 'admin'],
    },

    // Breaks
    breaks: [breakPeriodSchema],
    currentBreakStartedAt: { type: Date },

    // Location
    startLocation: shiftLocationSchema,
    endLocation: shiftLocationSchema,
    locationSnapshots: [shiftLocationSchema],

    // Stats
    stats: {
      type: shiftStatsSchema,
      default: () => ({}),
    },
    deliveryIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Delivery',
    }],

    // Earnings
    earnings: {
      deliveryFees: { type: Number, default: 0 },
      distanceBonuses: { type: Number, default: 0 },
      waitTimeBonuses: { type: Number, default: 0 },
      peakHourBonuses: { type: Number, default: 0 },
      tips: { type: Number, default: 0 },
      incentiveBonus: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },

    // Goals
    goals: {
      deliveryTarget: { type: Number },
      earningsTarget: { type: Number },
      achievedDeliveries: { type: Number, default: 0 },
      achievedEarnings: { type: Number, default: 0 },
    },

    // Notes
    notes: { type: String },
    adminNotes: { type: String },
  },
  {
    timestamps: true,
  }
);

// ============================================
// Indexes
// ============================================

driverShiftSchema.index({ driverId: 1, isActive: 1 });
driverShiftSchema.index({ driverId: 1, startedAt: -1 });
driverShiftSchema.index({ restaurantIds: 1, startedAt: -1 });
driverShiftSchema.index({ isActive: 1, startedAt: -1 });

// ============================================
// Virtual Fields
// ============================================

driverShiftSchema.virtual('totalBreakDuration').get(function() {
  return this.breaks.reduce((total, brk) => total + (brk.duration || 0), 0);
});

driverShiftSchema.virtual('activeTime').get(function() {
  const totalBreakDuration = this.breaks.reduce((total: number, brk: IBreakPeriod) => total + (brk.duration || 0), 0);
  if (!this.endedAt) {
    const now = new Date();
    const totalTime = (now.getTime() - this.startedAt.getTime()) / 60000;
    return totalTime - totalBreakDuration;
  }
  return (this.duration || 0) - totalBreakDuration;
});

driverShiftSchema.virtual('isOnBreak').get(function() {
  return !!this.currentBreakStartedAt;
});

// ============================================
// Methods
// ============================================

driverShiftSchema.methods.endShift = function(reason: ShiftEndReason = 'manual', location?: { lat: number; lng: number }) {
  this.isActive = false;
  this.endedAt = new Date();
  this.endReason = reason;

  if (location) {
    this.endLocation = {
      lat: location.lat,
      lng: location.lng,
      timestamp: new Date(),
    };
  }

  // Calculate total duration
  this.duration = Math.round((this.endedAt.getTime() - this.startedAt.getTime()) / 60000);

  // Calculate active time (excluding breaks)
  const totalBreakTime = this.breaks.reduce((total: number, brk: IBreakPeriod) => total + (brk.duration || 0), 0);
  this.stats.totalBreakTime = totalBreakTime;
  this.stats.totalActiveTime = this.duration - totalBreakTime;

  // Calculate total earnings
  this.earnings.total =
    this.earnings.deliveryFees +
    this.earnings.distanceBonuses +
    this.earnings.waitTimeBonuses +
    this.earnings.peakHourBonuses +
    this.earnings.tips +
    this.earnings.incentiveBonus;

  return this.save();
};

driverShiftSchema.methods.startBreak = function(reason?: string) {
  if (this.currentBreakStartedAt) {
    throw new Error('Already on break');
  }
  this.currentBreakStartedAt = new Date();
  this.breaks.push({
    startedAt: this.currentBreakStartedAt,
    reason,
  });
  return this.save();
};

driverShiftSchema.methods.endBreak = function() {
  if (!this.currentBreakStartedAt) {
    throw new Error('Not currently on break');
  }

  const endedAt = new Date();
  const currentBreak = this.breaks[this.breaks.length - 1];
  if (currentBreak) {
    currentBreak.endedAt = endedAt;
    currentBreak.duration = Math.round(
      (endedAt.getTime() - this.currentBreakStartedAt.getTime()) / 60000
    );
  }

  this.currentBreakStartedAt = undefined;
  return this.save();
};

driverShiftSchema.methods.addDelivery = function(
  deliveryId: mongoose.Types.ObjectId,
  completed: boolean,
  distance: number,
  duration: number,
  earnings: {
    baseFee: number;
    distanceBonus: number;
    waitTimeBonus: number;
    peakHourBonus: number;
    tip: number;
  }
) {
  this.deliveryIds.push(deliveryId);
  this.stats.totalDeliveries += 1;

  if (completed) {
    this.stats.completedDeliveries += 1;
    this.stats.totalDistance += distance;

    // Recalculate average delivery time
    const totalTime = this.stats.averageDeliveryTime * (this.stats.completedDeliveries - 1);
    this.stats.averageDeliveryTime = (totalTime + duration) / this.stats.completedDeliveries;
  } else {
    this.stats.cancelledDeliveries += 1;
  }

  // Update earnings
  this.earnings.deliveryFees += earnings.baseFee;
  this.earnings.distanceBonuses += earnings.distanceBonus;
  this.earnings.waitTimeBonuses += earnings.waitTimeBonus;
  this.earnings.peakHourBonuses += earnings.peakHourBonus;
  this.earnings.tips += earnings.tip;
  this.earnings.total =
    this.earnings.deliveryFees +
    this.earnings.distanceBonuses +
    this.earnings.waitTimeBonuses +
    this.earnings.peakHourBonuses +
    this.earnings.tips +
    this.earnings.incentiveBonus;

  // Update goals
  if (this.goals) {
    this.goals.achievedDeliveries = this.stats.completedDeliveries;
    this.goals.achievedEarnings = this.earnings.total;
  }

  return this.save();
};

driverShiftSchema.methods.addLocationSnapshot = function(lat: number, lng: number) {
  this.locationSnapshots.push({
    lat,
    lng,
    timestamp: new Date(),
  });

  // Limit snapshots to prevent unbounded growth (keep last 500)
  if (this.locationSnapshots.length > 500) {
    this.locationSnapshots = this.locationSnapshots.slice(-300);
  }

  return this.save();
};

// ============================================
// Static Methods
// ============================================

driverShiftSchema.statics.findActiveShift = function(driverId: mongoose.Types.ObjectId) {
  return this.findOne({
    driverId,
    isActive: true,
  });
};

driverShiftSchema.statics.getShiftHistory = function(
  driverId: mongoose.Types.ObjectId,
  limit: number = 10,
  skip: number = 0
) {
  return this.find({ driverId })
    .sort({ startedAt: -1 })
    .skip(skip)
    .limit(limit);
};

driverShiftSchema.statics.getShiftStats = async function(
  driverId: mongoose.Types.ObjectId,
  startDate: Date,
  endDate: Date
) {
  const stats = await this.aggregate([
    {
      $match: {
        driverId: new mongoose.Types.ObjectId(driverId),
        startedAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalShifts: { $sum: 1 },
        totalHours: { $sum: { $divide: ['$duration', 60] } },
        totalDeliveries: { $sum: '$stats.completedDeliveries' },
        totalEarnings: { $sum: '$earnings.total' },
        totalDistance: { $sum: '$stats.totalDistance' },
        avgDeliveriesPerShift: { $avg: '$stats.completedDeliveries' },
        avgEarningsPerShift: { $avg: '$earnings.total' },
      },
    },
  ]);

  return stats[0] || {
    totalShifts: 0,
    totalHours: 0,
    totalDeliveries: 0,
    totalEarnings: 0,
    totalDistance: 0,
    avgDeliveriesPerShift: 0,
    avgEarningsPerShift: 0,
  };
};

// ============================================
// Export
// ============================================

export const DriverShift = mongoose.model<IDriverShift>('DriverShift', driverShiftSchema);
export default DriverShift;
