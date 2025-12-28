import mongoose, { Document, Schema } from 'mongoose';

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'arrived'
  | 'seated'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type LocationPreference = 'indoor' | 'outdoor' | 'terrace' | 'no_preference';

export interface IPreOrderItem {
  dishId: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  options?: {
    name: string;
    choice: string;
    price: number;
  }[];
  notes?: string;
}

export interface IPreOrder {
  items: IPreOrderItem[];
  subtotal: number;
  notes?: string;
}

export interface IReservation extends Document {
  _id: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  tableId?: mongoose.Types.ObjectId;

  // Reservation info
  reservationNumber: string;
  reservationDate: Date;
  timeSlot: string;
  endTime: string;
  duration: number;
  partySize: number;

  // Preferences
  locationPreference: LocationPreference;
  specialRequests?: string;

  // Customer contact
  customerName: string;
  customerPhone: string;
  customerEmail?: string;

  // Pre-order
  preOrder?: IPreOrder;

  // Status
  status: ReservationStatus;

  // Notifications tracking
  confirmationSentAt?: Date;
  reminder24hSentAt?: Date;
  reminder2hSentAt?: Date;

  // Status timestamps
  confirmedAt?: Date;
  arrivedAt?: Date;
  seatedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  cancelledBy?: 'customer' | 'restaurant';

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const preOrderItemSchema = new Schema<IPreOrderItem>(
  {
    dishId: {
      type: Schema.Types.ObjectId,
      ref: 'Dish',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    options: [
      {
        name: String,
        choice: String,
        price: { type: Number, default: 0 },
      },
    ],
    notes: String,
  },
  { _id: false }
);

const preOrderSchema = new Schema<IPreOrder>(
  {
    items: [preOrderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: String,
  },
  { _id: false }
);

const reservationSchema = new Schema<IReservation>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      index: true,
    },
    tableId: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      index: true,
    },

    // Reservation info
    reservationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    reservationDate: {
      type: Date,
      required: [true, 'La date de réservation est requise'],
      index: true,
    },
    timeSlot: {
      type: String,
      required: [true, "L'heure de réservation est requise"],
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format horaire invalide (HH:MM)'],
    },
    endTime: {
      type: String,
      required: true,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format horaire invalide (HH:MM)'],
    },
    duration: {
      type: Number,
      required: true,
      default: 90,
      min: [30, 'Durée minimum: 30 minutes'],
      max: [240, 'Durée maximum: 4 heures'],
    },
    partySize: {
      type: Number,
      required: [true, 'Le nombre de personnes est requis'],
      min: [1, 'Minimum 1 personne'],
      max: [20, 'Maximum 20 personnes'],
    },

    // Preferences
    locationPreference: {
      type: String,
      enum: ['indoor', 'outdoor', 'terrace', 'no_preference'],
      default: 'no_preference',
    },
    specialRequests: {
      type: String,
      maxlength: [500, 'Les demandes spéciales ne peuvent pas dépasser 500 caractères'],
    },

    // Customer contact
    customerName: {
      type: String,
      required: [true, 'Le nom du client est requis'],
      trim: true,
      maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères'],
    },
    customerPhone: {
      type: String,
      required: [true, 'Le téléphone est requis'],
      match: [/^[+]?[\d\s-()]+$/, 'Numéro de téléphone invalide'],
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Email invalide'],
    },

    // Pre-order
    preOrder: preOrderSchema,

    // Status
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'arrived', 'seated', 'completed', 'cancelled', 'no_show'],
      default: 'pending',
      index: true,
    },

    // Notifications
    confirmationSentAt: Date,
    reminder24hSentAt: Date,
    reminder2hSentAt: Date,

    // Status timestamps
    confirmedAt: Date,
    arrivedAt: Date,
    seatedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancelReason: String,
    cancelledBy: {
      type: String,
      enum: ['customer', 'restaurant'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
reservationSchema.index({ restaurantId: 1, reservationDate: 1, timeSlot: 1 });
reservationSchema.index({ restaurantId: 1, status: 1, reservationDate: 1 });
reservationSchema.index({ customerId: 1, reservationDate: -1 });
reservationSchema.index({ restaurantId: 1, tableId: 1, reservationDate: 1 });
// Additional performance indexes
reservationSchema.index({ status: 1, reservationDate: 1 }); // For status-based queries across all restaurants
reservationSchema.index({ tableId: 1, reservationDate: 1, status: 1 }); // For table availability checks
// reservationNumber already has unique index from unique: true in schema

// Generate reservation number
// Use pre('validate') to set auto-generated fields BEFORE validation runs
reservationSchema.pre('validate', function () {
  if (this.isNew && !this.reservationNumber) {
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.reservationNumber = `REZ-${datePart}-${randomPart}`;
  }

  // Calculate end time if not set
  if (!this.endTime && this.timeSlot && this.duration) {
    const [hours, minutes] = this.timeSlot.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + this.duration;
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    this.endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  }
});

// Update status timestamps
reservationSchema.pre('save', function () {
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'confirmed':
        if (!this.confirmedAt) {this.confirmedAt = now;}
        break;
      case 'arrived':
        if (!this.arrivedAt) {this.arrivedAt = now;}
        break;
      case 'seated':
        if (!this.seatedAt) {this.seatedAt = now;}
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

export const Reservation = mongoose.model<IReservation>('Reservation', reservationSchema);
