import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IAddress {
  _id?: mongoose.Types.ObjectId;
  label: string; // "Maison", "Bureau", etc.
  street: string;
  city: string;
  postalCode?: string;
  country?: string;
  instructions?: string; // "Sonner 2 fois", "Code: 1234"
  isDefault: boolean;
}

export interface ICustomer extends Document {
  _id: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  phone: string;
  email?: string;
  name?: string;
  password: string;
  isPhoneVerified: boolean;

  // Account security
  failedLoginAttempts: number;
  lockUntil?: Date;
  isLocked: boolean;

  // Preferences
  defaultAddress?: IAddress;
  savedAddresses: IAddress[];
  dietaryPreferences: string[]; // vegetarian, vegan, gluten-free, halal, etc.
  allergens: string[];

  // Favorites
  favoriteDishes: mongoose.Types.ObjectId[];

  // Statistics
  isActive: boolean;
  lastOrderAt?: Date;
  totalOrders: number;
  totalSpent: number;

  // Loyalty Program
  loyalty: {
    totalPoints: number;
    lifetimePoints: number;
    currentTier: 'bronze' | 'argent' | 'or' | 'platine';
    tierUpdatedAt?: Date;
    lastPointsEarnedAt?: Date;
  };

  // Tokens
  refreshToken?: string;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const addressSchema = new Schema<IAddress>(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    street: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    country: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'Burkina Faso',
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const customerSchema = new Schema<ICustomer>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Restaurant ID is required'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[+]?[\d\s-()]+$/, 'Please enter a valid phone number'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true, // Allow multiple null values
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      validate: {
        validator: function (password: string) {
          // At least 1 uppercase, 1 lowercase, 1 number
          const hasUppercase = /[A-Z]/.test(password);
          const hasLowercase = /[a-z]/.test(password);
          const hasNumber = /\d/.test(password);
          return hasUppercase && hasLowercase && hasNumber;
        },
        message:
          'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      },
      select: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    defaultAddress: {
      type: addressSchema,
    },
    savedAddresses: {
      type: [addressSchema],
      default: [],
      validate: {
        validator: function (v: IAddress[]) {
          return v.length <= 5; // Max 5 saved addresses
        },
        message: 'Cannot save more than 5 addresses',
      },
    },
    dietaryPreferences: {
      type: [String],
      default: [],
      enum: ['vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher', 'lactose-free', 'nut-free'],
    },
    allergens: {
      type: [String],
      default: [],
    },
    favoriteDishes: {
      type: [Schema.Types.ObjectId],
      ref: 'Dish',
      default: [],
      validate: {
        validator: function (v: mongoose.Types.ObjectId[]) {
          return v.length <= 50; // Max 50 favorites
        },
        message: 'Cannot have more than 50 favorite dishes',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastOrderAt: {
      type: Date,
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    loyalty: {
      totalPoints: {
        type: Number,
        default: 0,
        min: 0,
      },
      lifetimePoints: {
        type: Number,
        default: 0,
        min: 0,
      },
      currentTier: {
        type: String,
        enum: ['bronze', 'argent', 'or', 'platine'],
        default: 'bronze',
      },
      tierUpdatedAt: {
        type: Date,
      },
      lastPointsEarnedAt: {
        type: Date,
      },
    },
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: phone + restaurantId (one account per phone per restaurant)
customerSchema.index({ phone: 1, restaurantId: 1 }, { unique: true });
customerSchema.index({ email: 1, restaurantId: 1 }, { sparse: true });
customerSchema.index({ restaurantId: 1 });
customerSchema.index({ lastOrderAt: -1 });

// Hash password before saving
customerSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
customerSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full address string
customerSchema.virtual('fullDefaultAddress').get(function () {
  if (!this.defaultAddress) {return null;}
  const { street, city, postalCode, country } = this.defaultAddress;
  return [street, city, postalCode, country].filter(Boolean).join(', ');
});

// Virtual for account lock status
customerSchema.virtual('isLocked').get(function () {
  // Check if lockUntil exists and is in the future
  return !!(this.lockUntil && this.lockUntil > new Date());
});

// Ensure virtuals are included in JSON
customerSchema.set('toJSON', { virtuals: true });
customerSchema.set('toObject', { virtuals: true });

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);
export default Customer;
