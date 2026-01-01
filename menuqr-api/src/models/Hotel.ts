import mongoose, { Document, Schema } from 'mongoose';

// ============================================
// Types & Interfaces
// ============================================

export interface IFloor {
  number: number;         // 1, 2, 3... or -1 for basement
  name?: string;          // "Lobby", "Pool Level"
  zones?: string[];       // "North Wing", "South Wing"
}

export interface IBuilding {
  _id?: mongoose.Types.ObjectId;
  name: string;           // "Main Building", "Tower A", etc.
  code: string;           // "MB", "TA"
  floors: IFloor[];
}

export interface IRoomServiceSettings {
  enabled: boolean;
  minOrderAmount?: number;
  deliveryFee: number;
  deliveryFeeType: 'fixed' | 'percentage';
  serviceChargePercent?: number;
  taxPercent?: number;
  estimatedDeliveryMinutes: number;
  autoAcceptOrders: boolean;
  maxActiveOrdersPerRoom: number;
  allowScheduledOrders: boolean;
  requireGuestVerification: boolean;
}

export interface IGuestAuthSettings {
  method: 'room_pin' | 'check_in_code' | 'pms_integration' | 'open_access';
  pinLength: number;
  codeExpiresWithCheckout: boolean;
  allowMultipleDevices: boolean;
}

export interface IBillingSettings {
  allowRoomCharge: boolean;
  requirePaymentUpfront: boolean;
  acceptedPaymentMethods: string[];
}

export interface INotificationSettings {
  orderNotifications: boolean;
  notifyReception: boolean;
  notifyKitchen: boolean;
  smsNotifications: boolean;
}

export interface IHotelSettings {
  currency: string;
  timezone: string;
  defaultLanguage: string;
  availableLanguages: string[];
  roomService: IRoomServiceSettings;
  guestAuth: IGuestAuthSettings;
  billing: IBillingSettings;
  notifications: INotificationSettings;
}

export interface IOperatingHours {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  open: string;
  close: string;
  is24h: boolean;
  isClosed: boolean;
}

export interface IHotel extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: {
    fr: string;
    en?: string;
    [key: string]: string | undefined;
  };
  logo?: string;
  coverImage?: string;
  images?: string[];

  // Contact & Location
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  phone?: string;
  email?: string;
  website?: string;
  starRating?: number; // 1-5 stars

  // Structure
  buildings: IBuilding[];
  totalRooms: number;
  totalFloors: number;

  // Operating Hours for room service
  roomServiceHours: IOperatingHours[];

  // Settings
  settings: IHotelSettings;

  // Links
  ownerId: mongoose.Types.ObjectId;                    // User who owns this hotel
  linkedRestaurantId?: mongoose.Types.ObjectId;        // Optional link to restaurant for shared menu

  // Subscription & Status
  subscriptionId?: mongoose.Types.ObjectId;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Schema Definition
// ============================================

const floorSchema = new Schema<IFloor>(
  {
    number: { type: Number, required: true },
    name: { type: String, trim: true },
    zones: [{ type: String, trim: true }],
  },
  { _id: false }
);

const buildingSchema = new Schema<IBuilding>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    floors: [floorSchema],
  },
  { _id: true }
);

const operatingHoursSchema = new Schema<IOperatingHours>(
  {
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true,
    },
    open: { type: String, default: '06:00' },
    close: { type: String, default: '23:00' },
    is24h: { type: Boolean, default: false },
    isClosed: { type: Boolean, default: false },
  },
  { _id: false }
);

const hotelSchema = new Schema<IHotel>(
  {
    name: {
      type: String,
      required: [true, 'Hotel name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: Schema.Types.Mixed,
    },
    logo: { type: String },
    coverImage: { type: String },
    images: [{ type: String }],

    // Address
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      country: { type: String, default: 'FR' },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    phone: {
      type: String,
      match: [/^[+]?[\d\s-()]+$/, 'Please enter a valid phone number'],
    },
    email: {
      type: String,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    website: { type: String },
    starRating: {
      type: Number,
      min: 1,
      max: 5,
    },

    // Structure
    buildings: [buildingSchema],
    totalRooms: { type: Number, default: 0, min: 0 },
    totalFloors: { type: Number, default: 0, min: 0 },

    // Operating Hours
    roomServiceHours: [operatingHoursSchema],

    // Settings
    settings: {
      currency: { type: String, default: 'EUR' },
      timezone: { type: String, default: 'Europe/Paris' },
      defaultLanguage: { type: String, default: 'fr' },
      availableLanguages: { type: [String], default: ['fr', 'en'] },

      roomService: {
        enabled: { type: Boolean, default: true },
        minOrderAmount: { type: Number, min: 0 },
        deliveryFee: { type: Number, default: 0, min: 0 },
        deliveryFeeType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
        serviceChargePercent: { type: Number, default: 0, min: 0, max: 100 },
        taxPercent: { type: Number, default: 0, min: 0, max: 100 },
        estimatedDeliveryMinutes: { type: Number, default: 30, min: 5 },
        autoAcceptOrders: { type: Boolean, default: false },
        maxActiveOrdersPerRoom: { type: Number, default: 3, min: 1 },
        allowScheduledOrders: { type: Boolean, default: true },
        requireGuestVerification: { type: Boolean, default: true },
      },

      guestAuth: {
        method: {
          type: String,
          enum: ['room_pin', 'check_in_code', 'pms_integration', 'open_access'],
          default: 'room_pin',
        },
        pinLength: { type: Number, default: 4, min: 4, max: 8 },
        codeExpiresWithCheckout: { type: Boolean, default: true },
        allowMultipleDevices: { type: Boolean, default: true },
      },

      billing: {
        allowRoomCharge: { type: Boolean, default: true },
        requirePaymentUpfront: { type: Boolean, default: false },
        acceptedPaymentMethods: { type: [String], default: ['room_charge', 'card', 'cash'] },
      },

      notifications: {
        orderNotifications: { type: Boolean, default: true },
        notifyReception: { type: Boolean, default: true },
        notifyKitchen: { type: Boolean, default: true },
        smsNotifications: { type: Boolean, default: false },
      },
    },

    // Links
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    linkedRestaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
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

// Generate slug from name before saving
hotelSchema.pre('save', function () {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
});

// ============================================
// Indexes
// ============================================

hotelSchema.index({ slug: 1 }, { unique: true });
hotelSchema.index({ ownerId: 1 });
hotelSchema.index({ isActive: 1 });
hotelSchema.index({ 'address.city': 1 });
hotelSchema.index({ linkedRestaurantId: 1 });

// ============================================
// Export
// ============================================

export const Hotel = mongoose.model<IHotel>('Hotel', hotelSchema);
export default Hotel;
