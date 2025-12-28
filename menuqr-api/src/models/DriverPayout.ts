import mongoose, { Document, Schema } from 'mongoose';

// ============================================
// Types & Interfaces
// ============================================

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type PayoutMethod = 'bank_transfer' | 'instant' | 'manual';
export type PayoutType = 'weekly' | 'instant' | 'adjustment' | 'bonus';

export interface IPayoutBreakdown {
  deliveryFees: number;
  distanceBonuses: number;
  waitTimeBonuses: number;
  peakHourBonuses: number;
  tips: number;
  incentiveBonuses: number;
  referralBonuses: number;
  adjustments: number; // Can be positive or negative
  deductions: number; // Equipment rental, chargebacks, etc.
}

export interface IPayoutDelivery {
  deliveryId: mongoose.Types.ObjectId;
  deliveryNumber: string;
  completedAt: Date;
  earnings: number;
  tip: number;
}

export interface IPayoutAdjustment {
  reason: string;
  amount: number;
  addedBy: mongoose.Types.ObjectId;
  addedAt: Date;
  notes?: string;
}

export interface IDriverPayout extends Document {
  _id: mongoose.Types.ObjectId;

  // References
  driverId: mongoose.Types.ObjectId;

  // Payout Details
  payoutNumber: string;
  type: PayoutType;
  status: PayoutStatus;

  // Period
  periodStart: Date;
  periodEnd: Date;

  // Amounts
  grossAmount: number;
  breakdown: IPayoutBreakdown;
  netAmount: number;
  currency: string;

  // Deliveries included
  deliveryCount: number;
  deliveries: IPayoutDelivery[];
  shiftIds: mongoose.Types.ObjectId[];

  // Adjustments
  adjustments: IPayoutAdjustment[];

  // Payment Info
  paymentMethod: PayoutMethod;
  bankAccount?: {
    accountHolder: string;
    iban: string;
    bic: string;
    bankName?: string;
  };

  // Processing
  processedAt?: Date;
  processedBy?: mongoose.Types.ObjectId;
  transactionId?: string;
  transactionReference?: string;
  failureReason?: string;
  retryCount: number;

  // Tax
  taxWithheld?: number;
  taxRate?: number;

  // Fees
  processingFee?: number;
  instantPayoutFee?: number;

  // Notes
  notes?: string;
  adminNotes?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Schema Definition
// ============================================

const payoutBreakdownSchema = new Schema<IPayoutBreakdown>(
  {
    deliveryFees: { type: Number, default: 0 },
    distanceBonuses: { type: Number, default: 0 },
    waitTimeBonuses: { type: Number, default: 0 },
    peakHourBonuses: { type: Number, default: 0 },
    tips: { type: Number, default: 0 },
    incentiveBonuses: { type: Number, default: 0 },
    referralBonuses: { type: Number, default: 0 },
    adjustments: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
  },
  { _id: false }
);

const payoutDeliverySchema = new Schema<IPayoutDelivery>(
  {
    deliveryId: { type: Schema.Types.ObjectId, ref: 'Delivery', required: true },
    deliveryNumber: { type: String, required: true },
    completedAt: { type: Date, required: true },
    earnings: { type: Number, required: true },
    tip: { type: Number, default: 0 },
  },
  { _id: false }
);

const payoutAdjustmentSchema = new Schema<IPayoutAdjustment>(
  {
    reason: { type: String, required: true },
    amount: { type: Number, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { _id: true }
);

const driverPayoutSchema = new Schema<IDriverPayout>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryDriver',
      required: true,
    },

    payoutNumber: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['weekly', 'instant', 'adjustment', 'bonus'],
      default: 'weekly',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },

