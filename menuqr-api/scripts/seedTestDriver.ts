/**
 * Seed Test Driver Script
 * Creates a test driver account for development/testing
 *
 * Run with: npx tsx scripts/seedTestDriver.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Driver schema (inline to avoid import issues)
const driverDocumentSchema = new mongoose.Schema({
  url: String,
  verified: { type: Boolean, default: false },
  verifiedAt: Date,
  expiresAt: Date,
}, { _id: false });

const driverStatsSchema = new mongoose.Schema({
  totalDeliveries: { type: Number, default: 0 },
  completedDeliveries: { type: Number, default: 0 },
  cancelledDeliveries: { type: Number, default: 0 },
  completionRate: { type: Number, default: 100 },
  averageRating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  onTimeRate: { type: Number, default: 100 },
  averageDeliveryTime: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  totalTips: { type: Number, default: 0 },
}, { _id: false });

const deliveryDriverSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true, select: false },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  lastLoginAt: Date,
  restaurantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' }],
  phone: { type: String, required: true },
  profilePhoto: String,
  dateOfBirth: Date,
  address: {
    street: String,
    city: String,
    postalCode: String,
    country: { type: String, default: 'France' },
  },
  vehicleType: { type: String, enum: ['bicycle', 'scooter', 'motorcycle', 'car'], required: true },
  vehiclePlate: String,
  vehicleModel: String,
  vehicleColor: String,
  maxOrderCapacity: { type: Number, default: 3 },
  status: { type: String, enum: ['pending', 'verified', 'suspended', 'deactivated'], default: 'pending' },
  documents: {
    idCard: driverDocumentSchema,
    driverLicense: driverDocumentSchema,
    vehicleRegistration: driverDocumentSchema,
    insurance: driverDocumentSchema,
    proofOfAddress: driverDocumentSchema,
  },
  backgroundCheckStatus: { type: String, enum: ['pending', 'passed', 'failed', 'expired'], default: 'pending' },
  backgroundCheckDate: Date,
  verifiedAt: Date,
  shiftStatus: { type: String, enum: ['offline', 'online', 'on_break', 'on_delivery', 'returning'], default: 'offline' },
  isAvailable: { type: Boolean, default: false },
  currentLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
    updatedAt: Date,
    accuracy: Number,
    heading: Number,
    speed: Number,
  },
  currentDeliveryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery' },
  shiftStartedAt: Date,
  lastActivityAt: Date,
  stats: { type: driverStatsSchema, default: () => ({}) },
  currentBalance: { type: Number, default: 0 },
  lifetimeEarnings: { type: Number, default: 0 },
  preferredZones: [String],
  maxDeliveryRadius: { type: Number, default: 10 },
  acceptsContactlessDelivery: { type: Boolean, default: true },
  languagesSpoken: [{ type: String }],
  pushToken: String,
  notificationPreferences: {
    newOrders: { type: Boolean, default: true },
    orderUpdates: { type: Boolean, default: true },
    promotions: { type: Boolean, default: true },
    earnings: { type: Boolean, default: true },
  },
  notes: String,
}, { timestamps: true });

deliveryDriverSchema.index({ 'currentLocation': '2dsphere' });

const DeliveryDriver = mongoose.model('DeliveryDriver', deliveryDriverSchema);

async function seedTestDriver() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://menuqr:menuqr123@localhost:27017/menuqr?authSource=menuqr';

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Test driver credentials
  const testDriver = {
    email: 'livreur@menuqr.fr',
    password: 'Livreur123!',
    firstName: 'Jean',
    lastName: 'Dupont',
    phone: '+33 6 12 34 56 78',
    vehicleType: 'scooter' as const,
    vehiclePlate: 'AB-123-CD',
    vehicleModel: 'Honda PCX 125',
    vehicleColor: 'Noir',
  };

  // Check if driver already exists
  const existingDriver = await DeliveryDriver.findOne({ email: testDriver.email });

  if (existingDriver) {
    console.log('\n⚠️  Test driver already exists!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Email:    ${testDriver.email}`);
    console.log(`   Password: ${testDriver.password}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(testDriver.password, 12);

  // Create driver
  const driver = new DeliveryDriver({
    email: testDriver.email,
    passwordHash,
    firstName: testDriver.firstName,
    lastName: testDriver.lastName,
    phone: testDriver.phone,
    vehicleType: testDriver.vehicleType,
    vehiclePlate: testDriver.vehiclePlate,
    vehicleModel: testDriver.vehicleModel,
    vehicleColor: testDriver.vehicleColor,

    // Set as verified so they can use the app immediately
    status: 'verified',
    backgroundCheckStatus: 'passed',
    verifiedAt: new Date(),

    // Default location (Paris)
    currentLocation: {
      type: 'Point',
      coordinates: [2.3522, 48.8566], // Paris
      updatedAt: new Date(),
    },

    // Set initial stats for a more realistic test
    stats: {
      totalDeliveries: 47,
      completedDeliveries: 45,
      cancelledDeliveries: 2,
      completionRate: 95.74,
      averageRating: 4.7,
      totalRatings: 38,
      onTimeRate: 92,
      averageDeliveryTime: 22,
      totalEarnings: 847.50,
      totalTips: 63.20,
    },

    currentBalance: 125.30,
    lifetimeEarnings: 910.70,

    address: {
      street: '15 Rue de la Paix',
      city: 'Paris',
      postalCode: '75002',
      country: 'France',
    },

    preferredZones: ['75001', '75002', '75003', '75004', '75008', '75009'],
    maxDeliveryRadius: 15,
    languagesSpoken: ['fr', 'en'],
  });

  await driver.save();

  console.log('\n✅ Test driver created successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Email:    ${testDriver.email}`);
  console.log(`   Password: ${testDriver.password}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Name:     ${testDriver.firstName} ${testDriver.lastName}`);
  console.log(`   Vehicle:  ${testDriver.vehicleType} - ${testDriver.vehicleModel}`);
  console.log(`   Status:   verified`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📱 Login at: http://localhost:5173/driver/login\n');

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

seedTestDriver().catch((error) => {
  console.error('Error seeding test driver:', error);
  process.exit(1);
});
