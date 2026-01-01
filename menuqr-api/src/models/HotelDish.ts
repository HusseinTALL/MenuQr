import mongoose, { Document, Schema } from 'mongoose';

// ============================================
// Types & Interfaces
// ============================================

export interface IHotelDishOption {
  name: {
    fr: string;
    en?: string;
    [key: string]: string | undefined;
  };
  price: number;
  isDefault?: boolean;
}

export interface IHotelDishVariant {
  name: {
    fr: string;
    en?: string;
    [key: string]: string | undefined;
  };
  price: number;
}

export interface IHotelDish extends Document {
  _id: mongoose.Types.ObjectId;
  hotelId: mongoose.Types.ObjectId;
  menuId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;

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
  price: number;
  image?: string;
  images?: string[];

  // Dietary Info
  allergens?: string[];
  tags?: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };

  // Options & Variants
  options?: IHotelDishOption[];
  variants?: IHotelDishVariant[];

  // Dietary Flags
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isSpicy: boolean;
  spicyLevel?: number;

  // Availability
  isAvailable: boolean;
  availableFrom?: string;      // Time-based availability
  availableTo?: string;

  // Popularity
  isPopular: boolean;
  isNewDish: boolean;
  isFeatured: boolean;

  // Preparation
  preparationTime?: number;    // Minutes

  // Statistics
  totalOrders: number;
  totalRevenue: number;
  averageRating?: number;

  order: number;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Schema Definition
// ============================================

const hotelDishSchema = new Schema<IHotelDish>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hotel',
      required: [true, 'Hotel ID is required'],
    },
    menuId: {
      type: Schema.Types.ObjectId,
      ref: 'HotelMenu',
      required: [true, 'Menu ID is required'],
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'HotelCategory',
      required: [true, 'Category ID is required'],
    },

    name: {
      type: Schema.Types.Mixed,
      required: [true, 'Dish name is required'],
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
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    image: { type: String },
    images: [{ type: String }],

    // Dietary Info
    allergens: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    nutritionalInfo: {
      calories: { type: Number, min: 0 },
      protein: { type: Number, min: 0 },
      carbs: { type: Number, min: 0 },
      fat: { type: Number, min: 0 },
    },

    // Options & Variants
    options: [
      {
        name: { type: Schema.Types.Mixed },
        price: { type: Number, default: 0 },
        isDefault: { type: Boolean, default: false },
      },
    ],
    variants: [
      {
        name: { type: Schema.Types.Mixed },
        price: { type: Number, required: true },
      },
    ],

    // Dietary Flags
    isVegetarian: { type: Boolean, default: false },
    isVegan: { type: Boolean, default: false },
    isGlutenFree: { type: Boolean, default: false },
    isSpicy: { type: Boolean, default: false },
    spicyLevel: { type: Number, min: 0, max: 5 },

    // Availability
    isAvailable: { type: Boolean, default: true },
    availableFrom: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'],
    },
    availableTo: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'],
    },

    // Popularity
    isPopular: { type: Boolean, default: false },
    isNewDish: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },

    // Preparation
    preparationTime: { type: Number, min: 0 },

    // Statistics
    totalOrders: { type: Number, default: 0, min: 0 },
    totalRevenue: { type: Number, default: 0, min: 0 },
    averageRating: { type: Number, min: 0, max: 5 },

    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// ============================================
// Pre-save Hooks
// ============================================

// Generate slug from French name
hotelDishSchema.pre('validate', function () {
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

hotelDishSchema.index({ hotelId: 1, menuId: 1, categoryId: 1 });
hotelDishSchema.index({ hotelId: 1, slug: 1 }, { unique: true });
hotelDishSchema.index({ hotelId: 1, isAvailable: 1 });
hotelDishSchema.index({ menuId: 1, categoryId: 1, order: 1 });
hotelDishSchema.index({ categoryId: 1, order: 1 });
hotelDishSchema.index({ hotelId: 1, isPopular: 1 });
hotelDishSchema.index({ hotelId: 1, isFeatured: 1 });
hotelDishSchema.index({ 'name.fr': 'text', 'description.fr': 'text' });

// ============================================
// Virtual Properties
// ============================================

hotelDishSchema.virtual('isCurrentlyAvailable').get(function () {
  if (!this.isAvailable) {return false;}

  if (!this.availableFrom || !this.availableTo) {return true;}

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return currentTime >= this.availableFrom && currentTime <= this.availableTo;
});

// Ensure virtuals are included in JSON
hotelDishSchema.set('toJSON', { virtuals: true });
hotelDishSchema.set('toObject', { virtuals: true });

// ============================================
// Static Methods
// ============================================

hotelDishSchema.statics.findByCategory = function (categoryId: mongoose.Types.ObjectId) {
  return this.find({ categoryId, isAvailable: true }).sort({ order: 1 });
};

hotelDishSchema.statics.findByMenu = function (menuId: mongoose.Types.ObjectId) {
  return this.find({ menuId, isAvailable: true }).sort({ order: 1 });
};

hotelDishSchema.statics.findPopular = function (hotelId: mongoose.Types.ObjectId, limit = 10) {
  return this.find({ hotelId, isPopular: true, isAvailable: true })
    .sort({ totalOrders: -1 })
    .limit(limit);
};

hotelDishSchema.statics.findFeatured = function (hotelId: mongoose.Types.ObjectId) {
  return this.find({ hotelId, isFeatured: true, isAvailable: true }).sort({ order: 1 });
};

hotelDishSchema.statics.search = function (hotelId: mongoose.Types.ObjectId, query: string) {
  return this.find({
    hotelId,
    isAvailable: true,
    $text: { $search: query },
  }).sort({ score: { $meta: 'textScore' } });
};

// ============================================
// Export
// ============================================

export const HotelDish = mongoose.model<IHotelDish>('HotelDish', hotelDishSchema);
export default HotelDish;
