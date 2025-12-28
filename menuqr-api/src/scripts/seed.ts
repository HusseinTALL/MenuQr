import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Restaurant } from '../models/Restaurant.js';
import { Category } from '../models/Category.js';
import { Dish } from '../models/Dish.js';
import { Table } from '../models/Table.js';
import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { Reservation } from '../models/Reservation.js';
import { Review } from '../models/Review.js';
import { LoyaltyTransaction } from '../models/LoyaltyTransaction.js';
import { Campaign } from '../models/Campaign.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/menuqr';

async function seed() {
  try {
    console.info('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.info('Connected to MongoDB');

    // Clear existing data
    console.info('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Restaurant.deleteMany({}),
      Category.deleteMany({}),
      Dish.deleteMany({}),
      Table.deleteMany({}),
      Customer.deleteMany({}),
      Order.deleteMany({}),
      Reservation.deleteMany({}),
      Review.deleteMany({}),
      LoyaltyTransaction.deleteMany({}),
      Campaign.deleteMany({}),
    ]);

    // Create admin user
    console.info('Creating admin user...');
    const user = await User.create({
      email: 'admin@menuqr.fr',
      password: 'admin123',
      name: 'Admin Garbadrome',
      role: 'owner',
    });

    // Create restaurant - Garbadrome Patte d'Oie
    console.info('Creating restaurant...');
    const restaurant = await new Restaurant({
      name: "Garbadrome Patte d'Oie",
      slug: 'garbadrome-patte-doie',
      description: 'Le meilleur garba de Ouagadougou ! Cuisine traditionnelle ivoirienne et burkinabe.',
      phone: '+22606336696',
      email: 'contact@garbadrome.bf',
      address: {
        street: "Avenue de la Liberte, Quartier Patte d'Oie",
        city: 'Ouagadougou',
        postalCode: '',
        country: 'Burkina Faso',
      },
      openingHours: [
        { day: 'monday', open: '07:00', close: '22:00', isClosed: false },
        { day: 'tuesday', open: '07:00', close: '22:00', isClosed: false },
        { day: 'wednesday', open: '07:00', close: '22:00', isClosed: false },
        { day: 'thursday', open: '07:00', close: '22:00', isClosed: false },
        { day: 'friday', open: '07:00', close: '23:00', isClosed: false },
        { day: 'saturday', open: '07:00', close: '23:00', isClosed: false },
        { day: 'sunday', open: '08:00', close: '21:00', isClosed: false },
      ],
      settings: {
        currency: 'XOF',
        timezone: 'Africa/Ouagadougou',
        defaultLanguage: 'fr',
        availableLanguages: ['fr', 'en'],
        orderNotifications: true,
        autoAcceptOrders: false,
        tablePrefix: 'Table',
        tableCount: 15,
      },
      ownerId: user._id,
      isActive: true,
    }).save();

    // Update user with restaurant ID
    user.restaurantId = restaurant._id;
    await user.save();

    // Create categories
    console.info('Creating categories...');
    const categories = await Category.create([
      {
        name: { fr: 'Garba', en: 'Garba' },
        description: { fr: 'Notre specialite maison ! Attieke frais accompagne de proteines grillees.', en: 'Our house specialty! Fresh attieke with grilled proteins.' },
        icon: '🍛',
        order: 1,
        restaurantId: restaurant._id,
        isActive: true,
      },
      {
        name: { fr: 'Plats Africains', en: 'African Dishes' },
        description: { fr: "Saveurs authentiques de l'Afrique de l'Ouest", en: 'Authentic flavors of West Africa' },
        icon: '🍲',
        order: 2,
        restaurantId: restaurant._id,
        isActive: true,
      },
      {
        name: { fr: 'Grillades', en: 'Grilled Meats' },
        description: { fr: 'Viandes et poissons braises a la perfection', en: 'Perfectly braised meats and fish' },
        icon: '🍖',
        order: 3,
        restaurantId: restaurant._id,
        isActive: true,
      },
      {
        name: { fr: 'Accompagnements', en: 'Side Dishes' },
        description: { fr: 'Pour completer votre repas', en: 'To complete your meal' },
        icon: '🍟',
        order: 4,
        restaurantId: restaurant._id,
        isActive: true,
      },
      {
        name: { fr: 'Entrees', en: 'Starters' },
        description: { fr: 'Pour bien commencer votre repas', en: 'To start your meal right' },
        icon: '🥗',
        order: 5,
        restaurantId: restaurant._id,
        isActive: true,
      },
      {
        name: { fr: 'Petit-dejeuner', en: 'Breakfast' },
        description: { fr: 'Servi de 7h a 11h', en: 'Served from 7am to 11am' },
        icon: '🍳',
        order: 6,
        restaurantId: restaurant._id,
        isActive: true,
      },
      {
        name: { fr: 'Boissons', en: 'Beverages' },
        description: { fr: 'Boissons fraiches et locales', en: 'Fresh and local drinks' },
        icon: '🥤',
        order: 7,
        restaurantId: restaurant._id,
        isActive: true,
      },
      {
        name: { fr: 'Desserts', en: 'Desserts' },
        description: { fr: 'Douceurs pour finir le repas', en: 'Sweet treats to end your meal' },
        icon: '🍨',
        order: 8,
        restaurantId: restaurant._id,
        isActive: true,
      },
    ]);

    const [garba, platsAfricains, grillades, accompagnements, entrees, petitDejeuner, boissons, desserts] = categories;

    // Create dishes
    console.info('Creating dishes...');
    await Dish.create([
      // ========== GARBA ==========
      {
        name: { fr: 'Garba Simple', en: 'Simple Garba' },
        description: { fr: 'Notre garba classique : attieke frais fait maison servi avec du thon frit croustillant, oignons eminces, tomates fraiches et piment frais. Un plat emblematique de la cuisine ivoirienne.', en: 'Our classic garba: fresh homemade attieke served with crispy fried tuna, sliced onions, fresh tomatoes and fresh pepper.' },
        price: 500,
        image: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=800',
        categoryId: garba!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: true,
        spicyLevel: 1,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 10,
        order: 1,
      },
      {
        name: { fr: 'Garba Poulet', en: 'Chicken Garba' },
        description: { fr: 'Attieke frais accompagne de morceaux de poulet grille aux epices africaines, oignons caramelises et piment. Servi avec sauce tomate maison.', en: 'Fresh attieke served with African spice-grilled chicken pieces, caramelized onions and pepper.' },
        price: 1000,
        image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
        categoryId: garba!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: true,
        spicyLevel: 1,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 15,
        order: 2,
      },
      {
        name: { fr: 'Garba Viande', en: 'Meat Garba' },
        description: { fr: 'Attieke genereux servi avec de la viande de boeuf braisee tendre et juteuse, marinee aux epices locales. Accompagne d\'oignons et de piment frais.', en: 'Generous attieke served with tender and juicy braised beef, marinated in local spices.' },
        price: 1500,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
        categoryId: garba!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: true,
        spicyLevel: 2,
        isAvailable: true,
        isPopular: false,
        isNewDish: true,
        preparationTime: 20,
        order: 3,
      },
      {
        name: { fr: 'Garba Mixte', en: 'Mixed Garba' },
        description: { fr: 'Le meilleur des deux mondes ! Attieke servi avec thon frit ET poulet grille, le tout accompagne de notre sauce pimentee maison.', en: 'The best of both worlds! Attieke served with fried tuna AND grilled chicken.' },
        price: 1200,
        image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800',
        categoryId: garba!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: true,
        spicyLevel: 1,
        isAvailable: true,
        isPopular: true,
        isNewDish: true,
        preparationTime: 15,
        order: 4,
      },

      // ========== PLATS AFRICAINS ==========
      {
        name: { fr: 'Riz Gras', en: 'Jollof Rice' },
        description: { fr: 'Riz cuit dans une sauce tomate riche et epicee, avec des legumes frais et des epices africaines. Servi avec votre choix de proteine.', en: 'Rice cooked in a rich and spicy tomato sauce, with fresh vegetables and African spices.' },
        price: 1500,
        image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800',
        categoryId: platsAfricains!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: true,
        spicyLevel: 1,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 25,
        order: 1,
      },
      {
        name: { fr: 'Riz Sauce Arachide', en: 'Rice with Peanut Sauce' },
        description: { fr: 'Riz blanc parfume accompagne de notre delicieuse sauce arachide cremeuse, preparee selon la recette traditionnelle burkinabe.', en: 'Fragrant white rice with our delicious creamy peanut sauce, prepared according to traditional Burkinabe recipe.' },
        price: 1200,
        image: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=800',
        categoryId: platsAfricains!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: false,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 20,
        order: 2,
      },
      {
        name: { fr: 'Riz Sauce Feuilles', en: 'Rice with Leaf Sauce' },
        description: { fr: 'Riz blanc servi avec une sauce aux feuilles de baobab ou d\'epinards, riche en nutriments et en saveurs. Un classique de la cuisine burkinabe.', en: 'White rice served with baobab leaf or spinach sauce, rich in nutrients and flavors.' },
        price: 1000,
        image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800',
        categoryId: platsAfricains!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 20,
        order: 3,
      },
      {
        name: { fr: 'To', en: 'To (Millet Porridge)' },
        description: { fr: 'Pate de mil ou de mais traditionnelle, servie avec sauce gombo ou sauce tomate. Le plat national du Burkina Faso !', en: 'Traditional millet or corn paste, served with okra sauce or tomato sauce. The national dish of Burkina Faso!' },
        price: 800,
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
        categoryId: platsAfricains!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 15,
        order: 4,
      },
      {
        name: { fr: "Ragout d'Igname", en: 'Yam Stew' },
        description: { fr: 'Igname bouillie servie dans une sauce tomate riche aux legumes et epices, garnie de viande ou poisson selon votre choix.', en: 'Boiled yam served in a rich tomato sauce with vegetables and spices.' },
        price: 1300,
        image: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800',
        categoryId: platsAfricains!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: true,
        spicyLevel: 1,
        isAvailable: true,
        isPopular: false,
        isNewDish: true,
        preparationTime: 25,
        order: 5,
      },
      {
        name: { fr: 'Sauce Gombo Complete', en: 'Full Okra Sauce' },
        description: { fr: 'Genereuse portion de sauce gombo onctueuse avec viande et poisson fume, servie avec riz blanc ou to au choix.', en: 'Generous portion of creamy okra sauce with meat and smoked fish.' },
        price: 1500,
        image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800',
        categoryId: platsAfricains!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 20,
        order: 6,
      },

      // ========== GRILLADES ==========
      {
        name: { fr: 'Poulet Braise', en: 'Braised Chicken' },
        description: { fr: 'Demi-poulet marine pendant 24h dans nos epices secretes, braise au charbon de bois jusqu\'a obtenir une peau doree et croustillante. Servi avec accompagnement au choix.', en: 'Half chicken marinated for 24h in our secret spices, charcoal-braised until golden and crispy skin.' },
        price: 2500,
        image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800',
        categoryId: grillades!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: true,
        spicyLevel: 2,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 25,
        order: 1,
      },
      {
        name: { fr: 'Poulet Entier Braise', en: 'Whole Braised Chicken' },
        description: { fr: 'Poulet entier braise, ideal pour partager en famille ou entre amis. Servi avec double portion d\'accompagnement et sauce pimentee.', en: 'Whole braised chicken, ideal for sharing with family or friends.' },
        price: 4500,
        image: 'https://images.unsplash.com/photo-1594221708779-94832f4320d1?w=800',
        categoryId: grillades!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: true,
        spicyLevel: 2,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 35,
        order: 2,
      },
      {
        name: { fr: 'Poisson Braise', en: 'Braised Fish' },
        description: { fr: 'Poisson capitaine entier braise au charbon de bois, servi avec sauce tomate epicee, oignons grilles et accompagnement de votre choix.', en: 'Whole captain fish charcoal-braised, served with spicy tomato sauce, grilled onions.' },
        price: 3000,
        image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
        categoryId: grillades!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: true,
        spicyLevel: 1,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 30,
        order: 3,
      },
      {
        name: { fr: 'Brochettes de Boeuf', en: 'Beef Skewers' },
        description: { fr: '5 brochettes de boeuf tendre marinees aux epices africaines et grillees a la braise. Servies avec sauce pimentee et oignons.', en: '5 tender beef skewers marinated in African spices and charcoal-grilled.' },
        price: 2000,
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
        categoryId: grillades!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: true,
        spicyLevel: 1,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 20,
        order: 4,
      },
      {
        name: { fr: 'Cotes de Porc Braisees', en: 'Braised Pork Ribs' },
        description: { fr: 'Cotes de porc juteuses marinees et braisees lentement au charbon. Un delice pour les amateurs de viande !', en: 'Juicy pork ribs marinated and slowly charcoal-braised.' },
        price: 2500,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
        categoryId: grillades!._id,
        restaurantId: restaurant._id,
        isVegetarian: false,
        isSpicy: true,
        spicyLevel: 1,
        isAvailable: true,
        isPopular: false,
        isNewDish: true,
        preparationTime: 30,
        order: 5,
      },

      // ========== ACCOMPAGNEMENTS ==========
      {
        name: { fr: 'Alloco', en: 'Fried Plantains' },
        description: { fr: 'Bananes plantain mures frites a la perfection, dorees et legerement caramelisees. Un incontournable de la cuisine ouest-africaine.', en: 'Perfectly fried ripe plantains, golden and slightly caramelized.' },
        price: 500,
        image: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?w=800',
        categoryId: accompagnements!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 10,
        order: 1,
      },
      {
        name: { fr: 'Frites Maison', en: 'Homemade Fries' },
        description: { fr: 'Frites de pommes de terre fraiches, coupees a la main et frites deux fois pour un resultat croustillant.', en: 'Fresh potato fries, hand-cut and twice-fried for a crispy result.' },
        price: 500,
        image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800',
        categoryId: accompagnements!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 15,
        order: 2,
      },
      {
        name: { fr: 'Attieke Nature', en: 'Plain Attieke' },
        description: { fr: 'Portion d\'attieke frais fait maison, la semoule de manioc traditionnelle ivoirienne. Ideal en accompagnement.', en: 'Portion of fresh homemade attieke, the traditional Ivorian cassava semolina.' },
        price: 300,
        image: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=800',
        categoryId: accompagnements!._id,
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
        name: { fr: 'Riz Blanc', en: 'White Rice' },
        description: { fr: 'Riz long grain parfume, cuit a la vapeur. L\'accompagnement classique pour vos sauces.', en: 'Fragrant long grain rice, steamed. The classic accompaniment for your sauces.' },
        price: 300,
        image: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=800',
        categoryId: accompagnements!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 5,
        order: 4,
      },
      {
        name: { fr: 'Salade Verte', en: 'Green Salad' },
        description: { fr: 'Salade fraiche de laitue, tomates, concombres et oignons avec vinaigrette maison.', en: 'Fresh salad with lettuce, tomatoes, cucumbers and onions with homemade dressing.' },
        price: 400,
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
        categoryId: accompagnements!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 5,
        order: 5,
      },

      // ========== ENTREES ==========
      {
        name: { fr: 'Kelewele', en: 'Kelewele' },
        description: { fr: 'Cubes de banane plantain epices et frits, assaisonnes de gingembre, piment et epices. Une specialite ghaneenne devenue populaire en Afrique de l\'Ouest.', en: 'Spiced and fried plantain cubes, seasoned with ginger, pepper and spices.' },
        price: 600,
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        categoryId: entrees!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: true,
        spicyLevel: 2,
        isAvailable: true,
        isPopular: true,
        isNewDish: true,
        preparationTime: 10,
        order: 1,
      },
      {
        name: { fr: 'Beignets de Haricots (Akara)', en: 'Bean Fritters (Akara)' },
        description: { fr: 'Beignets croustillants a base de haricots niebe, epices et frits. Servis avec sauce pimentee.', en: 'Crispy fritters made from black-eyed peas, spiced and fried.' },
        price: 400,
        image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
        categoryId: entrees!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: true,
        spicyLevel: 1,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 10,
        order: 2,
      },
      {
        name: { fr: "Salade d'Avocat", en: 'Avocado Salad' },
        description: { fr: 'Avocat frais en tranches sur lit de laitue, tomates cerises, oignons rouges et vinaigrette au citron.', en: 'Fresh sliced avocado on a bed of lettuce, cherry tomatoes, red onions and lemon dressing.' },
        price: 700,
        image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800',
        categoryId: entrees!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 8,
        order: 3,
      },

      // ========== PETIT-DEJEUNER ==========
      {
        name: { fr: 'Omelette Complete', en: 'Complete Omelette' },
        description: { fr: 'Omelette 3 oeufs avec tomates, oignons et piment, servie avec pain beurre et cafe ou the.', en: '3-egg omelette with tomatoes, onions and pepper, served with buttered bread and coffee or tea.' },
        price: 800,
        image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800',
        categoryId: petitDejeuner!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: true,
        spicyLevel: 1,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 15,
        order: 1,
      },
      {
        name: { fr: 'Bouillie de Mil', en: 'Millet Porridge' },
        description: { fr: 'Bouillie traditionnelle de mil sucree et parfumee, servie chaude. Un petit-dejeuner energisant a la burkinabe.', en: 'Traditional sweetened and flavored millet porridge, served hot.' },
        price: 400,
        image: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=800',
        categoryId: petitDejeuner!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 5,
        order: 2,
      },
      {
        name: { fr: 'Pain Beurre + Boisson', en: 'Buttered Bread + Drink' },
        description: { fr: 'Pain frais du matin avec beurre et confiture, accompagne de cafe, the ou chocolat chaud.', en: 'Fresh morning bread with butter and jam, accompanied by coffee, tea or hot chocolate.' },
        price: 500,
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800',
        categoryId: petitDejeuner!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 5,
        order: 3,
      },

      // ========== BOISSONS ==========
      {
        name: { fr: 'Bissap', en: 'Hibiscus Juice' },
        description: { fr: 'Jus d\'hibiscus frais fait maison, sucre juste comme il faut. Riche en vitamine C et rafraichissant.', en: 'Fresh homemade hibiscus juice, sweetened just right. Rich in vitamin C and refreshing.' },
        price: 300,
        image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800',
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
        name: { fr: 'Jus de Gingembre', en: 'Ginger Juice' },
        description: { fr: 'Jus de gingembre frais epice avec une touche de citron et de menthe. Revigorant et bon pour la digestion.', en: 'Fresh spicy ginger juice with a hint of lemon and mint.' },
        price: 300,
        image: 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=800',
        categoryId: boissons!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: true,
        spicyLevel: 1,
        isAvailable: true,
        isPopular: true,
        isNewDish: false,
        preparationTime: 2,
        order: 2,
      },
      {
        name: { fr: 'Jus de Tamarin', en: 'Tamarind Juice' },
        description: { fr: 'Jus de tamarin naturel a la saveur acidulee et sucree. Une boisson traditionnelle africaine desalterante.', en: 'Natural tamarind juice with a tangy and sweet flavor.' },
        price: 300,
        image: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=800',
        categoryId: boissons!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: true,
        preparationTime: 2,
        order: 3,
      },
      {
        name: { fr: 'Jus de Baobab (Bouye)', en: 'Baobab Juice (Bouye)' },
        description: { fr: 'Jus onctueux de fruit de baobab, riche en calcium et en antioxydants. Le super-aliment africain !', en: 'Creamy baobab fruit juice, rich in calcium and antioxidants.' },
        price: 350,
        image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
        categoryId: boissons!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: true,
        preparationTime: 2,
        order: 4,
      },
      {
        name: { fr: 'Coca-Cola', en: 'Coca-Cola' },
        description: { fr: 'Canette 33cl bien fraiche. Le classique international.', en: '33cl can, ice cold. The international classic.' },
        price: 500,
        image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800',
        categoryId: boissons!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 1,
        order: 5,
      },
      {
        name: { fr: 'Fanta Orange', en: 'Fanta Orange' },
        description: { fr: 'Canette 33cl fraiche et petillante.', en: '33cl can, fresh and sparkling.' },
        price: 500,
        image: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=800',
        categoryId: boissons!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 1,
        order: 6,
      },
      {
        name: { fr: 'Sprite', en: 'Sprite' },
        description: { fr: 'Canette 33cl citron-lime rafraichissante.', en: '33cl refreshing lemon-lime can.' },
        price: 500,
        image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=800',
        categoryId: boissons!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 1,
        order: 7,
      },
      {
        name: { fr: 'Eau Minerale', en: 'Mineral Water' },
        description: { fr: 'Bouteille 50cl d\'eau minerale fraiche.', en: '50cl bottle of fresh mineral water.' },
        price: 200,
        image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800',
        categoryId: boissons!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 1,
        order: 8,
      },
      {
        name: { fr: 'Eau Minerale 1.5L', en: 'Mineral Water 1.5L' },
        description: { fr: 'Grande bouteille 1.5L, ideale pour la table.', en: 'Large 1.5L bottle, ideal for the table.' },
        price: 400,
        image: 'https://images.unsplash.com/photo-1560023907-5f339617ea55?w=800',
        categoryId: boissons!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 1,
        order: 9,
      },
      {
        name: { fr: 'Cafe', en: 'Coffee' },
        description: { fr: 'Cafe noir ou cafe au lait, servi chaud.', en: 'Black coffee or coffee with milk, served hot.' },
        price: 300,
        image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800',
        categoryId: boissons!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 3,
        order: 10,
      },
      {
        name: { fr: 'The a la Menthe', en: 'Mint Tea' },
        description: { fr: 'The vert a la menthe fraiche, prepare a la traditionnelle. Servi bien sucre.', en: 'Green tea with fresh mint, traditionally prepared. Served well sweetened.' },
        price: 250,
        image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800',
        categoryId: boissons!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 5,
        order: 11,
      },

      // ========== DESSERTS ==========
      {
        name: { fr: 'Degue', en: 'Degue' },
        description: { fr: 'Yaourt cremeux melange avec du couscous de mil sucre et parfume a la vanille. Le dessert traditionnel par excellence.', en: 'Creamy yogurt mixed with sweetened millet couscous and flavored with vanilla.' },
        price: 500,
        image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800',
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
        name: { fr: 'Salade de Fruits Frais', en: 'Fresh Fruit Salad' },
        description: { fr: 'Assortiment de fruits frais de saison : mangue, papaye, ananas, banane. Servi avec un filet de miel.', en: 'Assortment of fresh seasonal fruits: mango, papaya, pineapple, banana.' },
        price: 600,
        image: 'https://images.unsplash.com/photo-1564093497595-593b96d80180?w=800',
        categoryId: desserts!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: false,
        preparationTime: 5,
        order: 2,
      },
      {
        name: { fr: 'Beignets de Banane', en: 'Banana Fritters' },
        description: { fr: 'Beignets de banane sucres et moelleux, saupoudres de sucre glace. Un delice pour les gourmands.', en: 'Sweet and fluffy banana fritters, dusted with powdered sugar.' },
        price: 400,
        image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
        categoryId: desserts!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: true,
        isNewDish: true,
        preparationTime: 10,
        order: 3,
      },
      {
        name: { fr: 'Glace Artisanale', en: 'Artisan Ice Cream' },
        description: { fr: '2 boules de glace artisanale au choix : vanille, chocolat, mangue ou bissap.', en: '2 scoops of artisan ice cream of your choice: vanilla, chocolate, mango or hibiscus.' },
        price: 500,
        image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=800',
        categoryId: desserts!._id,
        restaurantId: restaurant._id,
        isVegetarian: true,
        isSpicy: false,
        isAvailable: true,
        isPopular: false,
        isNewDish: true,
        preparationTime: 3,
        order: 4,
      },
    ]);

    // Get all dishes for orders and reviews
    const allDishes = await Dish.find({ restaurantId: restaurant._id });

    // ========== TABLES ==========
    console.info('Creating tables...');
    const tables = await Table.create([
      { name: 'Table 1', capacity: 2, minCapacity: 1, location: 'indoor', restaurantId: restaurant._id, isActive: true, order: 1 },
      { name: 'Table 2', capacity: 2, minCapacity: 1, location: 'indoor', restaurantId: restaurant._id, isActive: true, order: 2 },
      { name: 'Table 3', capacity: 4, minCapacity: 2, location: 'indoor', restaurantId: restaurant._id, isActive: true, order: 3 },
      { name: 'Table 4', capacity: 4, minCapacity: 2, location: 'indoor', restaurantId: restaurant._id, isActive: true, order: 4 },
      { name: 'Table 5', capacity: 6, minCapacity: 3, location: 'indoor', restaurantId: restaurant._id, isActive: true, order: 5 },
      { name: 'Table 6', capacity: 6, minCapacity: 3, location: 'terrace', restaurantId: restaurant._id, isActive: true, order: 6 },
      { name: 'Table 7', capacity: 8, minCapacity: 4, location: 'terrace', restaurantId: restaurant._id, isActive: true, order: 7 },
      { name: 'Table 8', capacity: 4, minCapacity: 2, location: 'outdoor', restaurantId: restaurant._id, isActive: true, order: 8 },
      { name: 'Table 9', capacity: 10, minCapacity: 6, location: 'private', restaurantId: restaurant._id, isActive: true, order: 9 },
      { name: 'Table 10', capacity: 4, minCapacity: 2, location: 'outdoor', restaurantId: restaurant._id, isActive: true, order: 10 },
    ]);

    // ========== CUSTOMERS ==========
    console.info('Creating customers...');
    const customerData = [
      { phone: '+22670000001', name: 'Aminata Ouedraogo', email: 'aminata@email.com', currentTier: 'platine' as const, totalPoints: 5000, lifetimePoints: 15000, totalOrders: 50, totalSpent: 150000 },
      { phone: '+22670000002', name: 'Ibrahim Sawadogo', email: 'ibrahim@email.com', currentTier: 'or' as const, totalPoints: 2500, lifetimePoints: 8000, totalOrders: 30, totalSpent: 90000 },
      { phone: '+22670000003', name: 'Fatou Traore', email: 'fatou@email.com', currentTier: 'or' as const, totalPoints: 1800, lifetimePoints: 6000, totalOrders: 25, totalSpent: 75000 },
      { phone: '+22670000004', name: 'Moussa Kabore', email: 'moussa@email.com', currentTier: 'argent' as const, totalPoints: 800, lifetimePoints: 3000, totalOrders: 15, totalSpent: 45000 },
      { phone: '+22670000005', name: 'Aissatou Diallo', email: 'aissatou@email.com', currentTier: 'argent' as const, totalPoints: 600, lifetimePoints: 2500, totalOrders: 12, totalSpent: 36000 },
      { phone: '+22670000006', name: 'Oumar Compaore', email: 'oumar@email.com', currentTier: 'argent' as const, totalPoints: 500, lifetimePoints: 2000, totalOrders: 10, totalSpent: 30000 },
      { phone: '+22670000007', name: 'Salimata Zongo', email: 'salimata@email.com', currentTier: 'bronze' as const, totalPoints: 300, lifetimePoints: 1000, totalOrders: 6, totalSpent: 18000 },
      { phone: '+22670000008', name: 'Adama Konate', email: 'adama@email.com', currentTier: 'bronze' as const, totalPoints: 200, lifetimePoints: 800, totalOrders: 5, totalSpent: 15000 },
      { phone: '+22670000009', name: 'Mariama Bamba', email: 'mariama@email.com', currentTier: 'bronze' as const, totalPoints: 150, lifetimePoints: 600, totalOrders: 4, totalSpent: 12000 },
      { phone: '+22670000010', name: 'Sekou Toure', email: 'sekou@email.com', currentTier: 'bronze' as const, totalPoints: 100, lifetimePoints: 400, totalOrders: 3, totalSpent: 9000 },
      { phone: '+22670000011', name: 'Kadiatou Sangare', email: 'kadiatou@email.com', currentTier: 'bronze' as const, totalPoints: 50, lifetimePoints: 200, totalOrders: 2, totalSpent: 6000 },
      { phone: '+22670000012', name: 'Youssouf Barry', email: 'youssouf@email.com', currentTier: 'bronze' as const, totalPoints: 30, lifetimePoints: 100, totalOrders: 1, totalSpent: 3000 },
      { phone: '+22670000013', name: 'Rokia Coulibaly', email: 'rokia@email.com', currentTier: 'bronze' as const, totalPoints: 0, lifetimePoints: 50, totalOrders: 1, totalSpent: 2500 },
      { phone: '+22670000014', name: 'Bakary Sidibe', email: 'bakary@email.com', currentTier: 'bronze' as const, totalPoints: 0, lifetimePoints: 0, totalOrders: 0, totalSpent: 0 },
      { phone: '+22670000015', name: 'Fatoumata Keita', email: 'fatoumata@email.com', currentTier: 'bronze' as const, totalPoints: 0, lifetimePoints: 0, totalOrders: 0, totalSpent: 0 },
    ];

    const customers = await Customer.create(
      customerData.map((c) => ({
        phone: c.phone,
        name: c.name,
        email: c.email,
        password: 'customer123', // Default password for test customers
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
    console.info('Creating orders...');
    const _orderStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'] as const;
    const statusDistribution = { pending: 5, confirmed: 5, preparing: 5, ready: 3, completed: 10, cancelled: 2 };
    const orders: any[] = [];

    let orderCount = 0;
    for (const [status, count] of Object.entries(statusDistribution)) {
      for (let i = 0; i < count; i++) {
        const customer = customers[Math.floor(Math.random() * 10)]; // Use active customers
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
          orderNumber: `${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${String(orderCount).padStart(4, '0')}`,
          restaurantId: restaurant._id,
          customerId: customer._id,
          tableNumber: status === 'pending' || status === 'confirmed' || status === 'preparing' ? `${Math.floor(Math.random() * 10) + 1}` : undefined,
          customerName: customer.name,
          customerPhone: customer.phone,
          items,
          subtotal,
          tax: 0,
          total: subtotal,
          status,
          paymentStatus: status === 'completed' ? 'paid' : status === 'cancelled' ? 'failed' : 'pending',
          createdAt: orderDate,
          updatedAt: orderDate,
          ...(status === 'confirmed' && { confirmedAt: orderDate }),
          ...(status === 'completed' && { completedAt: orderDate }),
          ...(status === 'cancelled' && { cancelledAt: orderDate, cancelReason: 'Client absent' }),
        });
      }
    }
    await Order.insertMany(orders);

    // ========== RESERVATIONS ==========
    console.info('Creating reservations...');
    const _reservationStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'] as const;
    const resDistribution = { pending: 3, confirmed: 4, completed: 3, cancelled: 1, no_show: 1 };
    const reservations: any[] = [];
    let resCount = 0;

    // Map table location to valid locationPreference
    const locationMap: Record<string, string> = {
      indoor: 'indoor',
      outdoor: 'outdoor',
      terrace: 'terrace',
      private: 'indoor', // Map private to indoor for reservations
    };

    for (const [status, count] of Object.entries(resDistribution)) {
      for (let i = 0; i < count; i++) {
        const customer = customers[Math.floor(Math.random() * 10)];
        const table = tables[Math.floor(Math.random() * tables.length)];
        const daysOffset = status === 'completed' || status === 'no_show' ? -Math.floor(Math.random() * 14) - 1 : Math.floor(Math.random() * 14) + 1;
        const resDate = new Date();
        resDate.setDate(resDate.getDate() + daysOffset);
        resDate.setHours(12 + Math.floor(Math.random() * 8), 0, 0, 0);

        resCount++;
        reservations.push({
          reservationNumber: `R${String(resCount).padStart(6, '0')}`,
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
          specialRequests: Math.random() > 0.7 ? 'Anniversaire - gateau surprise' : undefined,
          createdAt: new Date(resDate.getTime() - 3 * 24 * 60 * 60 * 1000),
        });
      }
    }
    await Reservation.insertMany(reservations);

    // ========== REVIEWS ==========
    console.info('Creating reviews...');
    const _reviewStatuses = ['approved', 'pending', 'flagged'] as const;
    const reviewDistribution = { approved: 15, pending: 3, flagged: 2 };
    const reviews: any[] = [];
    const reviewComments = [
      { rating: 5, title: 'Excellent!', comment: 'Le meilleur garba de Ouaga! Je recommande vivement.' },
      { rating: 5, title: 'Delicieux', comment: 'Poulet braise parfait, personnel tres accueillant.' },
      { rating: 4, title: 'Tres bon', comment: 'Bonne qualite, service rapide. Le bissap est delicieux.' },
      { rating: 4, title: 'Satisfait', comment: 'Plats copieux et savoureux. Bon rapport qualite-prix.' },
      { rating: 4, title: 'Je reviendrai', comment: 'Ambiance agreable et nourriture authentique.' },
      { rating: 3, title: 'Correct', comment: 'Pas mal mais un peu long pour le service.' },
      { rating: 3, title: 'Moyen', comment: 'Attente longue mais plats bons.' },
      { rating: 2, title: 'Decu', comment: 'Commande incomplete et service lent.' },
      { rating: 1, title: 'A eviter', comment: 'Tres mauvaise experience, plat froid.' },
    ];

    let reviewIndex = 0;
    for (const [status, count] of Object.entries(reviewDistribution)) {
      for (let i = 0; i < count; i++) {
        const customer = customers[Math.floor(Math.random() * 12)];
        const dish = allDishes[Math.floor(Math.random() * allDishes.length)];
        const reviewData = status === 'approved'
          ? reviewComments[reviewIndex % 7]
          : status === 'flagged'
            ? reviewComments[7 + (reviewIndex % 2)]
            : reviewComments[Math.floor(Math.random() * 5)];

        reviews.push({
          restaurantId: restaurant._id,
          dishId: dish._id,
          customerId: customer._id,
          rating: reviewData.rating,
          title: reviewData.title,
          comment: reviewData.comment,
          status,
          isVerifiedPurchase: Math.random() > 0.3,
          helpfulCount: Math.floor(Math.random() * 20),
          createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
          ...(status === 'approved' && Math.random() > 0.5 && {
            response: {
              content: 'Merci pour votre avis! Nous sommes ravis que vous ayez apprecie votre repas.',
              respondedAt: new Date(),
              respondedBy: user._id,
            },
          }),
        });
        reviewIndex++;
      }
    }
    await Review.insertMany(reviews);

    // ========== LOYALTY TRANSACTIONS ==========
    console.info('Creating loyalty transactions...');
    const loyaltyTransactions: any[] = [];

    for (const customer of customers.slice(0, 12)) {
      const numTransactions = Math.floor(Math.random() * 5) + 2;
      let balance = 0;

      for (let i = 0; i < numTransactions; i++) {
        const type = Math.random() > 0.2 ? 'earn' : 'redeem';
        const points = type === 'earn' ? Math.floor(Math.random() * 100) + 10 : Math.min(balance, Math.floor(Math.random() * 50) + 10);

        if (type === 'redeem' && balance < 10) {continue;}

        balance = type === 'earn' ? balance + points : balance - points;

        loyaltyTransactions.push({
          customerId: customer._id,
          restaurantId: restaurant._id,
          type,
          points,
          balance,
          description: type === 'earn' ? 'Points gagnes sur commande' : 'Echange de points',
          createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        });
      }
    }
    await LoyaltyTransaction.insertMany(loyaltyTransactions);

    // ========== CAMPAIGNS ==========
    console.info('Creating campaigns...');
    const campaignData = [
      {
        name: 'Promo Weekend',
        message: 'Ce weekend, -20% sur tous les grillades! Venez en famille au Garbadrome.',
        status: 'completed' as const,
        totalRecipients: 50, sent: 50, success: 48, failed: 2,
      },
      {
        name: 'Nouveau Menu',
        message: 'Decouvrez nos nouveaux plats! Ragout digname et cotes de porc braisees vous attendent.',
        status: 'completed' as const,
        totalRecipients: 80, sent: 80, success: 75, failed: 5,
      },
      {
        name: 'Fete Nationale',
        message: 'Bonne fete du 11 decembre! Menu special disponible au Garbadrome.',
        status: 'scheduled' as const,
        totalRecipients: 100, sent: 0, success: 0, failed: 0,
      },
      {
        name: 'Programme Fidelite',
        message: 'Vous avez des points a utiliser! Passez au Garbadrome avant fin du mois.',
        status: 'draft' as const,
        totalRecipients: 30, sent: 0, success: 0, failed: 0,
      },
      {
        name: 'Fermeture Exceptionnelle',
        message: 'Le Garbadrome sera ferme le 25 decembre. Joyeuses fetes!',
        status: 'cancelled' as const,
        totalRecipients: 100, sent: 0, success: 0, failed: 0,
      },
    ];

    await Campaign.create(
      campaignData.map((c) => ({
        restaurantId: restaurant._id,
        createdBy: user._id,
        name: c.name,
        message: c.message,
        status: c.status,
        scheduledAt: c.status === 'scheduled' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined,
        sentAt: c.status === 'completed' ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined,
        stats: {
          totalRecipients: c.totalRecipients,
          sent: c.sent,
          success: c.success,
          failed: c.failed,
        },
        recipients: customers.slice(0, c.totalRecipients > 15 ? 15 : c.totalRecipients).map((cust) => ({
          customerId: cust._id,
          phone: cust.phone,
          status: c.status === 'completed' ? (Math.random() > 0.1 ? 'sent' : 'failed') : 'pending',
          sentAt: c.status === 'completed' ? new Date() : undefined,
        })),
      }))
    );

    console.info('\n✅ Seed completed successfully!');
    console.info('\nCreated:');
    console.info('  - 1 Admin user (admin@menuqr.fr / admin123)');
    console.info("  - 1 Restaurant (Garbadrome Patte d'Oie)");
    console.info('  - 8 Categories');
    console.info('  - 45 Dishes');
    console.info('  - 10 Tables');
    console.info('  - 15 Customers');
    console.info('  - 30 Orders');
    console.info('  - 12 Reservations');
    console.info('  - 20 Reviews');
    console.info(`  - ${loyaltyTransactions.length} Loyalty Transactions`);
    console.info('  - 5 Campaigns');
    console.info('\nYou can now login at /admin/login with:');
    console.info('  Email: admin@menuqr.fr');
    console.info('  Password: admin123');
    console.info('\nPublic menu available at: /menu/slug/garbadrome-patte-doie');

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.info('\nDatabase connection closed');
  }
}

seed();
