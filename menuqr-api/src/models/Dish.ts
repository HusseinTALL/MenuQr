import mongoose, { Document, Schema } from 'mongoose';

export interface IDishOption {
  name: {
    fr: string;
    en?: string;
    [key: string]: string | undefined;
  };
  price: number;
  isDefault?: boolean;
}

export interface IDishVariant {
  name: {
    fr: string;
    en?: string;
    [key: string]: string | undefined;
  };
  price: number;
}

export interface IRatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface IReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: IRatingDistribution;
  lastReviewAt?: Date;
}

export interface IDish extends Document {
  _id: mongoose.Types.ObjectId;
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
  categoryId: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  allergens?: string[];
  tags?: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  options?: IDishOption[];
  variants?: IDishVariant[];
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isSpicy: boolean;
  spicyLevel?: number;
  isAvailable: boolean;
  isPopular: boolean;
  isNewDish: boolean;
  preparationTime?: number;
  order: number;
  reviewStats?: IReviewStats;
  createdAt: Date;
  updatedAt: Date;
}

const dishSchema = new Schema<IDish>(
  {
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
    image: String,
    images: [String],
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    allergens: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    nutritionalInfo: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
    },
    options: [
      {
        name: Schema.Types.Mixed,
        price: { type: Number, default: 0 },
        isDefault: { type: Boolean, default: false },
      },
    ],
    variants: [
      {
        name: Schema.Types.Mixed,
        price: { type: Number, required: true },
      },
    ],
    isVegetarian: { type: Boolean, default: false },
    isVegan: { type: Boolean, default: false },
    isGlutenFree: { type: Boolean, default: false },
    isSpicy: { type: Boolean, default: false },
    spicyLevel: { type: Number, min: 0, max: 5 },
    isAvailable: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    isNewDish: { type: Boolean, default: false },
    preparationTime: { type: Number, min: 0 },
    order: { type: Number, default: 0 },
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
      lastReviewAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Generate slug from French name before validation
dishSchema.pre('validate', function () {
  if (!this.slug && this.name) {
    const frName = (this.name as Record<string, string>).fr || '';
    this.slug = frName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
});

// Indexes
dishSchema.index({ restaurantId: 1, categoryId: 1 });
dishSchema.index({ restaurantId: 1, slug: 1 }, { unique: true });
dishSchema.index({ restaurantId: 1, isAvailable: 1 });
dishSchema.index({ categoryId: 1, order: 1 });
dishSchema.index({ 'name.fr': 'text', 'description.fr': 'text' });

export const Dish = mongoose.model<IDish>('Dish', dishSchema);
export default Dish;
