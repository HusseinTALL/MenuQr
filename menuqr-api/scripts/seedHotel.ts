import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { Hotel } from '../src/models/Hotel.js';
import { Room } from '../src/models/Room.js';
import { HotelGuest } from '../src/models/HotelGuest.js';
import { HotelMenu } from '../src/models/HotelMenu.js';
import { HotelCategory } from '../src/models/HotelCategory.js';
import { HotelDish } from '../src/models/HotelDish.js';
import { HotelOrder } from '../src/models/HotelOrder.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/menuqr';

async function seedHotel() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if hotel already exists
    const existingHotel = await Hotel.findOne({ slug: 'grand-hotel-paris' });
    if (existingHotel) {
      console.log('Hotel already exists. Deleting and recreating...');

      // Delete all related data
      await Promise.all([
        User.deleteMany({ hotelId: existingHotel._id }),
        Room.deleteMany({ hotelId: existingHotel._id }),
        HotelGuest.deleteMany({ hotelId: existingHotel._id }),
        HotelMenu.deleteMany({ hotelId: existingHotel._id }),
        HotelCategory.deleteMany({ hotelId: existingHotel._id }),
        HotelDish.deleteMany({ hotelId: existingHotel._id }),
        HotelOrder.deleteMany({ hotelId: existingHotel._id }),
        existingHotel.deleteOne(),
      ]);

      // Also delete the owner if exists
      await User.deleteOne({ email: 'hotel@menuqr.fr' });
    }

    // ========== CREATE HOTEL OWNER ==========
    console.log('Creating hotel owner...');
    const owner = await User.create({
      email: 'hotel@menuqr.fr',
      password: 'Hotel123!',
      name: 'Jean-Pierre Hotelier',
      role: 'hotel_owner',
    });

    // ========== CREATE HOTEL ==========
    console.log('Creating hotel...');
    const hotel = await Hotel.create({
      name: 'Grand Hotel Paris',
      slug: 'grand-hotel-paris',
      description: {
        fr: 'Un hotel de luxe au coeur de Paris',
        en: 'A luxury hotel in the heart of Paris',
      },
      phone: '+33140000001',
      email: 'contact@grandhotelparis.fr',
      address: {
        street: '1 Place de la Concorde',
        city: 'Paris',
        postalCode: '75008',
        country: 'France',
        coordinates: {
          lat: 48.8656,
          lng: 2.3212,
        },
      },
      ownerId: owner._id,
      starRating: 5,
      totalRooms: 15,
      totalFloors: 5,
      settings: {
        defaultLanguage: 'fr',
        availableLanguages: ['fr', 'en', 'de', 'es'],
        currency: 'EUR',
        timezone: 'Europe/Paris',
        roomService: {
          enabled: true,
          minOrderAmount: 15,
          deliveryFee: 5,
          deliveryFeeType: 'fixed',
          serviceChargePercent: 10,
          taxPercent: 10,
          estimatedDeliveryMinutes: 30,
        },
        guestAuth: {
          requirePin: true,
          pinLength: 4,
          allowAccessCode: true,
          sessionDuration: 1440, // 24 hours
        },
        billing: {
          allowRoomCharge: true,
          allowCreditCard: true,
          allowCash: false,
        },
        notifications: {
          emailEnabled: false,
          smsEnabled: false,
          pushEnabled: false,
        },
      },
      isActive: true,
    });

    // Link owner to hotel
    owner.hotelId = hotel._id;
    await owner.save();

    // ========== CREATE HOTEL STAFF ==========
    console.log('Creating hotel staff...');
    const staffMembers = await User.create([
      {
        email: 'reception@grandhotelparis.fr',
        password: 'Staff123!',
        name: 'Marie Reception',
        role: 'reception',
        hotelId: hotel._id,
      },
      {
        email: 'roomservice@grandhotelparis.fr',
        password: 'Staff123!',
        name: 'Pierre Service',
        role: 'room_service',
        hotelId: hotel._id,
      },
      {
        email: 'kitchen@grandhotelparis.fr',
        password: 'Staff123!',
        name: 'Chef Antoine',
        role: 'hotel_kitchen',
        hotelId: hotel._id,
      },
      {
        email: 'concierge@grandhotelparis.fr',
        password: 'Staff123!',
        name: 'Jacques Concierge',
        role: 'concierge',
        hotelId: hotel._id,
      },
    ]);

    // ========== CREATE ROOMS ==========
    console.log('Creating rooms...');
    const roomTypes: Array<'standard' | 'superior' | 'deluxe' | 'suite' | 'penthouse'> =
      ['standard', 'superior', 'deluxe', 'suite', 'penthouse'];
    const rooms: Array<{
      hotelId: mongoose.Types.ObjectId;
      roomNumber: string;
      floor: number;
      type: 'standard' | 'superior' | 'deluxe' | 'suite' | 'penthouse';
      qrCode: string;
      maxOccupancy: number;
      amenities: string[];
      isActive: boolean;
      status: string;
    }> = [];

    for (let floor = 1; floor <= 5; floor++) {
      for (let roomNum = 1; roomNum <= 3; roomNum++) {
        const roomNumber = `${floor}0${roomNum}`;
        const typeIndex = floor <= 2 ? 0 : floor <= 4 ? floor - 2 : 4;
        rooms.push({
          hotelId: hotel._id,
          roomNumber,
          floor,
          type: roomTypes[typeIndex],
          qrCode: `room_${hotel._id}_${roomNumber}_${Date.now()}_${roomNum}`,
          maxOccupancy: roomTypes[typeIndex] === 'suite' ? 4 : roomTypes[typeIndex] === 'penthouse' ? 6 : 2,
          amenities: ['wifi', 'tv', 'minibar', 'safe'],
          isActive: true,
          status: 'vacant',
        });
      }
    }

    const createdRooms = await Room.create(rooms);
    console.log(`Created ${createdRooms.length} rooms`);

    // ========== CREATE ROOM SERVICE MENU ==========
    console.log('Creating room service menu...');
    const roomServiceMenu = await HotelMenu.create({
      hotelId: hotel._id,
      name: { fr: 'Room Service', en: 'Room Service' },
      slug: 'room-service',
      description: {
        fr: 'Service en chambre disponible 24h/24',
        en: '24/7 in-room dining service',
      },
      type: 'room_service',
      isAvailable24h: true,
      source: 'custom',
      isActive: true,
      order: 1,
    });

    // ========== CREATE BREAKFAST MENU ==========
    const breakfastMenu = await HotelMenu.create({
      hotelId: hotel._id,
      name: { fr: 'Petit-dejeuner', en: 'Breakfast' },
      slug: 'breakfast',
      description: {
        fr: 'Petit-dejeuner continental ou americain',
        en: 'Continental or American breakfast',
      },
      type: 'breakfast',
      availableFrom: '06:30',
      availableTo: '10:30',
      availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      source: 'custom',
      isActive: true,
      order: 2,
    });

    // ========== CREATE CATEGORIES ==========
    console.log('Creating menu categories...');

    // Room Service Categories
    const rsCategories = await HotelCategory.create([
      {
        hotelId: hotel._id,
        menuId: roomServiceMenu._id,
        name: { fr: 'Entrees', en: 'Starters' },
        slug: 'entrees',
        order: 1,
        isActive: true,
      },
      {
        hotelId: hotel._id,
        menuId: roomServiceMenu._id,
        name: { fr: 'Plats principaux', en: 'Main Courses' },
        slug: 'plats-principaux',
        order: 2,
        isActive: true,
      },
      {
        hotelId: hotel._id,
        menuId: roomServiceMenu._id,
        name: { fr: 'Desserts', en: 'Desserts' },
        slug: 'desserts',
        order: 3,
        isActive: true,
      },
      {
        hotelId: hotel._id,
        menuId: roomServiceMenu._id,
        name: { fr: 'Boissons', en: 'Beverages' },
        slug: 'boissons',
        order: 4,
        isActive: true,
      },
    ]);

    // Breakfast Categories
    const bfCategories = await HotelCategory.create([
      {
        hotelId: hotel._id,
        menuId: breakfastMenu._id,
        name: { fr: 'Continental', en: 'Continental' },
        slug: 'continental',
        order: 1,
        isActive: true,
      },
      {
        hotelId: hotel._id,
        menuId: breakfastMenu._id,
        name: { fr: 'Americain', en: 'American' },
        slug: 'american',
        order: 2,
        isActive: true,
      },
      {
        hotelId: hotel._id,
        menuId: breakfastMenu._id,
        name: { fr: 'Healthy', en: 'Healthy' },
        slug: 'healthy',
        order: 3,
        isActive: true,
      },
    ]);

    // ========== CREATE DISHES ==========
    console.log('Creating dishes...');

    // Room Service Starters
    await HotelDish.create([
      {
        hotelId: hotel._id,
        menuId: roomServiceMenu._id,
        categoryId: rsCategories[0]._id,
        name: { fr: 'Salade Cesar', en: 'Caesar Salad' },
        slug: 'salade-cesar',
        description: {
          fr: 'Laitue romaine, parmesan, croutons, sauce cesar maison',
          en: 'Romaine lettuce, parmesan, croutons, homemade caesar dressing',
        },
        price: 18,
        preparationTime: 10,
        isAvailable: true,
        isPopular: true,
        order: 1,
        options: [
          { name: { fr: 'Avec poulet grille', en: 'With grilled chicken' }, price: 6 },
          { name: { fr: 'Avec crevettes', en: 'With shrimp' }, price: 8 },
        ],
      },
      {
        hotelId: hotel._id,
        menuId: roomServiceMenu._id,
        categoryId: rsCategories[0]._id,
        name: { fr: 'Soupe du jour', en: 'Soup of the Day' },
        slug: 'soupe-du-jour',
        description: {
          fr: 'Demandez a notre chef la selection du jour',
          en: 'Ask our chef for today\'s selection',
        },
        price: 12,
        preparationTime: 5,
        isAvailable: true,
        order: 2,
      },
      {
        hotelId: hotel._id,
        menuId: roomServiceMenu._id,
        categoryId: rsCategories[0]._id,
        name: { fr: 'Plateau de fromages', en: 'Cheese Platter' },
        slug: 'plateau-fromages',
        description: {
          fr: 'Selection de fromages francais affines',
          en: 'Selection of aged French cheeses',
        },
        price: 22,
        preparationTime: 10,
        isAvailable: true,
        order: 3,
      },
    ]);

    // Room Service Main Courses
    await HotelDish.create([
      {
        hotelId: hotel._id,
        menuId: roomServiceMenu._id,
        categoryId: rsCategories[1]._id,
        name: { fr: 'Club Sandwich', en: 'Club Sandwich' },
        slug: 'club-sandwich',
        description: {
          fr: 'Poulet, bacon, oeuf, tomate, salade, frites maison',
          en: 'Chicken, bacon, egg, tomato, lettuce, homemade fries',
        },
        price: 24,
        preparationTime: 15,
        isAvailable: true,
        isPopular: true,
        isFeatured: true,
        order: 1,
      },
      {
        hotelId: hotel._id,
        menuId: roomServiceMenu._id,
        categoryId: rsCategories[1]._id,
        name: { fr: 'Filet de boeuf', en: 'Beef Tenderloin' },
        slug: 'filet-boeuf',
        description: {
          fr: 'Filet de boeuf grille, sauce au poivre, legumes de saison',
          en: 'Grilled beef tenderloin, pepper sauce, seasonal vegetables',
        },
        price: 42,
        preparationTime: 25,
        isAvailable: true,
        isPopular: true,
        order: 2,
        variants: [
          { name: { fr: 'Bleu', en: 'Blue rare' }, price: 42 },
          { name: { fr: 'Saignant', en: 'Rare' }, price: 42 },
          { name: { fr: 'A point', en: 'Medium' }, price: 42 },
          { name: { fr: 'Bien cuit', en: 'Well done' }, price: 42 },
        ],
      },
      {
        hotelId: hotel._id,
        menuId: roomServiceMenu._id,
        categoryId: rsCategories[1]._id,
        name: { fr: 'Risotto aux champignons', en: 'Mushroom Risotto' },
        slug: 'risotto-champignons',
        description: {
          fr: 'Risotto cremeux aux champignons sauvages et parmesan',
          en: 'Creamy risotto with wild mushrooms and parmesan',
        },
        price: 28,
        preparationTime: 20,
        isAvailable: true,
        isVegetarian: true,
        order: 3,
      },
      {
        hotelId: hotel._id,
        menuId: roomServiceMenu._id,
        categoryId: rsCategories[1]._id,
        name: { fr: 'Burger Grand Hotel', en: 'Grand Hotel Burger' },
        slug: 'burger-grand-hotel',
        description: {
          fr: 'Boeuf Angus, cheddar affine, bacon, oignons caramelises',
          en: 'Angus beef, aged cheddar, bacon, caramelized onions',
        },
        price: 28,
        preparationTime: 18,
        isAvailable: true,
        isPopular: true,
        order: 4,
      },
    ]);

    // Room Service Desserts
    await HotelDish.create([
      {
        hotelId: hotel._id,
        menuId: roomServiceMenu._id,
        categoryId: rsCategories[2]._id,
        name: { fr: 'Fondant au chocolat', en: 'Chocolate Fondant' },
        slug: 'fondant-chocolat',
        description: {
          fr: 'Fondant au chocolat noir, coeur coulant, glace vanille',
          en: 'Dark chocolate fondant, molten center, vanilla ice cream',
        },
        price: 14,
        preparationTime: 12,
        isAvailable: true,
        isPopular: true,
        order: 1,
      },
      {
        hotelId: hotel._id,
        menuId: roomServiceMenu._id,
        categoryId: rsCategories[2]._id,
        name: { fr: 'Creme brulee', en: 'Creme Brulee' },
        slug: 'creme-brulee',
        description: {
          fr: 'Creme brulee a la vanille de Madagascar',
          en: 'Madagascar vanilla creme brulee',
        },
        price: 12,
        preparationTime: 10,
        isAvailable: true,
        order: 2,
      },
      {
        hotelId: hotel._id,
        menuId: roomServiceMenu._id,
        categoryId: rsCategories[2]._id,
        name: { fr: 'Assiette de fruits frais', en: 'Fresh Fruit Platter' },
        slug: 'fruits-frais',
        description: {
          fr: 'Selection de fruits de saison',
          en: 'Selection of seasonal fruits',
        },
        price: 16,
        preparationTime: 5,
        isAvailable: true,
        isVegan: true,
        isGlutenFree: true,
        order: 3,
      },
    ]);

    // Room Service Beverages
    await HotelDish.create([
      {
        hotelId: hotel._id,
        menuId: roomServiceMenu._id,
        categoryId: rsCategories[3]._id,
        name: { fr: 'Cafe', en: 'Coffee' },
        slug: 'cafe',
        price: 6,
        preparationTime: 3,
        isAvailable: true,
        order: 1,
        variants: [
          { name: { fr: 'Espresso', en: 'Espresso' }, price: 6 },
          { name: { fr: 'Americano', en: 'Americano' }, price: 6 },
          { name: { fr: 'Cappuccino', en: 'Cappuccino' }, price: 7 },
          { name: { fr: 'Latte', en: 'Latte' }, price: 7 },
        ],
      },
      {
        hotelId: hotel._id,
        menuId: roomServiceMenu._id,
        categoryId: rsCategories[3]._id,
        name: { fr: 'The selection', en: 'Tea Selection' },
        slug: 'the',
        price: 6,
        preparationTime: 3,
        isAvailable: true,
        order: 2,
      },
      {
        hotelId: hotel._id,
        menuId: roomServiceMenu._id,
        categoryId: rsCategories[3]._id,
        name: { fr: 'Jus de fruits frais', en: 'Fresh Fruit Juice' },
        slug: 'jus-fruits',
        price: 8,
        preparationTime: 5,
        isAvailable: true,
        isVegan: true,
        isGlutenFree: true,
        order: 3,
        variants: [
          { name: { fr: 'Orange', en: 'Orange' }, price: 8 },
          { name: { fr: 'Pamplemousse', en: 'Grapefruit' }, price: 8 },
          { name: { fr: 'Pomme', en: 'Apple' }, price: 8 },
        ],
      },
      {
        hotelId: hotel._id,
        menuId: roomServiceMenu._id,
        categoryId: rsCategories[3]._id,
        name: { fr: 'Champagne', en: 'Champagne' },
        slug: 'champagne',
        description: {
          fr: 'Champagne Brut, coupe ou bouteille',
          en: 'Brut Champagne, glass or bottle',
        },
        price: 18,
        preparationTime: 2,
        isAvailable: true,
        order: 4,
        variants: [
          { name: { fr: 'Coupe', en: 'Glass' }, price: 18 },
          { name: { fr: 'Bouteille', en: 'Bottle' }, price: 95 },
        ],
      },
    ]);

    // Breakfast dishes
    await HotelDish.create([
      // Continental
      {
        hotelId: hotel._id,
        menuId: breakfastMenu._id,
        categoryId: bfCategories[0]._id,
        name: { fr: 'Petit-dejeuner continental', en: 'Continental Breakfast' },
        slug: 'continental-breakfast',
        description: {
          fr: 'Croissant, pain au chocolat, baguette, confitures, beurre, cafe ou the',
          en: 'Croissant, chocolate pastry, baguette, jams, butter, coffee or tea',
        },
        price: 22,
        preparationTime: 10,
        isAvailable: true,
        isPopular: true,
        order: 1,
      },
      {
        hotelId: hotel._id,
        menuId: breakfastMenu._id,
        categoryId: bfCategories[0]._id,
        name: { fr: 'Panier de viennoiseries', en: 'Pastry Basket' },
        slug: 'viennoiseries',
        description: {
          fr: 'Selection de croissants et pains au chocolat',
          en: 'Selection of croissants and chocolate pastries',
        },
        price: 14,
        preparationTime: 5,
        isAvailable: true,
        order: 2,
      },
      // American
      {
        hotelId: hotel._id,
        menuId: breakfastMenu._id,
        categoryId: bfCategories[1]._id,
        name: { fr: 'Petit-dejeuner americain', en: 'American Breakfast' },
        slug: 'american-breakfast',
        description: {
          fr: 'Oeufs, bacon, saucisses, haricots, toast, cafe',
          en: 'Eggs, bacon, sausages, beans, toast, coffee',
        },
        price: 28,
        preparationTime: 15,
        isAvailable: true,
        isPopular: true,
        order: 1,
        options: [
          { name: { fr: 'Oeufs brouilles', en: 'Scrambled eggs' }, price: 0, isDefault: true },
          { name: { fr: 'Oeufs au plat', en: 'Fried eggs' }, price: 0 },
          { name: { fr: 'Oeufs poches', en: 'Poached eggs' }, price: 0 },
        ],
      },
      {
        hotelId: hotel._id,
        menuId: breakfastMenu._id,
        categoryId: bfCategories[1]._id,
        name: { fr: 'Pancakes', en: 'Pancakes' },
        slug: 'pancakes',
        description: {
          fr: 'Pancakes moelleux, sirop d\'erable, fruits frais',
          en: 'Fluffy pancakes, maple syrup, fresh fruits',
        },
        price: 16,
        preparationTime: 12,
        isAvailable: true,
        order: 2,
      },
      // Healthy
      {
        hotelId: hotel._id,
        menuId: breakfastMenu._id,
        categoryId: bfCategories[2]._id,
        name: { fr: 'Acai Bowl', en: 'Acai Bowl' },
        slug: 'acai-bowl',
        description: {
          fr: 'Acai, granola, fruits frais, miel',
          en: 'Acai, granola, fresh fruits, honey',
        },
        price: 18,
        preparationTime: 8,
        isAvailable: true,
        isVegetarian: true,
        order: 1,
      },
      {
        hotelId: hotel._id,
        menuId: breakfastMenu._id,
        categoryId: bfCategories[2]._id,
        name: { fr: 'Avocat Toast', en: 'Avocado Toast' },
        slug: 'avocat-toast',
        description: {
          fr: 'Toast au levain, avocat ecrase, oeuf poche, graines',
          en: 'Sourdough toast, smashed avocado, poached egg, seeds',
        },
        price: 16,
        preparationTime: 10,
        isAvailable: true,
        isVegetarian: true,
        isFeatured: true,
        order: 2,
      },
    ]);

    // ========== CREATE TEST GUEST ==========
    console.log('Creating test guest...');
    const testRoom = createdRooms[0]; // Room 101

    // Note: The HotelGuest model has a pre-save hook that will hash these values
    const testGuest = await HotelGuest.create({
      hotelId: hotel._id,
      roomId: testRoom._id,
      roomNumber: testRoom.roomNumber,
      name: 'John Traveler',
      email: 'john.traveler@test.com',
      phone: '+33600000001',
      reservationNumber: 'RES-2024-001',
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      pin: '1234',           // Will be hashed by pre-save hook
      accessCode: '123456',  // Will be hashed by pre-save hook
      isVerified: true,
      language: 'en',
      dietaryPreferences: ['vegetarian'],
      deliveryPreferences: {
        leaveAtDoor: false,
        callBeforeDelivery: true,
        defaultTip: 10,
      },
      isActive: true,
    });

    // Update room status
    await Room.findByIdAndUpdate(testRoom._id, {
      status: 'occupied',
      currentGuestId: testGuest._id,
      lastCheckIn: new Date(),
    });

    // ========== CREATE TEST ORDER ==========
    console.log('Creating test order...');
    const clubSandwich = await HotelDish.findOne({
      hotelId: hotel._id,
      slug: 'club-sandwich',
    });
    const coffee = await HotelDish.findOne({
      hotelId: hotel._id,
      slug: 'cafe',
    });

    if (clubSandwich && coffee) {
      await HotelOrder.create({
        orderNumber: 'HO-2024-0001',
        hotelId: hotel._id,
        roomId: testRoom._id,
        roomNumber: testRoom.roomNumber,
        floor: testRoom.floor,
        guestId: testGuest._id,
        guestName: testGuest.name,
        menuType: 'room_service',
        menuId: roomServiceMenu._id,
        items: [
          {
            dishId: clubSandwich._id,
            name: clubSandwich.name,
            price: clubSandwich.price,
            quantity: 1,
            subtotal: clubSandwich.price,
          },
          {
            dishId: coffee._id,
            name: coffee.name,
            price: coffee.price,
            quantity: 2,
            variant: { name: 'Cappuccino', price: 7 },
            subtotal: 14,
          },
        ],
        subtotal: 38,
        serviceCharge: 3.8,
        deliveryFee: 5,
        tax: 4.18,
        tip: 5,
        total: 55.98,
        status: 'confirmed',
        paymentMethod: 'room_charge',
        paymentStatus: 'room_charge',
        callBeforeDelivery: true,
        leaveAtDoor: false,
      });
    }

    console.log('\n========================================');
    console.log('Hotel seed completed successfully!');
    console.log('========================================\n');
    console.log('Hotel Owner:');
    console.log('  Email: hotel@menuqr.fr');
    console.log('  Password: Hotel123!');
    console.log('\nStaff Accounts (password: Staff123!):');
    console.log('  - reception@grandhotelparis.fr (Reception)');
    console.log('  - roomservice@grandhotelparis.fr (Room Service)');
    console.log('  - kitchen@grandhotelparis.fr (Kitchen)');
    console.log('  - concierge@grandhotelparis.fr (Concierge)');
    console.log('\nTest Guest:');
    console.log('  Room: 101');
    console.log('  Access Code: 123456');
    console.log('  PIN: 1234');
    console.log('\nCreated:');
    console.log(`  - 1 Hotel`);
    console.log(`  - ${createdRooms.length} Rooms`);
    console.log(`  - 2 Menus`);
    console.log(`  - ${rsCategories.length + bfCategories.length} Categories`);
    console.log(`  - Multiple dishes`);
    console.log(`  - 1 Test Guest with order`);
    console.log('\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding hotel:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedHotel();
