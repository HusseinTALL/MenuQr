import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // MongoDB
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/menuqr',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // JWT Customer (can have different expiration)
  jwtCustomerExpiresIn: process.env.JWT_CUSTOMER_EXPIRES_IN || '30d',
  jwtCustomerRefreshExpiresIn: process.env.JWT_CUSTOMER_REFRESH_EXPIRES_IN || '90d',

  // CORS
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(origin => origin.trim()),

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // File Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
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
    orangeSenderId: process.env.ORANGE_SENDER_ID || 'tel:+22600000000', // Your Orange number
  },

  // OTP Configuration
  otp: {
    expiresInMinutes: parseInt(process.env.OTP_EXPIRES_MINUTES || '5', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
    resendCooldownSeconds: parseInt(process.env.OTP_RESEND_COOLDOWN || '60', 10),
  },
} as const;

export default config;
