const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('../src/models/User.model');
const Partner = require('../src/models/Partner.model');
const MenuItem = require('../src/models/MenuItem.model');

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/nearu');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Partner.deleteMany({});
    await MenuItem.deleteMany({});
    console.log('Cleared existing data');

    // Create test users
    const users = await User.insertMany([
      {
        phone: '9876543210',
        name: 'Test Customer',
        role: 'customer'
      },
      {
        phone: '9876543211',
        name: 'Bakery Owner',
        role: 'partner'
      },
      {
        phone: '9876543212',
        name: 'Delivery Partner',
        role: 'delivery'
      },
      {
        phone: '9876543213',
        name: 'Admin User',
        role: 'admin'
      }
    ]);
    console.log('Created test users');

    // Create test partner
    const partner = await Partner.create({
      userId: users[1]._id,
      shopName: 'Fresh Bread Bakery',
      description: 'Freshly baked bread and pastries',
      category: 'bakery',
      address: '123 Main Street, City',
      location: {
        type: 'Point',
        coordinates: [77.5946, 12.9716] // Bangalore coordinates
      },
      phone: '9876543211',
      isActive: true,
      isOpen: true,
      openingTime: '07:00',
      closingTime: '21:00',
      deliveryRadius: 5
    });
    console.log('Created test partner');

    // Create menu items
    await MenuItem.insertMany([
      {
        partnerId: partner._id,
        name: 'Croissant',
        description: 'Fresh butter croissant',
        price: 60,
        category: 'snack',
        preparationTime: 5
      },
      {
        partnerId: partner._id,
        name: 'Chocolate Muffin',
        description: 'Chocolate chip muffin',
        price: 80,
        category: 'dessert',
        preparationTime: 5
      },
      {
        partnerId: partner._id,
        name: 'Garlic Bread',
        description: 'Fresh garlic bread',
        price: 120,
        category: 'main',
        preparationTime: 10
      }
    ]);
    console.log('Created menu items');

    console.log('\n✅ Database seeded successfully!');
    console.log('\nTest Users:');
    console.log('1. Customer - 9876543210');
    console.log('2. Partner - 9876543211');
    console.log('3. Delivery - 9876543212');
    console.log('4. Admin - 9876543213');

    process.exit(0);

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();