import mongoose, { Document, Schema } from 'mongoose';

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

export interface IReviewImage {
  url: string;
  publicId: string;
}

export interface IReviewResponse {
  content: string;
  respondedAt: Date;
  respondedBy: mongoose.Types.ObjectId;
}

export interface IReview extends Document {
  _id: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  dishId?: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;

  // Evaluation
  rating: number;
  title?: string;
  comment?: string;

  // Photos
  images: IReviewImage[];

  // Restaurant response
  response?: IReviewResponse;

  // Moderation
  status: ReviewStatus;
  moderatedAt?: Date;
  moderatedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;

  // Engagement
  helpfulCount: number;
  reportCount: number;
  helpfulVoters: mongoose.Types.ObjectId[];
  reporters: mongoose.Types.ObjectId[];

  // Metadata
  isVerifiedPurchase: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewImageSchema = new Schema<IReviewImage>(
  {
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const reviewResponseSchema = new Schema<IReviewResponse>(
  {
    content: {
      type: String,
      required: true,
      maxlength: [500, 'La réponse ne peut pas dépasser 500 caractères'],
    },
    respondedAt: {
      type: Date,
      default: Date.now,
    },
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { _id: false }
);

const reviewSchema = new Schema<IReview>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Le restaurant est requis'],
      index: true,
    },
    dishId: {
      type: Schema.Types.ObjectId,
      ref: 'Dish',
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Le client est requis'],
      index: true,
    },

    // Evaluation
    rating: {
      type: Number,
      required: [true, 'La note est requise'],
      min: [1, 'La note minimum est 1'],
      max: [5, 'La note maximum est 5'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Le commentaire ne peut pas dépasser 1000 caractères'],
    },

    // Photos
    images: {
      type: [reviewImageSchema],
      default: [],
      validate: {
        validator: function (v: IReviewImage[]) {
          return v.length <= 3;
        },
        message: 'Maximum 3 photos autorisées',
      },
    },

    // Restaurant response
    response: reviewResponseSchema,

    // Moderation
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'flagged'],
      default: 'pending',
      index: true,
    },
    moderatedAt: Date,
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: {
      type: String,
      maxlength: [200, 'La raison ne peut pas dépasser 200 caractères'],
    },

    // Engagement
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    reportCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    helpfulVoters: {
      type: [Schema.Types.ObjectId],
      ref: 'Customer',
      default: [],
    },
    reporters: {
      type: [Schema.Types.ObjectId],
      ref: 'Customer',
      default: [],
    },

    // Metadata
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
reviewSchema.index({ restaurantId: 1, status: 1, createdAt: -1 }); // Restaurant reviews
reviewSchema.index({ dishId: 1, status: 1, createdAt: -1 }); // Dish reviews
reviewSchema.index({ customerId: 1, createdAt: -1 }); // Customer history
reviewSchema.index({ status: 1, createdAt: -1 }); // Moderation queue
reviewSchema.index({ rating: 1 }); // Filter by rating

// Unique constraint: one review per dish per customer (sparse for restaurant-only reviews)
reviewSchema.index(
  { customerId: 1, restaurantId: 1, dishId: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { dishId: { $exists: true } },
  }
);

// For restaurant-only reviews (no dish)
reviewSchema.index(
  { customerId: 1, restaurantId: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { dishId: { $exists: false } },
  }
);

export const Review = mongoose.model<IReview>('Review', reviewSchema);
export default Review;
