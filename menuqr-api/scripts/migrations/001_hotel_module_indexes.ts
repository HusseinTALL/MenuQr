/**
 * Migration: Hotel Module Database Setup
 *
 * This migration creates indexes and initial configuration for the Hotels Module.
 * Run with: npx tsx scripts/migrations/001_hotel_module_indexes.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/menuqr';

interface MigrationResult {
  success: boolean;
  message: string;
  details?: string[];
}

async function createIndexes(): Promise<MigrationResult> {
  const details: string[] = [];

  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Hotels collection indexes
    console.log('Creating indexes for hotels collection...');
    await db.collection('hotels').createIndexes([
      { key: { slug: 1 }, unique: true, name: 'hotels_slug_unique' },
      { key: { ownerId: 1 }, name: 'hotels_ownerId' },
      { key: { isActive: 1 }, name: 'hotels_isActive' },
      { key: { createdAt: -1 }, name: 'hotels_createdAt_desc' },
    ]);
    details.push('✓ Hotels indexes created');

    // Rooms collection indexes
    console.log('Creating indexes for rooms collection...');
    await db.collection('rooms').createIndexes([
      { key: { hotelId: 1, roomNumber: 1 }, unique: true, name: 'rooms_hotel_number_unique' },
      { key: { hotelId: 1, floor: 1 }, name: 'rooms_hotel_floor' },
      { key: { hotelId: 1, status: 1 }, name: 'rooms_hotel_status' },
      { key: { hotelId: 1, building: 1 }, name: 'rooms_hotel_building' },
      { key: { qrCode: 1 }, unique: true, sparse: true, name: 'rooms_qrCode_unique' },
      { key: { isRoomServiceEnabled: 1 }, name: 'rooms_roomServiceEnabled' },
    ]);
    details.push('✓ Rooms indexes created');

    // Hotel Guests collection indexes
    console.log('Creating indexes for hotelguests collection...');
    await db.collection('hotelguests').createIndexes([
      { key: { hotelId: 1, roomId: 1, status: 1 }, name: 'guests_hotel_room_status' },
      { key: { hotelId: 1, status: 1, checkOutDate: 1 }, name: 'guests_hotel_status_checkout' },
      { key: { accessCode: 1 }, unique: true, sparse: true, name: 'guests_accessCode_unique' },
      { key: { hotelId: 1, email: 1 }, sparse: true, name: 'guests_hotel_email' },
      { key: { checkInDate: 1 }, name: 'guests_checkInDate' },
      { key: { checkOutDate: 1 }, name: 'guests_checkOutDate' },
    ]);
    details.push('✓ Hotel Guests indexes created');

    // Hotel Menus collection indexes
    console.log('Creating indexes for hotelmenus collection...');
    await db.collection('hotelmenus').createIndexes([
      { key: { hotelId: 1, slug: 1 }, unique: true, name: 'menus_hotel_slug_unique' },
      { key: { hotelId: 1, type: 1, isActive: 1 }, name: 'menus_hotel_type_active' },
      { key: { hotelId: 1, isDefault: 1 }, name: 'menus_hotel_default' },
      { key: { hotelId: 1, order: 1 }, name: 'menus_hotel_order' },
    ]);
    details.push('✓ Hotel Menus indexes created');

    // Hotel Categories collection indexes
    console.log('Creating indexes for hotelcategories collection...');
    await db.collection('hotelcategories').createIndexes([
      { key: { hotelId: 1, menuId: 1, slug: 1 }, unique: true, name: 'categories_hotel_menu_slug_unique' },
      { key: { menuId: 1, isActive: 1, order: 1 }, name: 'categories_menu_active_order' },
    ]);
    details.push('✓ Hotel Categories indexes created');

    // Hotel Dishes collection indexes
    console.log('Creating indexes for hoteldishes collection...');
    await db.collection('hoteldishes').createIndexes([
      { key: { hotelId: 1, menuId: 1, slug: 1 }, unique: true, name: 'dishes_hotel_menu_slug_unique' },
      { key: { categoryId: 1, isActive: 1, order: 1 }, name: 'dishes_category_active_order' },
      { key: { hotelId: 1, isAvailable: 1 }, name: 'dishes_hotel_available' },
      { key: { hotelId: 1, isPopular: 1 }, name: 'dishes_hotel_popular' },
      { key: { 'name.fr': 'text', 'name.en': 'text', 'description.fr': 'text', 'description.en': 'text' }, name: 'dishes_text_search' },
    ]);
    details.push('✓ Hotel Dishes indexes created');

    // Hotel Orders collection indexes
    console.log('Creating indexes for hotelorders collection...');
    await db.collection('hotelorders').createIndexes([
      { key: { orderNumber: 1 }, unique: true, name: 'orders_orderNumber_unique' },
      { key: { hotelId: 1, createdAt: -1 }, name: 'orders_hotel_createdAt_desc' },
      { key: { hotelId: 1, status: 1 }, name: 'orders_hotel_status' },
      { key: { hotelId: 1, roomNumber: 1 }, name: 'orders_hotel_room' },
      { key: { hotelId: 1, floor: 1, status: 1 }, name: 'orders_hotel_floor_status' },
      { key: { hotelId: 1, guestId: 1 }, name: 'orders_hotel_guest' },
      { key: { 'assignedTo.staffId': 1, status: 1 }, name: 'orders_assignedStaff_status' },
      { key: { status: 1, createdAt: 1 }, name: 'orders_status_createdAt' },
      { key: { hotelId: 1, status: 1, scheduledFor: 1 }, name: 'orders_hotel_scheduled' },
    ]);
    details.push('✓ Hotel Orders indexes created');

    return {
      success: true,
      message: 'All indexes created successfully',
      details,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create indexes: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details,
    };
  }
}

async function addHotelRolesToUsers(): Promise<MigrationResult> {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Add index for hotelId on users collection
    await db.collection('users').createIndex(
      { hotelId: 1 },
      { sparse: true, name: 'users_hotelId' }
    );

    // Add compound index for hotel staff queries
    await db.collection('users').createIndex(
      { hotelId: 1, role: 1, isActive: 1 },
      { sparse: true, name: 'users_hotel_role_active' }
    );

    return {
      success: true,
      message: 'User collection updated for hotel roles',
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to update users: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function verifyCollections(): Promise<MigrationResult> {
  const details: string[] = [];

  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    const requiredCollections = [
      'hotels',
      'rooms',
      'hotelguests',
      'hotelmenus',
      'hotelcategories',
      'hoteldishes',
      'hotelorders',
    ];

    for (const col of requiredCollections) {
      if (collectionNames.includes(col)) {
        details.push(`✓ Collection '${col}' exists`);
      } else {
        details.push(`○ Collection '${col}' will be created on first document insert`);
      }
    }

    return {
      success: true,
      message: 'Collection verification complete',
      details,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to verify collections: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function runMigration() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     Hotel Module Database Migration                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Step 1: Verify collections
    console.log('Step 1: Verifying collections...');
    const verifyResult = await verifyCollections();
    console.log(verifyResult.message);
    verifyResult.details?.forEach(d => console.log(`  ${d}`));
    console.log('');

    // Step 2: Create indexes
    console.log('Step 2: Creating indexes...');
    const indexResult = await createIndexes();
    console.log(indexResult.message);
    indexResult.details?.forEach(d => console.log(`  ${d}`));
    if (!indexResult.success) {
      throw new Error(indexResult.message);
    }
    console.log('');

    // Step 3: Update users collection
    console.log('Step 3: Updating users collection for hotel roles...');
    const userResult = await addHotelRolesToUsers();
    console.log(userResult.message);
    if (!userResult.success) {
      throw new Error(userResult.message);
    }
    console.log('');

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║     Migration completed successfully!                    ║');
    console.log('╚══════════════════════════════════════════════════════════╝');

  } catch (error) {
    console.error('\n❌ Migration failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run migration
runMigration();
