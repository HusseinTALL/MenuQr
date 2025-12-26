import mongoose, { Document, Schema } from 'mongoose';

export type TransactionType = 'earn' | 'redeem' | 'expire' | 'adjust' | 'bonus';

export interface ILoyaltyTransaction extends Document {
  _id: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  type: TransactionType;
  points: number; // Positive for earn/bonus, negative for redeem/expire
  balance: number; // Running balance after transaction
  description: string;
  expiresAt?: Date; // For earn transactions: when these points expire
  expiredFromTransactionId?: mongoose.Types.ObjectId; // Reference to original earn transaction for expire type
  metadata?: {
    orderTotal?: number;
    tierAtTime?: string;
    discountApplied?: number;
    redemptionValue?: number; // FCFA value for redeem transactions
    adjustedBy?: mongoose.Types.ObjectId; // Admin who made the adjustment
    reason?: string; // For adjust type
  };
  createdAt: Date;
  updatedAt: Date;
}

const loyaltyTransactionSchema = new Schema<ILoyaltyTransaction>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Restaurant ID is required'],
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    type: {
      type: String,
      enum: ['earn', 'redeem', 'expire', 'adjust', 'bonus'],
      required: [true, 'Transaction type is required'],
    },
    points: {
      type: Number,
      required: [true, 'Points value is required'],
    },
    balance: {
      type: Number,
      required: [true, 'Balance is required'],
      min: 0,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 500,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    expiredFromTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'LoyaltyTransaction',
    },
    metadata: {
      orderTotal: Number,
      tierAtTime: {
        type: String,
        enum: ['bronze', 'argent', 'or', 'platine'],
      },
      discountApplied: Number,
      redemptionValue: Number,
      adjustedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      reason: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
loyaltyTransactionSchema.index({ customerId: 1, createdAt: -1 });
loyaltyTransactionSchema.index({ customerId: 1, type: 1, expiresAt: 1 });
loyaltyTransactionSchema.index({ restaurantId: 1, createdAt: -1 });
loyaltyTransactionSchema.index({ orderId: 1 }, { sparse: true });
loyaltyTransactionSchema.index({ customerId: 1, type: 1, expiresAt: 1, points: 1 }); // For FIFO expiration

export const LoyaltyTransaction = mongoose.model<ILoyaltyTransaction>(
  'LoyaltyTransaction',
  loyaltyTransactionSchema
);
export default LoyaltyTransaction;
