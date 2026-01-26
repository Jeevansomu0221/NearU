import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import models
import User from '../src/models/User.model';
import Partner from '../src/models/Partner.model';
import MenuItem from '../src/models/MenuItem.model';
import Order from '../src/models/Order.model';

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nearu';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Partner.deleteMany({});
    await MenuItem.deleteMany({});
    await Order.deleteMany({});
    console.log('✅ Cleared existing data');

    // Create test users
    const users = await User.insertMany([
      {
        phone: '9876543210',
        name: 'Test Customer',
        role: 'customer',
        email: 'customer@nearu.com'
      },
      {
        phone: '9876543211',
        name: 'Bakery Owner',
        role: 'partner',
        email: 'partner@nearu.com'
      },
      {
        phone: '9876543212',
        name: 'Delivery Partner',
        role: 'delivery',
        email: 'delivery@nearu.com'
      },
      {
        phone: '9876543213',
        name: 'Admin User',
        role: 'admin',
        email: 'admin@nearu.com'
      }
    ]);
    console.log('✅ Created test users');

    // Create test partner
    const partner = await Partner.create({
      userId: users[1]._id,
      shopName: 'Fresh Bread Bakery',
      description: 'Freshly baked bread and pastries daily',
      category: 'bakery',
      address: '123 Main Street, Bangalore',
      location: {
        type: 'Point',
        coordinates: [77.5946, 12.9716] // Bangalore coordinates
      },
      phone: '9876543211',
      isActive: true,
      isOpen: true,
      openingTime: '07:00',
      closingTime: '21:00',
      deliveryRadius: 5,
      rating: 4.5
    });
    console.log('✅ Created test partner');

    // Create menu items
    await MenuItem.insertMany([
      {
        partnerId: partner._id,
        name: 'Butter Croissant',
        description: 'Fresh butter croissant',
        price: 60,
        category: 'snack',
        preparationTime: 5,
        isVeg: true
      },
      {
        partnerId: partner._id,
        name: 'Chocolate Muffin',
        description: 'Chocolate chip muffin',
        price: 80,
        category: 'dessert',
        preparationTime: 5,
        isVeg: true
      },
      {
        partnerId: partner._id,
        name: 'Garlic Bread',
        description: 'Fresh garlic bread with herbs',
        price: 120,
        category: 'main',
        preparationTime: 10,
        isVeg: true
      },
      {
        partnerId: partner._id,
        name: 'Chicken Sandwich',
        description: 'Grilled chicken sandwich',
        price: 150,
        category: 'main',
        preparationTime: 15,
        isVeg: false
      }
    ]);
    console.log('✅ Created menu items');

    // Create a test order
    const order = await Order.create({
      orderType: 'SHOP',
      customerId: users[0]._id,
      partnerId: partner._id,
      deliveryAddress: '456 Another Street, Bangalore',
      note: 'Please deliver quickly',
      items: [
        {
          name: 'Butter Croissant',
          quantity: 2,
          price: 60
        },
        {
          name: 'Chocolate Muffin',
          quantity: 1,
          price: 80
        }
      ],
      itemTotal: 200,
      deliveryFee: 30,
      grandTotal: 230,
      status: 'DELIVERED',
      paymentStatus: 'PAID'
    });
    console.log('✅ Created test order');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📱 Test Users:');
    console.log('1. Customer - Phone: 9876543210, Password: (any OTP)');
    console.log('2. Partner - Phone: 9876543211, Password: (any OTP)');
    console.log('3. Delivery - Phone: 9876543212, Password: (any OTP)');
    console.log('4. Admin - Phone: 9876543213, Password: (any OTP)');
    console.log('\n🏪 Test Shop: Fresh Bread Bakery (Bakery)');
    console.log('\n📍 Location: Bangalore coordinates');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();