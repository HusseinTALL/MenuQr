import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://menuqr:menuqr123@localhost:27017/menuqr?authSource=menuqr';

async function createSuperAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }
    const usersCollection = db.collection('users');

    // Check if super admin already exists
    const existing = await usersCollection.findOne({ email: 'superadmin@menuqr.fr' });
    if (existing) {
      console.log('Super admin already exists!');
      console.log('Email: superadmin@menuqr.fr');
      await mongoose.disconnect();
      return;
    }

    // Hash password
    const password = 'SuperAdmin123!';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create super admin
    const result = await usersCollection.insertOne({
      email: 'superadmin@menuqr.fr',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'superadmin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('Super admin created successfully!');
    console.log('-----------------------------------');
    console.log('Email: superadmin@menuqr.fr');
    console.log('Password: SuperAdmin123!');
    console.log('-----------------------------------');
    console.log('Login URL: http://localhost:5173/super-admin/login');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createSuperAdmin();
