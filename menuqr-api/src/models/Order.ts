import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderItem {
  dishId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  options?: {
    name: string;
    price: number;
  }[];
  variant?: {
    name: string;
    price: number;
  };
  specialInstructions?: string;
  subtotal: number;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export type FulfillmentType = 'dine-in' | 'pickup' | 'delivery';

export interface IDeliveryAddress {
  street: string;
  city: string;
  postalCode?: string;
  additionalInfo?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  restaurantId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId; // Link to Customer account (optional for guest orders)
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  specialInstructions?: string;
  estimatedReadyTime?: Date;
  confirmedAt?: Date;
  preparedAt?: Date;
  servedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;

  // Scheduled Order Fields
  isScheduled: boolean;
  scheduledFor?: Date;
  scheduledSlot?: string; // e.g., "12:00", "12:30"
  fulfillmentType: FulfillmentType;
  deliveryAddress?: IDeliveryAddress;
  deliveryFee?: number;

  // Loyalty Program
  loyalty?: {
    tierAtOrder: string;
    tierDiscountPercent: number;
    tierDiscountAmount: number;
    pointsRedeemed: number;
    redemptionCreditApplied: number;
    pointsEarned: number;
    finalTotal: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    tableNumber: {
      type: String,
      trim: true,
    },
    customerName: {
      type: String,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    customerPhone: {
      type: String,
      match: [/^[+]?[\d\s-()]+$/, 'Please enter a valid phone number'],
    },
    customerEmail: {
      type: String,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    items: [
      {
        dishId: {
          type: Schema.Types.ObjectId,
          ref: 'Dish',
          required: true,
        },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
        options: [
          {
            name: String,
            price: Number,
          },
        ],
        variant: {
          name: String,
          price: Number,
        },
        specialInstructions: String,
        subtotal: { type: Number, required: true },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
      default: 'pending',
    },
    paymentMethod: String,
    specialInstructions: {
      type: String,
      maxlength: [500, 'Instructions cannot exceed 500 characters'],
    },
    estimatedReadyTime: Date,
    confirmedAt: Date,
    preparedAt: Date,
    servedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancelReason: String,

    // Scheduled Order Fields
    isScheduled: {
      type: Boolean,
      default: false,
    },
    scheduledFor: {
      type: Date,
    },
    scheduledSlot: {
      type: String,
    },
    fulfillmentType: {
      type: String,
      enum: ['dine-in', 'pickup', 'delivery'],
      default: 'dine-in',
    },
    deliveryAddress: {
      street: String,
      city: String,
      postalCode: String,
      additionalInfo: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Loyalty Program
    loyalty: {
      tierAtOrder: {
        type: String,
        enum: ['bronze', 'argent', 'or', 'platine'],
      },
      tierDiscountPercent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      tierDiscountAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      pointsRedeemed: {
        type: Number,
        default: 0,
        min: 0,
      },
      redemptionCreditApplied: {
        type: Number,
        default: 0,
        min: 0,
      },
      pointsEarned: {
        type: Number,
        default: 0,
        min: 0,
      },
      finalTotal: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Generate order number before saving
orderSchema.pre('save', async function () {
  if ((this as unknown as { isNew: boolean }).isNew && !this.orderNumber) {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const count = await mongoose.model('Order').countDocuments({
      restaurantId: this.restaurantId,
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999)),
      },
    });
    this.orderNumber = `${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
});

// Indexes
orderSchema.index({ restaurantId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, status: 1 });
orderSchema.index({ restaurantId: 1, orderNumber: 1 });
orderSchema.index({ restaurantId: 1, tableNumber: 1 });
orderSchema.index({ customerId: 1, createdAt: -1 }); // For customer order history
orderSchema.index({ createdAt: -1 });
orderSchema.index({ restaurantId: 1, isScheduled: 1, scheduledFor: 1 }); // For scheduled orders

export const Order = mongoose.model<IOrder>('Order', orderSchema);
export default Order;
