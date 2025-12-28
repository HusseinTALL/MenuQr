import mongoose, { Document, Schema } from 'mongoose';

// SMS Provider configuration
export interface ISMSProviderConfig {
  provider: 'orange' | 'twilio' | 'vonage' | 'mock';
  enabled: boolean;
  credentials: {
    apiKey?: string;
    apiSecret?: string;
    accountSid?: string;
    authToken?: string;
    senderId?: string;
    clientId?: string;
    clientSecret?: string;
  };
  settings: {
    defaultSenderId: string;
    maxSMSPerDay: number;
    maxSMSPerMonth: number;
    rateLimitPerMinute: number;
  };
}

// Email Provider configuration
export interface IEmailProviderConfig {
  provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses';
  enabled: boolean;
  credentials: {
    host?: string;
    port?: number;
    secure?: boolean;
    username?: string;
    password?: string;
    apiKey?: string;
    domain?: string;
    region?: string;
  };
  settings: {
    defaultFromEmail: string;
    defaultFromName: string;
    maxEmailsPerDay: number;
    maxEmailsPerMonth: number;
  };
}

// Security settings
export interface ISecuritySettings {
  authentication: {
    jwtAccessTokenExpiry: string;
    jwtRefreshTokenExpiry: string;
    maxLoginAttempts: number;
    lockoutDuration: number; // in minutes
    requireEmailVerification: boolean;
    allowSocialLogin: boolean;
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSymbols: boolean;
  };
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    loginWindowMs: number;
    loginMaxAttempts: number;
  };
  cors: {
    allowedOrigins: string[];
    allowCredentials: boolean;
  };
  session: {
    maxConcurrentSessions: number;
    sessionTimeout: number; // in minutes
  };
}

