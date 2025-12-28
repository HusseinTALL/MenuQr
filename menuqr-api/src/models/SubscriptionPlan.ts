import mongoose, { Document, Schema } from 'mongoose';

export interface IPlanLimits {
  dishes: number; // -1 for unlimited
  orders: number; // Monthly orders limit, -1 for unlimited
  users: number; // Staff users allowed
  smsCredits: number; // Monthly SMS credits
  storage: number; // Storage in MB
  tables: number; // Number of tables
  campaigns: number; // Monthly campaigns, -1 for unlimited
}

export interface IPlanPricing {
  monthly: number;
  yearly: number;
  currency: string;
}

export interface ISubscriptionPlan extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  features: string[];
  limits: IPlanLimits;
  pricing: IPlanPricing;
  trialDays: number;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    features: {
      type: [String],
      default: [],
    },
    limits: {
      dishes: { type: Number, default: 50 },
      orders: { type: Number, default: 500 },
      users: { type: Number, default: 2 },
      smsCredits: { type: Number, default: 100 },
      storage: { type: Number, default: 500 }, // MB
      tables: { type: Number, default: 10 },
      campaigns: { type: Number, default: 5 },
    },
    pricing: {
      monthly: { type: Number, required: true, min: 0 },
      yearly: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'EUR' },
    },
    trialDays: {
      type: Number,
      default: 14,
      min: 0,
      max: 90,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Generate slug from name before saving
subscriptionPlanSchema.pre('save', function () {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
});

// Indexes (slug unique index created by unique: true in schema)
subscriptionPlanSchema.index({ isActive: 1 });
subscriptionPlanSchema.index({ sortOrder: 1 });

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>('SubscriptionPlan', subscriptionPlanSchema);
export default SubscriptionPlan;
