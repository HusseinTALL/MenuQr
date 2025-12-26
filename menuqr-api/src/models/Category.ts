import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
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
  image?: string;
  icon?: string;
  order: number;
  restaurantId: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
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
    image: String,
    icon: String,
    order: {
      type: Number,
      default: 0,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
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

// Generate slug from French name before validation
categorySchema.pre('validate', function () {
  if (!this.slug && this.name) {
    const frName = (this.name as Record<string, string>).fr || '';
    this.slug = frName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
});

// Compound index for unique slug per restaurant
categorySchema.index({ restaurantId: 1, slug: 1 }, { unique: true });
categorySchema.index({ restaurantId: 1, order: 1 });
categorySchema.index({ restaurantId: 1, isActive: 1 });

export const Category = mongoose.model<ICategory>('Category', categorySchema);
export default Category;
