import mongoose, { Document, Schema } from 'mongoose';

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';
export type BillingCycle = 'monthly' | 'yearly';

export interface ISubscriptionUsage {
  dishes: number;
  orders: number;
  smsCredits: number;
  storage: number;
  campaigns: number;
  lastResetAt: Date;
}

export interface IPendingChange {
  type: 'upgrade' | 'downgrade' | 'cancellation';
  newPlanId?: mongoose.Types.ObjectId;
  effectiveDate: Date;
  requestedAt: Date;
  reason?: string;
}

export interface IGracePeriod {
  isActive: boolean;
  startedAt?: Date;
  endsAt?: Date;
  reason?: 'payment_failed' | 'downgrade' | 'trial_ended';
  notificationsSent: number;
}

export interface ISubscription extends Document {
  _id: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  previousPlanId?: mongoose.Types.ObjectId;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  usage: ISubscriptionUsage;
  pendingChange?: IPendingChange;
  gracePeriod?: IGracePeriod;
  downgradeHistory: Array<{
    fromPlanId: mongoose.Types.ObjectId;
    toPlanId: mongoose.Types.ObjectId;
    effectiveDate: Date;
    archivedItems: {
      dishes: number;
      campaigns: number;
    };
  }>;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  lastPaymentAt?: Date;
  nextPaymentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      unique: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
    },
    previousPlanId: {
      type: Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
    },
    status: {
      type: String,
      enum: ['trial', 'active', 'past_due', 'cancelled', 'expired'],
      default: 'trial',
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },
    currentPeriodStart: {
      type: Date,
      required: true,
      default: Date.now,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
    },
    trialEndsAt: Date,
    cancelledAt: Date,
    cancelReason: {
      type: String,
      maxlength: [500, 'Cancel reason cannot exceed 500 characters'],
    },
    usage: {
      dishes: { type: Number, default: 0 },
      orders: { type: Number, default: 0 },
      smsCredits: { type: Number, default: 0 },
      storage: { type: Number, default: 0 },
      campaigns: { type: Number, default: 0 },
      lastResetAt: { type: Date, default: Date.now },
    },
    pendingChange: {
      type: {
        type: String,
        enum: ['upgrade', 'downgrade', 'cancellation'],
      },
      newPlanId: {
        type: Schema.Types.ObjectId,
        ref: 'SubscriptionPlan',
      },
      effectiveDate: Date,
      requestedAt: Date,
      reason: String,
    },
    gracePeriod: {
      isActive: { type: Boolean, default: false },
      startedAt: Date,
      endsAt: Date,
      reason: {
        type: String,
        enum: ['payment_failed', 'downgrade', 'trial_ended'],
      },
      notificationsSent: { type: Number, default: 0 },
    },
    downgradeHistory: [{
      fromPlanId: {
        type: Schema.Types.ObjectId,
        ref: 'SubscriptionPlan',
        required: true,
      },
      toPlanId: {
        type: Schema.Types.ObjectId,
        ref: 'SubscriptionPlan',
        required: true,
      },
      effectiveDate: { type: Date, required: true },
      archivedItems: {
        dishes: { type: Number, default: 0 },
        campaigns: { type: Number, default: 0 },
      },
    }],
    stripeSubscriptionId: String,
    stripeCustomerId: String,
    lastPaymentAt: Date,
    nextPaymentAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes (restaurantId unique index created by unique: true in schema)
subscriptionSchema.index({ planId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1 });
subscriptionSchema.index({ trialEndsAt: 1 });

// Virtual to check if subscription is in trial
subscriptionSchema.virtual('isInTrial').get(function () {
  return this.status === 'trial' && this.trialEndsAt && new Date() < this.trialEndsAt;
});

// Virtual to check if subscription needs renewal
subscriptionSchema.virtual('needsRenewal').get(function () {
  return new Date() >= this.currentPeriodEnd && this.status === 'active';
});

// Check if subscription is valid (active or in trial)
subscriptionSchema.methods.isValid = function (): boolean {
  if (this.status === 'active') {return true;}
  if (this.status === 'trial' && this.trialEndsAt && new Date() < this.trialEndsAt) {return true;}
  return false;
};

export const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);
export default Subscription;
