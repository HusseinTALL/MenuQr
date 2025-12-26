import mongoose, { Document, Schema } from 'mongoose';

export interface IReservationSettings {
  enabled: boolean;
  slotDuration: number; // minutes (30)
  defaultDuration: number; // minutes (90)
  maxPartySize: number; // max guests (10)
  minAdvanceHours: number; // minimum hours in advance (2)
  maxAdvanceDays: number; // maximum days in advance (30)
  autoConfirm: boolean; // auto-confirm reservations
  requirePhone: boolean; // phone required
  allowPreOrder: boolean; // allow pre-ordering dishes
}

export interface IReviewSettings {
  enabled: boolean; // Enable/disable reviews
  requireApproval: boolean; // Manual moderation
  allowPhotos: boolean; // Allow photo uploads
  minOrdersToReview: number; // Minimum orders to leave a review
  autoApproveThreshold?: number; // Min rating for auto-approval (e.g., 4)
}

export interface IScheduledOrderSettings {
  enabled: boolean;
  minAdvanceMinutes: number; // Minimum minutes in advance (60)
  maxAdvanceDays: number; // Maximum days in advance (7)
  slotDuration: number; // Duration of each slot in minutes (30)
  maxOrdersPerSlot: number; // Max orders per time slot (5)
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryRadius?: number; // Delivery radius in km
  deliveryFee?: number; // Fixed delivery fee
  deliveryMinOrder?: number; // Minimum order for delivery
}

export interface IRestaurantReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  responseRate: number; // Percentage of reviews with responses
}

export interface IRestaurantSettings {
  currency: string;
  timezone: string;
  defaultLanguage: string;
  availableLanguages: string[];
  orderNotifications: boolean;
  autoAcceptOrders: boolean;
  tablePrefix: string;
  tableCount: number;
  reservations: IReservationSettings;
  reviews: IReviewSettings;
  scheduledOrders: IScheduledOrderSettings;
}

export interface IRestaurant extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  openingHours?: {
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }[];
  settings: IRestaurantSettings;
  reviewStats?: IRestaurantReviewStats;
  ownerId: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const restaurantSchema = new Schema<IRestaurant>(
  {
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
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
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    logo: String,
    coverImage: String,
    address: {
      street: String,
      city: String,
      postalCode: String,
      country: { type: String, default: 'FR' },
    },
    phone: {
      type: String,
      match: [/^[+]?[\d\s-()]+$/, 'Please enter a valid phone number'],
    },
    email: {
      type: String,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    website: String,
    openingHours: [
      {
        day: {
          type: String,
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        },
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
    ],
    settings: {
      currency: { type: String, default: 'EUR' },
      timezone: { type: String, default: 'Europe/Paris' },
      defaultLanguage: { type: String, default: 'fr' },
      availableLanguages: { type: [String], default: ['fr', 'en'] },
      orderNotifications: { type: Boolean, default: true },
      autoAcceptOrders: { type: Boolean, default: false },
      tablePrefix: { type: String, default: 'Table' },
      tableCount: { type: Number, default: 20 },
      reservations: {
        enabled: { type: Boolean, default: false },
        slotDuration: { type: Number, default: 30, min: 15, max: 120 },
        defaultDuration: { type: Number, default: 90, min: 30, max: 240 },
        maxPartySize: { type: Number, default: 10, min: 1, max: 50 },
        minAdvanceHours: { type: Number, default: 2, min: 0, max: 72 },
        maxAdvanceDays: { type: Number, default: 30, min: 1, max: 365 },
        autoConfirm: { type: Boolean, default: true },
        requirePhone: { type: Boolean, default: true },
        allowPreOrder: { type: Boolean, default: true },
      },
      reviews: {
        enabled: { type: Boolean, default: true },
        requireApproval: { type: Boolean, default: true },
        allowPhotos: { type: Boolean, default: true },
        minOrdersToReview: { type: Number, default: 1, min: 0, max: 10 },
        autoApproveThreshold: { type: Number, min: 1, max: 5 },
      },
      scheduledOrders: {
        enabled: { type: Boolean, default: false },
        minAdvanceMinutes: { type: Number, default: 60, min: 15, max: 1440 },
        maxAdvanceDays: { type: Number, default: 7, min: 1, max: 30 },
        slotDuration: { type: Number, default: 30, min: 15, max: 120 },
        maxOrdersPerSlot: { type: Number, default: 5, min: 1, max: 50 },
        pickupEnabled: { type: Boolean, default: true },
        deliveryEnabled: { type: Boolean, default: false },
        deliveryRadius: { type: Number, min: 0, max: 50 },
        deliveryFee: { type: Number, default: 0, min: 0 },
        deliveryMinOrder: { type: Number, default: 0, min: 0 },
      },
    },
    reviewStats: {
      averageRating: { type: Number, default: 0, min: 0, max: 5 },
      totalReviews: { type: Number, default: 0, min: 0 },
      ratingDistribution: {
        1: { type: Number, default: 0 },
        2: { type: Number, default: 0 },
        3: { type: Number, default: 0 },
        4: { type: Number, default: 0 },
        5: { type: Number, default: 0 },
      },
      responseRate: { type: Number, default: 0, min: 0, max: 100 },
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate slug from name before saving
restaurantSchema.pre('save', function () {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
});

// Indexes (slug index created by unique: true)
restaurantSchema.index({ ownerId: 1 });
restaurantSchema.index({ isActive: 1 });

export const Restaurant = mongoose.model<IRestaurant>('Restaurant', restaurantSchema);
export default Restaurant;