    // Period
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },

    // Amounts
    grossAmount: { type: Number, required: true },
    breakdown: {
      type: payoutBreakdownSchema,
      default: () => ({}),
    },
    netAmount: { type: Number, required: true },
    currency: { type: String, default: 'EUR' },

    // Deliveries
    deliveryCount: { type: Number, default: 0 },
    deliveries: [payoutDeliverySchema],
    shiftIds: [{
      type: Schema.Types.ObjectId,
      ref: 'DriverShift',
    }],

    // Adjustments
    adjustments: [payoutAdjustmentSchema],

    // Payment
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'instant', 'manual'],
      default: 'bank_transfer',
    },
    bankAccount: {
      accountHolder: { type: String },
      iban: { type: String },
      bic: { type: String },
      bankName: { type: String },
    },

    // Processing
    processedAt: { type: Date },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    transactionId: { type: String },
    transactionReference: { type: String },
    failureReason: { type: String },
    retryCount: { type: Number, default: 0 },

    // Tax
    taxWithheld: { type: Number, default: 0 },
    taxRate: { type: Number },

    // Fees
    processingFee: { type: Number, default: 0 },
    instantPayoutFee: { type: Number, default: 0 },

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

driverPayoutSchema.index({ driverId: 1, status: 1 });
driverPayoutSchema.index({ driverId: 1, periodStart: -1 });
driverPayoutSchema.index({ status: 1, createdAt: -1 });
driverPayoutSchema.index({ payoutNumber: 1 });
driverPayoutSchema.index({ type: 1, status: 1 });

// ============================================
// Pre-save Hook
// ============================================

driverPayoutSchema.pre('save', async function() {
  // Generate payout number if not set
  if (!this.payoutNumber) {
    const count = await mongoose.model('DriverPayout').countDocuments();
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const typePrefix = this.type === 'instant' ? 'INS' : this.type === 'bonus' ? 'BON' : 'PAY';
    this.payoutNumber = `${typePrefix}-${dateStr}-${String(count + 1).padStart(6, '0')}`;
  }

  // Calculate net amount
  this.netAmount = this.grossAmount -
    (this.taxWithheld || 0) -
    (this.processingFee || 0) -
    (this.instantPayoutFee || 0) -
    this.breakdown.deductions +
    this.breakdown.adjustments;

});

// ============================================
// Methods
// ============================================

driverPayoutSchema.methods.markAsProcessing = function(processedBy?: mongoose.Types.ObjectId) {
  this.status = 'processing';
  if (processedBy) {
    this.processedBy = processedBy;
  }
  return this.save();
};

driverPayoutSchema.methods.markAsCompleted = function(
  transactionId: string,
  transactionReference?: string
) {
  this.status = 'completed';
  this.processedAt = new Date();
  this.transactionId = transactionId;
  if (transactionReference) {
    this.transactionReference = transactionReference;
  }
  return this.save();
};

driverPayoutSchema.methods.markAsFailed = function(reason: string) {
  this.status = 'failed';
  this.failureReason = reason;
  this.retryCount += 1;
  return this.save();
};

driverPayoutSchema.methods.cancel = function(reason?: string) {
  this.status = 'cancelled';
  if (reason) {
    this.adminNotes = (this.adminNotes ? this.adminNotes + '\n' : '') + `Cancelled: ${reason}`;
  }
  return this.save();
};

driverPayoutSchema.methods.addAdjustment = function(
  reason: string,
  amount: number,
  addedBy: mongoose.Types.ObjectId,
  notes?: string
) {
  this.adjustments.push({
    reason,
    amount,
    addedBy,
    addedAt: new Date(),
    notes,
  });

  // Update breakdown and amounts
  this.breakdown.adjustments += amount;
  this.grossAmount += amount;
  this.netAmount = this.grossAmount -
    (this.taxWithheld || 0) -
    (this.processingFee || 0) -
    (this.instantPayoutFee || 0) -
    this.breakdown.deductions +
    this.breakdown.adjustments;

  return this.save();
};

driverPayoutSchema.methods.retry = function() {
  if (this.status !== 'failed') {
    throw new Error('Can only retry failed payouts');
  }
  this.status = 'pending';
  this.failureReason = undefined;
  return this.save();
};

// ============================================
// Static Methods
// ============================================

