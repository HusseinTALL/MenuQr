import mongoose, { Document, Schema } from 'mongoose';

// ============================================
// Types & Interfaces
// ============================================

export type HotelMenuType =
  | 'room_service'
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'minibar'
  | 'poolside'
  | 'spa'
  | 'special'
  | 'all_day';

export type MenuSourceType = 'custom' | 'linked_restaurant';

export interface IPricingRules {
  type: 'markup' | 'fixed' | 'same';
  markupPercent?: number;    // e.g., 20 for 20% markup
  markupFixed?: number;      // e.g., 2 for +2 EUR per item
}

export interface IHotelMenu extends Document {
  _id: mongoose.Types.ObjectId;
  hotelId: mongoose.Types.ObjectId;

  name: {
    fr: string;
    en?: string;
    [key: string]: string | undefined;
  };
  slug: string;
  description?: {
    fr?: string;
    en?: string;
    [key: string]: string | undefined;
  };
  image?: string;

  // Menu Type
  type: HotelMenuType;

  // Availability
  availableFrom?: string;      // "06:00"
  availableTo?: string;        // "23:00"
  availableDays?: string[];    // ["monday", "tuesday", ...]
  isAvailable24h: boolean;

  // Menu Source
  source: MenuSourceType;
  linkedRestaurantId?: mongoose.Types.ObjectId;

  // Pricing Rules (for linked menus)
  pricingRules?: IPricingRules;

  // Statistics
  totalOrders: number;
  totalRevenue: number;

  isActive: boolean;
  order: number;

  createdAt: Date;
  updatedAt: Date;

  // Virtual properties
  isCurrentlyAvailable: boolean;

  // Methods
  calculatePrice(basePrice: number): number;
}

// ============================================
// Schema Definition
// ============================================

const pricingRulesSchema = new Schema<IPricingRules>(
  {
    type: {
      type: String,
      enum: ['markup', 'fixed', 'same'],
      default: 'same',
    },
    markupPercent: { type: Number, min: 0, max: 500 },
    markupFixed: { type: Number, min: 0 },
  },
  { _id: false }
);

const hotelMenuSchema = new Schema<IHotelMenu>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hotel',
      required: [true, 'Hotel ID is required'],
    },

    name: {
      type: Schema.Types.Mixed,
      required: [true, 'Menu name is required'],
      validate: {
        validator: function (v: Record<string, string>) {
          return v && typeof v.fr === 'string' && v.fr.length > 0;
        },
        message: 'French name is required',
      },
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    description: {
      type: Schema.Types.Mixed,
    },
    image: { type: String },

    // Menu Type
    type: {
      type: String,
      enum: ['room_service', 'breakfast', 'lunch', 'dinner', 'minibar', 'poolside', 'spa', 'special', 'all_day'],
      default: 'room_service',
    },

    // Availability
    availableFrom: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'],
    },
    availableTo: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'],
    },
    availableDays: {
      type: [String],
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
    isAvailable24h: {
      type: Boolean,
      default: false,
    },

    // Menu Source
    source: {
      type: String,
      enum: ['custom', 'linked_restaurant'],
      default: 'custom',
    },
    linkedRestaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
    },

    // Pricing Rules
    pricingRules: pricingRulesSchema,

    // Statistics
    totalOrders: { type: Number, default: 0, min: 0 },
    totalRevenue: { type: Number, default: 0, min: 0 },

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

// Generate slug from French name
hotelMenuSchema.pre('validate', function () {
  if (!this.slug && this.name) {
    const frName = (this.name as Record<string, string>).fr || '';
    this.slug = frName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
});

// ============================================
// Indexes
// ============================================

hotelMenuSchema.index({ hotelId: 1, slug: 1 }, { unique: true });
hotelMenuSchema.index({ hotelId: 1, isActive: 1 });
hotelMenuSchema.index({ hotelId: 1, type: 1 });
hotelMenuSchema.index({ hotelId: 1, order: 1 });
hotelMenuSchema.index({ linkedRestaurantId: 1 });

// ============================================
// Virtual Properties
// ============================================

hotelMenuSchema.virtual('isCurrentlyAvailable').get(function () {
  if (!this.isActive) {return false;}
  if (this.isAvailable24h) {return true;}

  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Check day availability
  if (this.availableDays && !this.availableDays.includes(currentDay)) {
    return false;
  }

  // Check time availability
  if (this.availableFrom && this.availableTo) {
    return currentTime >= this.availableFrom && currentTime <= this.availableTo;
  }

  return true;
});

// Ensure virtuals are included in JSON
hotelMenuSchema.set('toJSON', { virtuals: true });
hotelMenuSchema.set('toObject', { virtuals: true });

// ============================================
// Static Methods
// ============================================

hotelMenuSchema.statics.findActiveMenus = function (hotelId: mongoose.Types.ObjectId) {
  return this.find({ hotelId, isActive: true }).sort({ order: 1 });
};

hotelMenuSchema.statics.findByType = function (hotelId: mongoose.Types.ObjectId, type: HotelMenuType) {
  return this.find({ hotelId, type, isActive: true }).sort({ order: 1 });
};

// ============================================
// Instance Methods
// ============================================

hotelMenuSchema.methods.calculatePrice = function (basePrice: number): number {
  if (!this.pricingRules || this.pricingRules.type === 'same') {
    return basePrice;
  }

  if (this.pricingRules.type === 'markup' && this.pricingRules.markupPercent) {
    return basePrice * (1 + this.pricingRules.markupPercent / 100);
  }

  if (this.pricingRules.type === 'fixed' && this.pricingRules.markupFixed) {
    return basePrice + this.pricingRules.markupFixed;
  }

  return basePrice;
};

// ============================================
// Export
// ============================================

export const HotelMenu = mongoose.model<IHotelMenu>('HotelMenu', hotelMenuSchema);
export default HotelMenu;
