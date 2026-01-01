import mongoose, { Document, Schema } from 'mongoose';

// ============================================
// Types & Interfaces
// ============================================

export type HotelOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'      // Staff picked up from kitchen
  | 'delivering'     // On the way to room
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'room_charge' | 'refunded' | 'failed';
export type PaymentMethod = 'room_charge' | 'card' | 'cash' | 'mobile_pay';

export interface IHotelOrderItem {
  dishId: mongoose.Types.ObjectId;
  name: {
    fr: string;
    en?: string;
  };
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

export interface IStaffAssignment {
  staffId: mongoose.Types.ObjectId;
  staffName: string;
  assignedAt: Date;
}

export interface IDeliveryInfo {
  staffId: mongoose.Types.ObjectId;
  staffName: string;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  signature?: string;       // Guest signature URL if required
  photo?: string;           // Photo proof if required
  recipientName?: string;   // Who received the order
}

export interface IHotelOrder extends Document {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  hotelId: mongoose.Types.ObjectId;

  // Room Information
  roomId: mongoose.Types.ObjectId;
  roomNumber: string;
  floor: number;
  building?: string;

  // Guest Information
  guestId?: mongoose.Types.ObjectId;
  guestName: string;
  guestPhone?: string;

  // Menu Source
  menuType: string;   // 'room_service', 'breakfast', 'minibar', etc.
  menuId?: mongoose.Types.ObjectId;

  // Items
  items: IHotelOrderItem[];

  // Pricing
  subtotal: number;
  serviceCharge: number;
  deliveryFee: number;
  tax: number;
  tip: number;
  total: number;

  // Status
  status: HotelOrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;

  // Delivery
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  deliveryInstructions?: string;

  // Staff Assignment
  assignedTo?: IStaffAssignment;
  deliveredBy?: IDeliveryInfo;

  // Scheduling
  isScheduled: boolean;
  scheduledFor?: Date;

  // Guest Preferences
  leaveAtDoor: boolean;
  callBeforeDelivery: boolean;

  // Feedback
  rating?: number;
  feedback?: string;
  ratedAt?: Date;

  // Timestamps
  confirmedAt?: Date;
  preparingAt?: Date;
  readyAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  cancelledBy?: 'guest' | 'staff' | 'kitchen' | 'system';

  // Special Instructions
  specialInstructions?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Schema Definition
// ============================================

const orderItemSchema = new Schema<IHotelOrderItem>(
  {
    dishId: {
      type: Schema.Types.ObjectId,
      ref: 'HotelDish',
      required: true,
    },
    name: {
      fr: { type: String, required: true },
      en: { type: String },
    },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    options: [
      {
        name: { type: String },
        price: { type: Number, default: 0 },
      },
    ],
    variant: {
      name: { type: String },
      price: { type: Number },
    },
    specialInstructions: { type: String, maxlength: 500 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const staffAssignmentSchema = new Schema<IStaffAssignment>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    staffName: { type: String, required: true },
    assignedAt: { type: Date, required: true },
  },
  { _id: false }
);

const deliveryInfoSchema = new Schema<IDeliveryInfo>(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    staffName: { type: String, required: true },
    pickedUpAt: { type: Date },
    deliveredAt: { type: Date },
    signature: { type: String },
    photo: { type: String },
    recipientName: { type: String },
  },
  { _id: false }
);

const hotelOrderSchema = new Schema<IHotelOrder>(
  {
    orderNumber: {
      type: String,
      unique: true,
      // Not required - auto-generated in pre-save hook
    },
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: 'Hotel',
      required: [true, 'Hotel ID is required'],
    },

    // Room Information
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room ID is required'],
    },
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
    },
    floor: {
      type: Number,
      required: true,
    },
    building: {
      type: String,
      trim: true,
    },

    // Guest Information
    guestId: {
      type: Schema.Types.ObjectId,
      ref: 'HotelGuest',
    },
    guestName: {
      type: String,
      required: [true, 'Guest name is required'],
      trim: true,
    },
    guestPhone: {
      type: String,
      trim: true,
    },