driverPayoutSchema.statics.createWeeklyPayout = async function(
  driverId: mongoose.Types.ObjectId,
  periodStart: Date,
  periodEnd: Date,
  deliveries: IPayoutDelivery[],
  shiftIds: mongoose.Types.ObjectId[],
  bankAccount: { accountHolder: string; iban: string; bic: string; bankName?: string }
) {
  // Calculate breakdown
  const breakdown: IPayoutBreakdown = {
    deliveryFees: 0,
    distanceBonuses: 0,
    waitTimeBonuses: 0,
    peakHourBonuses: 0,
    tips: 0,
    incentiveBonuses: 0,
    referralBonuses: 0,
    adjustments: 0,
    deductions: 0,
  };

  let grossAmount = 0;
  for (const delivery of deliveries) {
    grossAmount += delivery.earnings + delivery.tip;
    breakdown.tips += delivery.tip;
    // Note: In real implementation, fetch actual earnings breakdown from Delivery model
    breakdown.deliveryFees += delivery.earnings;
  }

  const payout = new this({
    driverId,
    type: 'weekly',
    periodStart,
    periodEnd,
    grossAmount,
    breakdown,
    netAmount: grossAmount, // Will be recalculated in pre-save
    deliveryCount: deliveries.length,
    deliveries,
    shiftIds,
    bankAccount,
    paymentMethod: 'bank_transfer',
  });

  return payout.save();
};

driverPayoutSchema.statics.createInstantPayout = async function(
  driverId: mongoose.Types.ObjectId,
  amount: number,
  bankAccount: { accountHolder: string; iban: string; bic: string; bankName?: string },
  instantFee: number = 0.99
) {
  const now = new Date();
  const payout = new this({
    driverId,
    type: 'instant',
    periodStart: now,
    periodEnd: now,
    grossAmount: amount,
    breakdown: {
      deliveryFees: amount,
      distanceBonuses: 0,
      waitTimeBonuses: 0,
      peakHourBonuses: 0,
      tips: 0,
      incentiveBonuses: 0,
      referralBonuses: 0,
      adjustments: 0,
      deductions: 0,
    },
    netAmount: amount - instantFee,
    instantPayoutFee: instantFee,
    deliveryCount: 0,
    deliveries: [],
    shiftIds: [],
    bankAccount,
    paymentMethod: 'instant',
  });

  return payout.save();
};

driverPayoutSchema.statics.getPendingPayouts = function() {
  return this.find({ status: 'pending' }).populate('driverId');
};

driverPayoutSchema.statics.getDriverPayoutHistory = function(
  driverId: mongoose.Types.ObjectId,
  limit: number = 20,
  skip: number = 0
) {
  return this.find({ driverId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

driverPayoutSchema.statics.getPayoutStats = async function(
  driverId: mongoose.Types.ObjectId,
  year: number
) {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);

  const stats = await this.aggregate([
    {
      $match: {
        driverId: new mongoose.Types.ObjectId(driverId),
        status: 'completed',
        processedAt: { $gte: startOfYear, $lte: endOfYear },
      },
    },
    {
      $group: {
        _id: { $month: '$processedAt' },
        totalPaid: { $sum: '$netAmount' },
        totalDeliveries: { $sum: '$deliveryCount' },
        payoutCount: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  // Also get yearly totals
  const yearlyTotals = await this.aggregate([
    {
      $match: {
        driverId: new mongoose.Types.ObjectId(driverId),
        status: 'completed',
        processedAt: { $gte: startOfYear, $lte: endOfYear },
      },
    },
    {
      $group: {
        _id: null,
        totalPaid: { $sum: '$netAmount' },
        totalDeliveries: { $sum: '$deliveryCount' },
        totalTips: { $sum: '$breakdown.tips' },
        payoutCount: { $sum: 1 },
      },
    },
  ]);

  return {
    monthly: stats,
    yearly: yearlyTotals[0] || {
      totalPaid: 0,
      totalDeliveries: 0,
      totalTips: 0,
      payoutCount: 0,
    },
  };
};

// ============================================
// Export
// ============================================

export const DriverPayout = mongoose.model<IDriverPayout>('DriverPayout', driverPayoutSchema);
export default DriverPayout;
