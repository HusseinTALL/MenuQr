import mongoose, { Document, Schema } from 'mongoose';

// ============================================
// Types & Interfaces
// ============================================

export interface IHotelCategory extends Document {
  _id: mongoose.Types.ObjectId;
  hotelId: mongoose.Types.ObjectId;
  menuId: mongoose.Types.ObjectId;        // Parent hotel menu

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
  icon?: string;

  // Availability time (within menu hours)
  availableFrom?: string;      // "06:00"
  availableTo?: string;        // "10:30"

  order: number;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;

  // Virtual properties
  isCurrentlyAvailable: boolean;
}

// ============================================
// Schema Definition
// ============================================

const hotelCategorySchema = new Schema<IHotelCategory>(
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

    name: {
      type: Schema.Types.Mixed,
      required: [true, 'Category name is required'],
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
    icon: { type: String },

    // Availability
    availableFrom: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'],
    },
    availableTo: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'],
    },

    order: {
      type: Number,
      default: 0,
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

// ============================================
// Pre-save Hooks
// ============================================

// Generate slug from French name
hotelCategorySchema.pre('validate', function () {
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

hotelCategorySchema.index({ hotelId: 1, menuId: 1, slug: 1 }, { unique: true });
hotelCategorySchema.index({ hotelId: 1, menuId: 1, order: 1 });
hotelCategorySchema.index({ hotelId: 1, isActive: 1 });
hotelCategorySchema.index({ menuId: 1, isActive: 1 });

// ============================================
// Virtual Properties
// ============================================

hotelCategorySchema.virtual('isCurrentlyAvailable').get(function () {
  if (!this.isActive) {return false;}

  if (!this.availableFrom || !this.availableTo) {return true;}

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return currentTime >= this.availableFrom && currentTime <= this.availableTo;
});

// Ensure virtuals are included in JSON
hotelCategorySchema.set('toJSON', { virtuals: true });
hotelCategorySchema.set('toObject', { virtuals: true });

// ============================================
// Static Methods
// ============================================

hotelCategorySchema.statics.findByMenu = function (menuId: mongoose.Types.ObjectId) {
  return this.find({ menuId, isActive: true }).sort({ order: 1 });
};

hotelCategorySchema.statics.findByHotel = function (hotelId: mongoose.Types.ObjectId) {
  return this.find({ hotelId, isActive: true }).sort({ order: 1 });
};

// ============================================
// Export
// ============================================

export const HotelCategory = mongoose.model<IHotelCategory>('HotelCategory', hotelCategorySchema);
export default HotelCategory;