    // Menu Source
    menuType: {
      type: String,
      default: 'room_service',
    },
    menuId: {
      type: Schema.Types.ObjectId,
      ref: 'HotelMenu',
    },

    // Items
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (v: IHotelOrderItem[]) {
          return v && v.length > 0;
        },
        message: 'Order must contain at least one item',
      },
    },

    // Pricing
    subtotal: { type: Number, required: true, min: 0 },
    serviceCharge: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    tip: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },

    // Status
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivering', 'delivered', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'room_charge', 'refunded', 'failed'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['room_charge', 'card', 'cash', 'mobile_pay'],
    },

    // Delivery
    estimatedDeliveryTime: { type: Date },
    actualDeliveryTime: { type: Date },
    deliveryInstructions: {
      type: String,
      maxlength: [500, 'Delivery instructions cannot exceed 500 characters'],
    },

    // Staff Assignment
    assignedTo: staffAssignmentSchema,
    deliveredBy: deliveryInfoSchema,

    // Scheduling
    isScheduled: { type: Boolean, default: false },
    scheduledFor: { type: Date },

    // Guest Preferences
    leaveAtDoor: { type: Boolean, default: false },
    callBeforeDelivery: { type: Boolean, default: true },

    // Feedback
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String, maxlength: 1000 },
    ratedAt: { type: Date },

    // Timestamps
    confirmedAt: { type: Date },
    preparingAt: { type: Date },
    readyAt: { type: Date },
    pickedUpAt: { type: Date },
    deliveredAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
    cancelledBy: {
      type: String,
      enum: ['guest', 'staff', 'kitchen', 'system'],
    },

    // Special Instructions
    specialInstructions: {
      type: String,
      maxlength: [500, 'Special instructions cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// Pre-save Hooks
// ============================================

// Generate order number before saving
hotelOrderSchema.pre('save', async function () {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const count = await mongoose.model('HotelOrder').countDocuments({
      hotelId: this.hotelId,
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lt: new Date(date.setHours(23, 59, 59, 999)),
      },
    });
    this.orderNumber = `H${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  // Set timestamps based on status changes
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'confirmed':
        if (!this.confirmedAt) {this.confirmedAt = now;}
        break;
      case 'preparing':
        if (!this.preparingAt) {this.preparingAt = now;}
        break;
      case 'ready':
        if (!this.readyAt) {this.readyAt = now;}
        break;
      case 'picked_up':
        if (!this.pickedUpAt) {this.pickedUpAt = now;}
        break;
      case 'delivered':
        if (!this.deliveredAt) {this.deliveredAt = now;}
        this.actualDeliveryTime = now;
        break;
      case 'completed':
        if (!this.completedAt) {this.completedAt = now;}
        break;
      case 'cancelled':
        if (!this.cancelledAt) {this.cancelledAt = now;}
        break;
    }
  }
});

// ============================================
// Indexes
// ============================================

hotelOrderSchema.index({ hotelId: 1, createdAt: -1 });
hotelOrderSchema.index({ hotelId: 1, status: 1 });
hotelOrderSchema.index({ hotelId: 1, roomNumber: 1 });
hotelOrderSchema.index({ hotelId: 1, floor: 1, status: 1 });
hotelOrderSchema.index({ hotelId: 1, guestId: 1 });
hotelOrderSchema.index({ roomId: 1, createdAt: -1 });
hotelOrderSchema.index({ orderNumber: 1 }, { unique: true });
hotelOrderSchema.index({ 'assignedTo.staffId': 1, status: 1 });
hotelOrderSchema.index({ hotelId: 1, isScheduled: 1, scheduledFor: 1 });
hotelOrderSchema.index({ hotelId: 1, paymentStatus: 1 });

// ============================================
// Virtual Properties
// ============================================

hotelOrderSchema.virtual('itemCount').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

hotelOrderSchema.virtual('isActive').get(function () {
  return !['delivered', 'completed', 'cancelled'].includes(this.status);
});

hotelOrderSchema.virtual('deliveryDuration').get(function () {
  if (!this.confirmedAt || !this.deliveredAt) {return null;}
  return Math.round((this.deliveredAt.getTime() - this.confirmedAt.getTime()) / 60000); // Minutes
});

// Ensure virtuals are included in JSON
hotelOrderSchema.set('toJSON', { virtuals: true });
hotelOrderSchema.set('toObject', { virtuals: true });

// ============================================
// Static Methods
// ============================================

hotelOrderSchema.statics.findActiveOrders = function (hotelId: mongoose.Types.ObjectId) {
  return this.find({
    hotelId,
    status: { $nin: ['delivered', 'completed', 'cancelled'] },
  }).sort({ createdAt: -1 });
};

hotelOrderSchema.statics.findByRoom = function (roomId: mongoose.Types.ObjectId) {
  return this.find({ roomId }).sort({ createdAt: -1 });
};

hotelOrderSchema.statics.findByFloor = function (hotelId: mongoose.Types.ObjectId, floor: number) {
  return this.find({
    hotelId,
    floor,
    status: { $nin: ['delivered', 'completed', 'cancelled'] },
  }).sort({ createdAt: 1 });
};

hotelOrderSchema.statics.findByStaff = function (staffId: mongoose.Types.ObjectId) {
  return this.find({
    'assignedTo.staffId': staffId,
    status: { $in: ['ready', 'picked_up', 'delivering'] },
  }).sort({ createdAt: 1 });
};

hotelOrderSchema.statics.findPendingKitchen = function (hotelId: mongoose.Types.ObjectId) {
  return this.find({
    hotelId,
    status: { $in: ['confirmed', 'preparing'] },
  }).sort({ createdAt: 1 });
};

hotelOrderSchema.statics.getStats = async function (
  hotelId: mongoose.Types.ObjectId,
  startDate?: Date,
  endDate?: Date
) {
  const match: Record<string, unknown> = { hotelId };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) {(match.createdAt as Record<string, Date>).$gte = startDate;}
    if (endDate) {(match.createdAt as Record<string, Date>).$lte = endDate;}
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        avgOrderValue: { $avg: '$total' },
        completedOrders: {
          $sum: { $cond: [{ $in: ['$status', ['delivered', 'completed']] }, 1, 0] },
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
        },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  return stats[0] || {
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    avgRating: null,
  };
};

// ============================================
// Instance Methods
// ============================================

hotelOrderSchema.methods.updateStatus = async function (
  newStatus: HotelOrderStatus,
  by?: 'guest' | 'staff' | 'kitchen' | 'system'
) {
  this.status = newStatus;

  if (newStatus === 'cancelled' && by) {
    this.cancelledBy = by;
  }

  return this.save();
};

hotelOrderSchema.methods.assignToStaff = async function (
  staffId: mongoose.Types.ObjectId,
  staffName: string
) {
  this.assignedTo = {
    staffId,
    staffName,
    assignedAt: new Date(),
  };
  return this.save();
};

hotelOrderSchema.methods.markDelivered = async function (
  staffId: mongoose.Types.ObjectId,
  staffName: string,
  recipientName?: string,
  signature?: string,
  photo?: string
) {
  this.status = 'delivered';
  this.deliveredBy = {
    staffId,
    staffName,
    pickedUpAt: this.pickedUpAt,
    deliveredAt: new Date(),
    recipientName,
    signature,
    photo,
  };
  return this.save();
};

hotelOrderSchema.methods.addRating = async function (rating: number, feedback?: string) {
  this.rating = rating;
  this.feedback = feedback;
  this.ratedAt = new Date();

  if (this.status === 'delivered') {
    this.status = 'completed';
  }

  return this.save();
};

// ============================================
// Export
// ============================================

export const HotelOrder = mongoose.model<IHotelOrder>('HotelOrder', hotelOrderSchema);
export default HotelOrder;
