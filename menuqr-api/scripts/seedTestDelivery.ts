/**
 * Seed Test Delivery Script
 * Creates a test order and delivery for the test driver
 *
 * Run with: npx tsx scripts/seedTestDelivery.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Simplified schemas for seeding
const orderSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  orderNumber: String,
  status: { type: String, default: 'confirmed' },
  fulfillmentType: { type: String, default: 'delivery' },
  items: [{
    dishId: mongoose.Schema.Types.ObjectId,
    name: String,
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number,
  }],
  subtotal: Number,
  deliveryFee: Number,
  total: Number,
  deliveryAddress: {
    street: String,
    city: String,
    postalCode: String,
    country: String,
    instructions: String,
  },
  customerInfo: {
    name: String,
    phone: String,
    email: String,
  },
  paymentStatus: { type: String, default: 'paid' },
  paymentMethod: { type: String, default: 'card' },
}, { timestamps: true });

const deliverySchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryDriver' },
  deliveryNumber: String,
  status: { type: String, default: 'assigned' },
  priority: { type: String, default: 'normal' },
  pickupAddress: {
    street: String,
    city: String,
    postalCode: String,
    country: String,
    lat: Number,
    lng: Number,
  },
  deliveryAddress: {
    street: String,
    city: String,
    postalCode: String,
    country: String,
    lat: Number,
    lng: Number,
    instructions: String,
  },
  customer: {
    name: String,
    phone: String,
    email: String,
  },
  restaurant: {
    name: String,
    phone: String,
  },
  estimatedPickupTime: Date,
  estimatedDeliveryTime: Date,
  estimatedDuration: Number,
  distanceKm: Number,
  earnings: {
    baseFee: Number,
    distanceBonus: Number,
    tipAmount: Number,
    totalEarnings: Number,
    driverEarnings: Number,
    platformFee: Number,
    currency: String,
  },
  statusHistory: [{
    status: String,
    event: String,
    timestamp: Date,
    notes: String,
  }],
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
const Delivery = mongoose.model('Delivery', deliverySchema);

async function seedTestDelivery() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://menuqr:menuqr123@localhost:27017/menuqr?authSource=menuqr';

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Find the test driver
  const DeliveryDriver = mongoose.model('DeliveryDriver', new mongoose.Schema({}, { strict: false }));
  const driver = await DeliveryDriver.findOne({ email: 'livreur@menuqr.fr' });

  if (!driver) {
    console.error('❌ Test driver not found! Run seedTestDriver.ts first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Found test driver: ${(driver as any).firstName} ${(driver as any).lastName}`);

  // Find a restaurant (or create a minimal one)
  const Restaurant = mongoose.model('Restaurant', new mongoose.Schema({}, { strict: false }));
  let restaurant = await Restaurant.findOne({});

  if (!restaurant) {
    console.log('No restaurant found, creating a test one...');
    const RestaurantModel = mongoose.model('RestaurantCreate', new mongoose.Schema({
      name: String,
      slug: String,
      address: {
        street: String,
        city: String,
        postalCode: String,
        country: String,
      },
      phone: String,
      email: String,
      isActive: Boolean,
    }, { collection: 'restaurants', timestamps: true }));

    restaurant = await RestaurantModel.create({
      name: 'Restaurant Test',
      slug: 'restaurant-test',
      address: {
        street: '10 Rue de Rivoli',
        city: 'Paris',
        postalCode: '75001',
        country: 'France',
      },
      phone: '+33 1 42 36 00 00',
      email: 'contact@restaurant-test.fr',
      isActive: true,
    });
    console.log('Created test restaurant');
  }

  // Check if we already have a pending delivery for this driver
  const existingDelivery = await Delivery.findOne({
    driverId: driver._id,
    status: { $in: ['assigned', 'accepted', 'picked_up', 'in_transit'] },
  });

  if (existingDelivery) {
    console.log('\n⚠️  Test delivery already exists for this driver!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Delivery #: ${(existingDelivery as any).deliveryNumber}`);
    console.log(`   Status:     ${(existingDelivery as any).status}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Create a test order
  const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
  const order = await Order.create({
    restaurantId: restaurant._id,
    orderNumber,
    status: 'confirmed',
    fulfillmentType: 'delivery',
    items: [
      {
        dishId: new mongoose.Types.ObjectId(),
        name: 'Pizza Margherita',
        quantity: 2,
        unitPrice: 12.50,
        totalPrice: 25.00,
      },
      {
        dishId: new mongoose.Types.ObjectId(),
        name: 'Tiramisu',
        quantity: 1,
        unitPrice: 6.50,
        totalPrice: 6.50,
      },
      {
        dishId: new mongoose.Types.ObjectId(),
        name: 'Coca-Cola 33cl',
        quantity: 2,
        unitPrice: 3.00,
        totalPrice: 6.00,
      },
    ],
    subtotal: 37.50,
    deliveryFee: 3.50,
    total: 41.00,
    deliveryAddress: {
      street: '25 Avenue des Champs-Élysées',
      city: 'Paris',
      postalCode: '75008',
      country: 'France',
      instructions: 'Code porte: 4521, 3ème étage gauche',
    },
    customerInfo: {
      name: 'Marie Martin',
      phone: '+33 6 98 76 54 32',
      email: 'marie.martin@example.com',
    },
    paymentStatus: 'paid',
    paymentMethod: 'card',
  });

  console.log(`Created order: ${orderNumber}`);

  // Create delivery
  const deliveryNumber = `DEL-${Date.now().toString().slice(-6)}`;
  const now = new Date();
  const estimatedPickup = new Date(now.getTime() + 15 * 60 * 1000); // 15 min
  const estimatedDelivery = new Date(now.getTime() + 35 * 60 * 1000); // 35 min

  const delivery = await Delivery.create({
    orderId: order._id,
    restaurantId: restaurant._id,
    driverId: driver._id,
    deliveryNumber,
    status: 'assigned',
    priority: 'normal',
    pickupAddress: {
      street: (restaurant as any).address?.street || '10 Rue de Rivoli',
      city: (restaurant as any).address?.city || 'Paris',
      postalCode: (restaurant as any).address?.postalCode || '75001',
      country: 'France',
      coordinates: { lat: 48.8566, lng: 2.3522 },
    },
    deliveryAddress: {
      street: '25 Avenue des Champs-Élysées',
      city: 'Paris',
      postalCode: '75008',
      country: 'France',
      coordinates: { lat: 48.8698, lng: 2.3076 },
      instructions: 'Code porte: 4521, 3ème étage gauche',
    },
    customer: {
      name: 'Marie Martin',
      phone: '+33 6 98 76 54 32',
      email: 'marie.martin@example.com',
    },
    restaurant: {
      name: (restaurant as any).name || 'Restaurant Test',
      phone: (restaurant as any).phone || '+33 1 42 36 00 00',
    },
    estimatedPickupTime: estimatedPickup,
    estimatedDeliveryTime: estimatedDelivery,
    estimatedDuration: 20, // 20 minutes
    distanceKm: 3.2,
    earnings: {
      baseFee: 4.50,
      distanceBonus: 1.60,
      waitTimeBonus: 0,
      peakHourBonus: 0,
      tip: 2.00,
      adjustments: 0,
      total: 8.10,
      currency: 'EUR',
    },
    statusHistory: [{
      status: 'assigned',
      event: 'delivery_assigned',
      timestamp: now,
      notes: 'Livraison assignée au livreur',
    }],
  });

  // Update driver with current delivery
  await DeliveryDriver.findByIdAndUpdate(driver._id, {
    currentDeliveryId: delivery._id,
  });

  console.log('\n✅ Test delivery created successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Delivery #:    ${deliveryNumber}`);
  console.log(`   Order #:       ${orderNumber}`);
  console.log(`   Status:        assigned (waiting for driver to accept)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Restaurant:    ${(restaurant as any).name}`);
  console.log(`   Pickup:        ${(restaurant as any).address?.street || '10 Rue de Rivoli'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Customer:      Marie Martin`);
  console.log(`   Delivery to:   25 Avenue des Champs-Élysées, 75008 Paris`);
  console.log(`   Instructions:  Code porte: 4521, 3ème étage gauche`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Items:`);
  console.log(`     - 2x Pizza Margherita (25.00€)`);
  console.log(`     - 1x Tiramisu (6.50€)`);
  console.log(`     - 2x Coca-Cola 33cl (6.00€)`);
  console.log(`   Total:         41.00€`);
  console.log(`   Driver Earn:   6.48€`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📱 The driver should now see this delivery in their dashboard!');
  console.log('   Go to: http://localhost:5173/driver\n');

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

seedTestDelivery().catch((error) => {
  console.error('Error seeding test delivery:', error);
  process.exit(1);
});
