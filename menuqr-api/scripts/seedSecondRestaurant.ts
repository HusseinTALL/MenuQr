import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { Restaurant } from '../src/models/Restaurant.js';
import { Category } from '../src/models/Category.js';
import { Dish } from '../src/models/Dish.js';
import { Table } from '../src/models/Table.js';
import { Customer } from '../src/models/Customer.js';
import { Order } from '../src/models/Order.js';
import { Reservation } from '../src/models/Reservation.js';
import { Review } from '../src/models/Review.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/menuqr';

async function seedSecondRestaurant() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if second restaurant already exists
    const existingRestaurant = await Restaurant.findOne({ slug: 'bistrot-parisien' });
    if (existingRestaurant) {
      console.log('Second restaurant already exists. Deleting and recreating...');

      // Delete all related data
      await Promise.all([
        User.deleteMany({ restaurantId: existingRestaurant._id }),
        Category.deleteMany({ restaurantId: existingRestaurant._id }),
        Dish.deleteMany({ restaurantId: existingRestaurant._id }),
        Table.deleteMany({ restaurantId: existingRestaurant._id }),
        Customer.deleteMany({ restaurantId: existingRestaurant._id }),
        Order.deleteMany({ restaurantId: existingRestaurant._id }),
        Reservation.deleteMany({ restaurantId: existingRestaurant._id }),
        Review.deleteMany({ restaurantId: existingRestaurant._id }),
        existingRestaurant.deleteOne(),
      ]);

      // Also delete the owner if exists
      await User.deleteOne({ email: 'owner2@menuqr.fr' });
    }

    // ========== CREATE OWNER ==========
    console.log('Creating owner user...');
    const owner = await User.create({
      email: 'owner2@menuqr.fr',
      password: 'Owner123!',
      name: 'Pierre Dupont',
      role: 'owner',
    });

    // ========== CREATE RESTAURANT ==========
    console.log('Creating restaurant...');
    const restaurant = await new Restaurant({
      name: 'Le Bistrot Parisien',
      slug: 'bistrot-parisien',
      description: 'Cuisine francaise traditionnelle au coeur de Paris. Produits frais et de saison.',
      phone: '+33142960001',
      email: 'contact@bistrot-parisien.fr',
      address: {
        street: '15 Rue de la Paix',
        city: 'Paris',
        postalCode: '75002',
        country: 'France',
      },
      openingHours: [
        { day: 'monday', open: '12:00', close: '14:30', isClosed: false },
        { day: 'tuesday', open: '12:00', close: '22:30', isClosed: false },
        { day: 'wednesday', open: '12:00', close: '22:30', isClosed: false },
        { day: 'thursday', open: '12:00', close: '22:30', isClosed: false },
        { day: 'friday', open: '12:00', close: '23:00', isClosed: false },
        { day: 'saturday', open: '12:00', close: '23:00', isClosed: false },
        { day: 'sunday', open: '12:00', close: '15:00', isClosed: false },
      ],
      settings: {
        currency: 'EUR',
        timezone: 'Europe/Paris',
        defaultLanguage: 'fr',
        availableLanguages: ['fr', 'en'],
        orderNotifications: true,
        autoAcceptOrders: false,
        tablePrefix: 'Table',
        tableCount: 12,
      },
      ownerId: owner._id,
      isActive: true,
    }).save();

    // Link owner to restaurant
    owner.restaurantId = restaurant._id;
    await owner.save();

    // ========== CREATE CATEGORIES ==========
    console.log('Creating categories...');
    const categories = await Category.create([
      {
        name: { fr: 'Entrees', en: 'Starters' },
        description: { fr: 'Pour commencer votre repas en beaute', en: 'To start your meal beautifully' },
        icon: '🥗',
        order: 1,
        restaurantId: restaurant._id,
        isActive: true,
      },
      {
        name: { fr: 'Plats Principaux', en: 'Main Courses' },
        description: { fr: 'Nos specialites de la cuisine francaise', en: 'Our French cuisine specialties' },
        icon: '🍽️',
        order: 2,
        restaurantId: restaurant._id,
        isActive: true,
      },
      {
        name: { fr: 'Fromages', en: 'Cheeses' },
        description: { fr: 'Selection de fromages affines', en: 'Selection of aged cheeses' },
        icon: '🧀',
        order: 3,
        restaurantId: restaurant._id,
        isActive: true,
      },
      {
        name: { fr: 'Desserts', en: 'Desserts' },
        description: { fr: 'Douceurs pour terminer en beaute', en: 'Sweet treats to end beautifully' },
        icon: '🍰',
        order: 4,
        restaurantId: restaurant._id,
        isActive: true,
      },
      {
        name: { fr: 'Vins', en: 'Wines' },
        description: { fr: 'Notre selection de vins francais', en: 'Our selection of French wines' },
        icon: '🍷',
        order: 5,
        restaurantId: restaurant._id,
        isActive: true,
      },
      {
        name: { fr: 'Boissons', en: 'Beverages' },
        description: { fr: 'Boissons et cafes', en: 'Drinks and coffees' },
        icon: '☕',
        order: 6,
        restaurantId: restaurant._id,
        isActive: true,
      },
    ]);

    const [entrees, plats, fromages, desserts, vins, boissons] = categories;

    // ========== CREATE DISHES ==========
    console.log('Creating dishes...');
    await Dish.create([
      // ========== ENTREES ==========
      {
        name: { fr: 'Soupe a l\'Oignon Gratinee', en: 'French Onion Soup' },
        description: { fr: 'Soupe traditionnelle aux oignons caramelises, gratinee au fromage et croûtons', en: 'Traditional caramelized onion soup, gratinated with cheese and croutons' },
        price: 12,
        image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
        categoryId: entrees!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 15,
        order: 1,
      },
      {
        name: { fr: 'Terrine de Campagne', en: 'Country Terrine' },
        description: { fr: 'Terrine maison de porc aux herbes, servie avec cornichons et pain grille', en: 'Homemade pork terrine with herbs, served with pickles and toasted bread' },
        price: 14,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
        categoryId: entrees!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 5,
        order: 2,
      },
      {
        name: { fr: 'Salade Nicoise', en: 'Nicoise Salad' },
        description: { fr: 'Thon, oeufs, olives, haricots verts, tomates et anchois sur lit de mesclun', en: 'Tuna, eggs, olives, green beans, tomatoes and anchovies on mixed greens' },
        price: 16,
        image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
        categoryId: entrees!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: false,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 10,
        order: 3,
      },
      {
        name: { fr: 'Escargots de Bourgogne', en: 'Burgundy Snails' },
        description: { fr: '6 escargots au beurre persille, servis brulants', en: '6 snails in parsley butter, served piping hot' },
        price: 18,
        image: 'https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=800',
        categoryId: entrees!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: true,
        preparationTime: 15,
        order: 4,
      },

      // ========== PLATS PRINCIPAUX ==========
      {
        name: { fr: 'Boeuf Bourguignon', en: 'Beef Bourguignon' },
        description: { fr: 'Boeuf mijoté au vin rouge de Bourgogne, lardons, champignons et petits oignons. Servi avec puree maison', en: 'Beef stewed in Burgundy red wine, bacon, mushrooms and pearl onions. Served with homemade mashed potatoes' },
        price: 28,
        image: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800',
        categoryId: plats!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: false,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 25,
        order: 1,
      },
      {
        name: { fr: 'Coq au Vin', en: 'Coq au Vin' },
        description: { fr: 'Poulet fermier braise au vin rouge, lardons et champignons de Paris', en: 'Free-range chicken braised in red wine with bacon and button mushrooms' },
        price: 26,
        image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800',
        categoryId: plats!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: false,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 25,
        order: 2,
      },
      {
        name: { fr: 'Steak Frites', en: 'Steak and Fries' },
        description: { fr: 'Entrecote de boeuf grillee, frites maison et sauce bearnaise', en: 'Grilled beef ribeye, homemade fries and bearnaise sauce' },
        price: 32,
        image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=800',
        categoryId: plats!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: false,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 20,
        order: 3,
      },
      {
        name: { fr: 'Confit de Canard', en: 'Duck Confit' },
        description: { fr: 'Cuisse de canard confite, pommes sarladaises et salade', en: 'Duck leg confit, Sarladaises potatoes and salad' },
        price: 29,
        image: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800',
        categoryId: plats!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 20,
        order: 4,
      },
      {
        name: { fr: 'Blanquette de Veau', en: 'Veal Blanquette' },
        description: { fr: 'Veau mijoté en sauce blanche cremeuse avec carottes et champignons', en: 'Veal stewed in creamy white sauce with carrots and mushrooms' },
        price: 27,
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        categoryId: plats!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: true,
        preparationTime: 25,
        order: 5,
      },
      {
        name: { fr: 'Sole Meuniere', en: 'Sole Meuniere' },
        description: { fr: 'Sole entiere poêlee au beurre noisette, citron et persil', en: 'Whole sole pan-fried in brown butter with lemon and parsley' },
        price: 35,
        image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
        categoryId: plats!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 20,
        order: 6,
      },

      // ========== FROMAGES ==========
      {
        name: { fr: 'Plateau de Fromages', en: 'Cheese Platter' },
        description: { fr: 'Selection de 5 fromages affines: Brie, Comte, Roquefort, Chevre, Reblochon', en: 'Selection of 5 aged cheeses: Brie, Comte, Roquefort, Goat cheese, Reblochon' },
        price: 16,
        image: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=800',
        categoryId: fromages!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 5,
        order: 1,
      },
      {
        name: { fr: 'Camembert Roti', en: 'Baked Camembert' },
        description: { fr: 'Camembert entier roti au four, servi avec pain de campagne grille', en: 'Whole baked Camembert, served with toasted country bread' },
        price: 14,
        image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=800',
        categoryId: fromages!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 15,
        order: 2,
      },

      // ========== DESSERTS ==========
      {
        name: { fr: 'Creme Brulee', en: 'Creme Brulee' },
        description: { fr: 'Creme vanillee sous caramel craquant, un classique indemodable', en: 'Vanilla cream under crunchy caramel, a timeless classic' },
        price: 10,
        image: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=800',
        categoryId: desserts!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 5,
        order: 1,
      },
      {
        name: { fr: 'Tarte Tatin', en: 'Tarte Tatin' },
        description: { fr: 'Tarte aux pommes caramelisees renversee, creme fraiche', en: 'Upside-down caramelized apple tart with fresh cream' },
        price: 11,
        image: 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?w=800',
        categoryId: desserts!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 10,
        order: 2,
      },
      {
        name: { fr: 'Mousse au Chocolat', en: 'Chocolate Mousse' },
        description: { fr: 'Mousse legere au chocolat noir 70%, chantilly maison', en: 'Light 70% dark chocolate mousse with homemade whipped cream' },
        price: 9,
        image: 'https://images.unsplash.com/photo-1511715282680-fbf93a50e721?w=800',
        categoryId: desserts!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 5,
        order: 3,
      },
      {
        name: { fr: 'Profiteroles', en: 'Profiteroles' },
        description: { fr: 'Choux garnis de glace vanille, sauce chocolat chaude', en: 'Choux pastry filled with vanilla ice cream, hot chocolate sauce' },
        price: 12,
        image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800',
        categoryId: desserts!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: true,
        preparationTime: 5,
        order: 4,
      },

      // ========== VINS ==========
      {
        name: { fr: 'Cotes du Rhone Rouge', en: 'Cotes du Rhone Red' },
        description: { fr: 'Vin rouge charnu et fruite, bouteille 75cl', en: 'Full-bodied and fruity red wine, 75cl bottle' },
        price: 28,
        image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800',
        categoryId: vins!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 2,
        order: 1,
      },
      {
        name: { fr: 'Chablis Blanc', en: 'White Chablis' },
        description: { fr: 'Vin blanc sec et mineral de Bourgogne, bouteille 75cl', en: 'Dry and mineral white wine from Burgundy, 75cl bottle' },
        price: 35,
        image: 'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=800',
        categoryId: vins!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 2,
        order: 2,
      },
      {
        name: { fr: 'Bordeaux Rouge Reserve', en: 'Bordeaux Red Reserve' },
        description: { fr: 'Grand vin de Bordeaux, tanins soyeux, bouteille 75cl', en: 'Fine Bordeaux wine, silky tannins, 75cl bottle' },
        price: 45,
        image: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800',
        categoryId: vins!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 2,
        order: 3,
      },

      // ========== BOISSONS ==========
      {
        name: { fr: 'Expresso', en: 'Espresso' },
        description: { fr: 'Cafe italien torrefie artisanalement', en: 'Artisanally roasted Italian coffee' },
        price: 3,
        image: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=800',
        categoryId: boissons!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 2,
        order: 1,
      },
      {
        name: { fr: 'Cafe Creme', en: 'Cafe Creme' },
        description: { fr: 'Expresso avec lait cremeux', en: 'Espresso with creamy milk' },
        price: 4.5,
        image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800',
        categoryId: boissons!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 3,
        order: 2,
      },
      {
        name: { fr: 'The Earl Grey', en: 'Earl Grey Tea' },
        description: { fr: 'The noir parfume a la bergamote', en: 'Black tea flavored with bergamot' },
        price: 4,
        image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800',
        categoryId: boissons!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 3,
        order: 3,
      },
      {
        name: { fr: 'Eau Minerale Evian', en: 'Evian Mineral Water' },
        description: { fr: 'Bouteille 50cl', en: '50cl bottle' },
        price: 4,
        image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800',
        categoryId: boissons!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 1,
        order: 4,
      },
    ]);

    // Get all dishes for orders
    const allDishes = await Dish.find({ restaurantId: restaurant._id });

    // ========== TABLES ==========
    console.log('Creating tables...');
    const tables = await Table.create([
      { name: 'Table 1', capacity: 2, minCapacity: 1, location: 'indoor', restaurantId: restaurant._id, isActive: true, order: 1 },
      { name: 'Table 2', capacity: 2, minCapacity: 1, location: 'indoor', restaurantId: restaurant._id, isActive: true, order: 2 },
      { name: 'Table 3', capacity: 4, minCapacity: 2, location: 'indoor', restaurantId: restaurant._id, isActive: true, order: 3 },
      { name: 'Table 4', capacity: 4, minCapacity: 2, location: 'indoor', restaurantId: restaurant._id, isActive: true, order: 4 },
      { name: 'Table 5', capacity: 6, minCapacity: 3, location: 'indoor', restaurantId: restaurant._id, isActive: true, order: 5 },
      { name: 'Table 6', capacity: 2, minCapacity: 1, location: 'terrace', restaurantId: restaurant._id, isActive: true, order: 6 },
      { name: 'Table 7', capacity: 4, minCapacity: 2, location: 'terrace', restaurantId: restaurant._id, isActive: true, order: 7 },
      { name: 'Table 8', capacity: 6, minCapacity: 3, location: 'terrace', restaurantId: restaurant._id, isActive: true, order: 8 },
    ]);

    // ========== CUSTOMERS ==========
    console.log('Creating customers...');
    const customerData = [
      { phone: '+33601000001', name: 'Marie Martin', email: 'marie.martin@email.fr', currentTier: 'or' as const, totalPoints: 2000, lifetimePoints: 5000, totalOrders: 20, totalSpent: 800 },
      { phone: '+33601000002', name: 'Jean Dubois', email: 'jean.dubois@email.fr', currentTier: 'argent' as const, totalPoints: 800, lifetimePoints: 2500, totalOrders: 12, totalSpent: 480 },
      { phone: '+33601000003', name: 'Sophie Bernard', email: 'sophie.bernard@email.fr', currentTier: 'argent' as const, totalPoints: 600, lifetimePoints: 1800, totalOrders: 8, totalSpent: 320 },
      { phone: '+33601000004', name: 'Nicolas Petit', email: 'nicolas.petit@email.fr', currentTier: 'bronze' as const, totalPoints: 200, lifetimePoints: 600, totalOrders: 4, totalSpent: 160 },
      { phone: '+33601000005', name: 'Isabelle Moreau', email: 'isabelle.moreau@email.fr', currentTier: 'bronze' as const, totalPoints: 100, lifetimePoints: 300, totalOrders: 2, totalSpent: 80 },
    ];

    const customers = await Customer.create(
      customerData.map((c) => ({
        phone: c.phone,
        name: c.name,
        email: c.email,
        password: 'Customer123!',
        restaurantId: restaurant._id,
        isPhoneVerified: true,
        isActive: true,
        totalOrders: c.totalOrders,
        totalSpent: c.totalSpent,
        lastOrderAt: c.totalOrders > 0 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined,
        loyalty: {
          totalPoints: c.totalPoints,
          lifetimePoints: c.lifetimePoints,
          currentTier: c.currentTier,
          tierUpdatedAt: new Date(),
        },
      }))
    );

    // ========== ORDERS ==========
    console.log('Creating orders...');
    const orderStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'] as const;
    const statusDistribution = { pending: 2, confirmed: 2, preparing: 1, ready: 1, completed: 3, cancelled: 1 };
    const orders: any[] = [];

    let orderCount = 0;
    for (const [status, count] of Object.entries(statusDistribution)) {
      for (let i = 0; i < count; i++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const numItems = Math.floor(Math.random() * 3) + 1;
        const selectedDishes = allDishes.sort(() => Math.random() - 0.5).slice(0, numItems);

        const items = selectedDishes.map((dish) => ({
          dishId: dish._id,
          name: dish.name.fr,
          price: dish.price,
          quantity: Math.floor(Math.random() * 2) + 1,
          subtotal: dish.price * (Math.floor(Math.random() * 2) + 1),
        }));

        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        const daysAgo = status === 'completed' ? Math.floor(Math.random() * 30) : Math.floor(Math.random() * 3);
        const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

        orderCount++;
        orders.push({
          orderNumber: `BP${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${String(orderCount).padStart(4, '0')}`,
          restaurantId: restaurant._id,
          customerId: customer._id,
          tableNumber: status === 'pending' || status === 'confirmed' || status === 'preparing' ? `${Math.floor(Math.random() * 8) + 1}` : undefined,
          customerName: customer.name,
          customerPhone: customer.phone,
          items,
          subtotal,
          tax: subtotal * 0.1,
          total: subtotal * 1.1,
          status,
          paymentStatus: status === 'completed' ? 'paid' : status === 'cancelled' ? 'failed' : 'pending',
          createdAt: orderDate,
          updatedAt: orderDate,
          ...(status === 'confirmed' && { confirmedAt: orderDate }),
          ...(status === 'completed' && { completedAt: orderDate }),
          ...(status === 'cancelled' && { cancelledAt: orderDate, cancelReason: 'Client annule' }),
        });
      }
    }
    await Order.insertMany(orders);

    // ========== RESERVATIONS ==========
    console.log('Creating reservations...');
    const locationMap: Record<string, string> = {
      indoor: 'indoor',
      outdoor: 'outdoor',
      terrace: 'terrace',
    };

    const reservations: any[] = [];
    const resDistribution = { pending: 1, confirmed: 1, completed: 1 };
    let resCount = 0;

    for (const [status, count] of Object.entries(resDistribution)) {
      for (let i = 0; i < count; i++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const table = tables[Math.floor(Math.random() * tables.length)];
        const daysOffset = status === 'completed' ? -Math.floor(Math.random() * 7) - 1 : Math.floor(Math.random() * 7) + 1;
        const resDate = new Date();
        resDate.setDate(resDate.getDate() + daysOffset);
        resDate.setHours(12 + Math.floor(Math.random() * 8), 0, 0, 0);

        resCount++;
        reservations.push({
          reservationNumber: `RBP${String(resCount).padStart(6, '0')}`,
          restaurantId: restaurant._id,
          customerId: customer._id,
          tableId: table._id,
          reservationDate: resDate,
          timeSlot: `${12 + Math.floor(Math.random() * 8)}:00`,
          partySize: Math.floor(Math.random() * (table.capacity - 1)) + 2,
          duration: 90,
          status,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email,
          locationPreference: locationMap[table.location] || 'no_preference',
          createdAt: new Date(resDate.getTime() - 3 * 24 * 60 * 60 * 1000),
        });
      }
    }
    await Reservation.insertMany(reservations);

    // ========== REVIEWS ==========
    console.log('Creating reviews...');
    const reviewComments = [
      { rating: 5, title: 'Exceptionnel!', comment: 'Le meilleur restaurant francais de Paris. Service impeccable.' },
      { rating: 5, title: 'Sublime', comment: 'Le boeuf bourguignon etait divin. Une vraie experience gastronomique.' },
      { rating: 4, title: 'Tres bien', comment: 'Cuisine raffinee et cadre agreable. Prix raisonnables pour la qualite.' },
      { rating: 4, title: 'Recommande', comment: 'Belle decouverte. La creme brulee est parfaite.' },
      { rating: 3, title: 'Correct', comment: 'Bon repas mais service un peu lent ce soir-la.' },
    ];

    const reviews: any[] = [];
    for (let i = 0; i < 5; i++) {
      const customer = customers[i % customers.length];
      const dish = allDishes[Math.floor(Math.random() * allDishes.length)];
      const reviewData = reviewComments[i];

      reviews.push({
        restaurantId: restaurant._id,
        dishId: dish._id,
        customerId: customer._id,
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
        status: 'approved',
        isVerifiedPurchase: true,
        helpfulCount: Math.floor(Math.random() * 10),
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        ...(Math.random() > 0.5 && {
          response: {
            content: 'Merci pour votre avis! Nous sommes ravis que vous ayez apprecie votre repas au Bistrot Parisien.',
            respondedAt: new Date(),
            respondedBy: owner._id,
          },
        }),
      });
    }
    await Review.insertMany(reviews);

    console.log('\n✅ Second restaurant seed completed successfully!');
    console.log('\nCreated:');
    console.log('  - 1 Owner (owner2@menuqr.fr / Owner123!)');
    console.log('  - 1 Restaurant (Le Bistrot Parisien)');
    console.log('  - 6 Categories');
    console.log(`  - ${allDishes.length} Dishes`);
    console.log('  - 8 Tables');
    console.log('  - 5 Customers');
    console.log(`  - ${orders.length} Orders`);
    console.log(`  - ${reservations.length} Reservations`);
    console.log(`  - ${reviews.length} Reviews`);
    console.log('\n📊 You now have 2 restaurants to test multi-tenant behavior:');
    console.log('  1. Garbadrome Patte d\'Oie (admin@menuqr.fr / admin123)');
    console.log('  2. Le Bistrot Parisien (owner2@menuqr.fr / Owner123!)');
    console.log('\nPublic menus:');
    console.log('  - /r/garbadrome-patte-doie');
    console.log('  - /r/bistrot-parisien');

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

seedSecondRestaurant();