// Platform settings
export interface IPlatformSettings {
  general: {
    platformName: string;
    platformUrl: string;
    supportEmail: string;
    supportPhone: string;
    defaultLanguage: string;
    availableLanguages: string[];
    defaultCurrency: string;
    defaultTimezone: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
  features: {
    allowNewRegistrations: boolean;
    requireSubscription: boolean;
    trialPeriodDays: number;
    enableReviews: boolean;
    enableReservations: boolean;
    enableLoyaltyProgram: boolean;
    enableSMSNotifications: boolean;
    enableEmailNotifications: boolean;
    enablePushNotifications: boolean;
  };
  limits: {
    maxRestaurantsPerUser: number;
    maxDishesPerRestaurant: number;
    maxCategoriesPerRestaurant: number;
    maxTablesPerRestaurant: number;
    maxImagesPerDish: number;
    maxFileSizeMB: number;
  };
}

// Billing settings
export interface IBillingSettings {
  currency: string;
  taxRate: number;
  taxName: string;
  invoicePrefix: string;
  invoiceFooter: string;
  paymentMethods: {
    stripe: {
      enabled: boolean;
      publicKey: string;
      secretKey: string;
      webhookSecret: string;
    };
    paypal: {
      enabled: boolean;
      clientId: string;
      clientSecret: string;
      sandbox: boolean;
    };
    bankTransfer: {
      enabled: boolean;
      bankName: string;
      accountName: string;
      accountNumber: string;
      iban: string;
      bic: string;
      instructions: string;
    };
  };
  autoRenewal: boolean;
  gracePeriodDays: number;
  dunningEnabled: boolean;
  dunningSteps: {
    daysBefore: number;
    emailTemplate: string;
  }[];
}

export interface ISystemConfig extends Document {
  _id: mongoose.Types.ObjectId;
  key: string;
  category: 'sms' | 'email' | 'security' | 'platform' | 'billing' | 'custom';
  value: ISMSProviderConfig | IEmailProviderConfig | ISecuritySettings | IPlatformSettings | IBillingSettings | Record<string, unknown>;
  description: string;
  isSecret: boolean;
  lastModifiedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const systemConfigSchema = new Schema<ISystemConfig>(
  {
    key: {
      type: String,
      required: true,
      unique: true, // unique: true automatically creates an index
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['sms', 'email', 'security', 'platform', 'billing', 'custom'],
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    isSecret: {
      type: Boolean,
      default: false,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Static method to get config by key
systemConfigSchema.statics.getByKey = async function (key: string) {
  return this.findOne({ key });
};

// Static method to get all configs by category
systemConfigSchema.statics.getByCategory = async function (category: string) {
  return this.find({ category });
};

// Static method to set config value
systemConfigSchema.statics.setConfig = async function (
  key: string,
  value: unknown,
  category: string,
  userId: mongoose.Types.ObjectId,
  options?: { description?: string; isSecret?: boolean }
) {
  return this.findOneAndUpdate(
    { key },
    {
      key,
      category,
      value,
      lastModifiedBy: userId,
      ...(options?.description && { description: options.description }),
      ...(options?.isSecret !== undefined && { isSecret: options.isSecret }),
    },
    { upsert: true, new: true }
  );
};

// Default configurations
export const defaultSMSConfig: ISMSProviderConfig = {
  provider: 'orange',
  enabled: true,
  credentials: {
    clientId: '',
    clientSecret: '',
    senderId: 'MenuQR',
  },
  settings: {
    defaultSenderId: 'MenuQR',
    maxSMSPerDay: 10000,
    maxSMSPerMonth: 100000,
    rateLimitPerMinute: 60,
  },
};

export const defaultEmailConfig: IEmailProviderConfig = {
  provider: 'smtp',
  enabled: true,
  credentials: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    username: '',
    password: '',
  },
  settings: {
    defaultFromEmail: 'noreply@menuqr.fr',
    defaultFromName: 'MenuQR',
    maxEmailsPerDay: 10000,
    maxEmailsPerMonth: 300000,
  },
};

export const defaultSecuritySettings: ISecuritySettings = {
  authentication: {
    jwtAccessTokenExpiry: '7d',
    jwtRefreshTokenExpiry: '30d',
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    requireEmailVerification: false,
    allowSocialLogin: false,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    passwordRequireSymbols: false,
  },
  rateLimit: {
    enabled: true,
    windowMs: 60000,
    maxRequests: 100,
    loginWindowMs: 900000,
    loginMaxAttempts: 5,
  },
  cors: {
    allowedOrigins: ['http://localhost:3000', 'https://menuqr.fr'],
    allowCredentials: true,
  },
  session: {
    maxConcurrentSessions: 5,
    sessionTimeout: 60,
  },
};

export const defaultPlatformSettings: IPlatformSettings = {
  general: {
    platformName: 'MenuQR',
    platformUrl: 'https://menuqr.fr',
    supportEmail: 'support@menuqr.fr',
    supportPhone: '+33 1 23 45 67 89',
    defaultLanguage: 'fr',
    availableLanguages: ['fr', 'en'],
    defaultCurrency: 'EUR',
    defaultTimezone: 'Europe/Paris',
    maintenanceMode: false,
    maintenanceMessage: 'Le site est en maintenance. Veuillez réessayer plus tard.',
  },
  features: {
    allowNewRegistrations: true,
    requireSubscription: false,
    trialPeriodDays: 14,
    enableReviews: true,
    enableReservations: true,
    enableLoyaltyProgram: true,
    enableSMSNotifications: true,
    enableEmailNotifications: true,
    enablePushNotifications: false,
  },
  limits: {
    maxRestaurantsPerUser: 10,
    maxDishesPerRestaurant: 500,
    maxCategoriesPerRestaurant: 50,
    maxTablesPerRestaurant: 100,
    maxImagesPerDish: 5,
    maxFileSizeMB: 10,
  },
};

export const defaultBillingSettings: IBillingSettings = {
  currency: 'EUR',
  taxRate: 20,
  taxName: 'TVA',
  invoicePrefix: 'INV',
  invoiceFooter: 'Merci pour votre confiance.',
  paymentMethods: {
    stripe: {
      enabled: false,
      publicKey: '',
      secretKey: '',
      webhookSecret: '',
    },
    paypal: {
      enabled: false,
      clientId: '',
      clientSecret: '',
      sandbox: true,
    },
    bankTransfer: {
      enabled: true,
      bankName: '',
      accountName: 'MenuQR SAS',
      accountNumber: '',
      iban: '',
      bic: '',
      instructions: 'Veuillez effectuer le virement dans les 7 jours.',
    },
  },
  autoRenewal: true,
  gracePeriodDays: 7,
  dunningEnabled: true,
  dunningSteps: [
    { daysBefore: 7, emailTemplate: 'payment_reminder_7days' },
    { daysBefore: 3, emailTemplate: 'payment_reminder_3days' },
    { daysBefore: 1, emailTemplate: 'payment_reminder_1day' },
    { daysBefore: 0, emailTemplate: 'payment_due_today' },
  ],
};

export const SystemConfig = mongoose.model<ISystemConfig>('SystemConfig', systemConfigSchema);
