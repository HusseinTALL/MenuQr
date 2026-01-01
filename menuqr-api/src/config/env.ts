import dotenv from 'dotenv';

dotenv.config();

// ===========================================
// Environment Validation
// ===========================================

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Validate required environment variables
// JWT_SECRET is ALWAYS required (except in test mode) to prevent accidental use of weak defaults
const validateEnv = (): void => {
  // Skip validation in test mode
  if (isTest) {
    return;
  }

  // JWT_SECRET is required in ALL environments (dev, staging, production)
  // This prevents accidentally running with weak/predictable secrets
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is required.\n' +
      'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"\n' +
      'Then set: export JWT_SECRET=<your-secret>'
    );
  }

  const jwtSecret = process.env.JWT_SECRET;

  // Validate JWT_SECRET minimum length (32 chars = 256 bits minimum)
  if (jwtSecret.length < 32) {
    throw new Error(
      'FATAL: JWT_SECRET must be at least 32 characters.\n' +
      'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  }

  // Block known weak/placeholder values
  const weakPatterns = ['default', 'secret', 'change', 'password', '12345', 'your-', 'example'];
  const secretLower = jwtSecret.toLowerCase();
  for (const pattern of weakPatterns) {
    if (secretLower.includes(pattern)) {
      throw new Error(
        `FATAL: JWT_SECRET appears to contain a weak/placeholder value ('${pattern}').\n` +
        'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
      );
    }
  }

  // Production-specific validations
  if (isProduction) {
    // Stricter length requirement in production (64 chars = 512 bits)
    if (jwtSecret.length < 64) {
      throw new Error(
        'FATAL: JWT_SECRET must be at least 64 characters in production.\n' +
        'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
      );
    }

    // MONGODB_URI is required in production
    if (!process.env.MONGODB_URI) {
      throw new Error('FATAL: MONGODB_URI environment variable is required in production.');
    }
  }
};

// Run validation
validateEnv();

// ===========================================
// Configuration Export
// ===========================================

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction,
  isTest,

  // MongoDB
  mongodbUri: process.env.MONGODB_URI || 'mongodb://menuqr:menuqr123@localhost:27017/menuqr?authSource=menuqr',

  // Redis (for live GPS tracking and caching)
  redisUrl: process.env.REDIS_URL || '', // e.g., 'redis://localhost:6379'

  // JWT - REQUIRED in all environments (validated above, test mode uses fallback)
  jwtSecret: process.env.JWT_SECRET || (isTest ? 'test-only-jwt-secret-not-for-production' : ''),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m', // Reduced from 7d to 15m for security
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // Reduced from 30d to 7d

  // JWT Customer (can have different expiration)
  jwtCustomerExpiresIn: process.env.JWT_CUSTOMER_EXPIRES_IN || '1d', // Reduced from 30d
  jwtCustomerRefreshExpiresIn: process.env.JWT_CUSTOMER_REFRESH_EXPIRES_IN || '30d', // Reduced from 90d

  // CORS
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173,https://localhost:3000').split(',').map(origin => origin.trim()),

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 requests

  // File Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
  allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp').split(','),

  // SMS Configuration
  sms: {
    provider: process.env.SMS_PROVIDER || 'mock', // 'mock' | 'twilio' | 'orange'
    // Twilio
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioFromNumber: process.env.TWILIO_FROM_NUMBER || '',
    // Orange SMS API (OAuth2)
    orangeClientId: process.env.ORANGE_CLIENT_ID || '',
    orangeClientSecret: process.env.ORANGE_CLIENT_SECRET || '',
    orangeSenderId: process.env.ORANGE_SENDER_ID || 'tel:+22600000000',
  },

  // Twilio Voice (Masked Calling)
  twilioVoice: {
    enabled: !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_VOICE_NUMBER,
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    voiceNumber: process.env.TWILIO_VOICE_NUMBER || '', // Dedicated number for voice calls
    webhookBaseUrl: process.env.TWILIO_WEBHOOK_BASE_URL || '', // e.g., https://api.menuqr.fr
    callTimeout: parseInt(process.env.TWILIO_CALL_TIMEOUT || '30', 10), // seconds
    recordCalls: process.env.TWILIO_RECORD_CALLS === 'true',
  },

  // OTP Configuration
  otp: {
    expiresInMinutes: parseInt(process.env.OTP_EXPIRES_MINUTES || '5', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
    resendCooldownSeconds: parseInt(process.env.OTP_RESEND_COOLDOWN || '60', 10),
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '1800000', 10), // 30 minutes
    // Account lockout settings
    maxFailedLoginAttempts: parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5', 10),
    lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30', 10),
    // CAPTCHA threshold - require CAPTCHA after N failed login attempts
    captchaThreshold: parseInt(process.env.CAPTCHA_THRESHOLD || '3', 10),
    // Password expiration policy
    passwordExpiryDays: parseInt(process.env.PASSWORD_EXPIRY_DAYS || '90', 10),
    passwordExpiryWarningDays: parseInt(process.env.PASSWORD_EXPIRY_WARNING_DAYS || '14', 10),
    passwordExpiryEnabled: process.env.PASSWORD_EXPIRY_ENABLED !== 'false', // Enabled by default
  },

  // CAPTCHA
  captcha: {
    enabled: process.env.CAPTCHA_ENABLED === 'true',
    provider: process.env.CAPTCHA_PROVIDER || 'recaptcha', // 'recaptcha' | 'hcaptcha' | 'turnstile'
    siteKey: process.env.CAPTCHA_SITE_KEY || '',
    secretKey: process.env.CAPTCHA_SECRET_KEY || '',
  },

  // Email Configuration
  email: {
    provider: process.env.EMAIL_PROVIDER || 'mock', // 'mock' | 'smtp' | 'sendgrid' | 'mailgun'
    from: process.env.EMAIL_FROM || 'noreply@menuqr.fr',
    fromName: process.env.EMAIL_FROM_NAME || 'MenuQR',
    // SMTP settings
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    // SendGrid
    sendgridApiKey: process.env.SENDGRID_API_KEY || '',
    // Mailgun
    mailgunApiKey: process.env.MAILGUN_API_KEY || '',
    mailgunDomain: process.env.MAILGUN_DOMAIN || '',
    // Login notification settings
    loginNotification: {
      enabled: process.env.LOGIN_NOTIFICATION_ENABLED !== 'false', // Enabled by default
      notifyNewDevice: process.env.LOGIN_NOTIFY_NEW_DEVICE !== 'false',
      notifyNewIP: process.env.LOGIN_NOTIFY_NEW_IP !== 'false',
      notifyNewLocation: process.env.LOGIN_NOTIFY_NEW_LOCATION !== 'false',
    },
  },

  // Google Maps API
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    enabled: !!process.env.GOOGLE_MAPS_API_KEY,
  },

  // Stripe Connect (Driver Payouts)
  stripe: {
    enabled: !!process.env.STRIPE_SECRET_KEY,
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    // Connect settings
    connectEnabled: !!process.env.STRIPE_SECRET_KEY,
    platformFeePercent: parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT || '15'), // 15% platform fee
    minPayoutAmount: parseInt(process.env.STRIPE_MIN_PAYOUT_AMOUNT || '1000', 10), // 10 EUR minimum (in cents)
    payoutSchedule: process.env.STRIPE_PAYOUT_SCHEDULE || 'weekly', // 'daily' | 'weekly' | 'monthly'
    payoutDay: parseInt(process.env.STRIPE_PAYOUT_DAY || '1', 10), // Day of week (1=Monday) or month (1-28)
    currency: process.env.STRIPE_CURRENCY || 'eur',
    country: process.env.STRIPE_COUNTRY || 'FR',
  },

  // Sentry Error Tracking
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    enabled: process.env.SENTRY_ENABLED === 'true' || isProduction,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    format: process.env.LOG_FORMAT || (isProduction ? 'json' : 'pretty'),
  },
} as const;

export default config;
