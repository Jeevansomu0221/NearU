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
    if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
      throw new Error('Refusing to run destructive seed. Set ALLOW_DESTRUCTIVE_SEED=true outside production.');
    }

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
        name: 'Ananya Customer',
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

    // Create test partner — Karachi Bakery, Hyderabad
    const partner = await Partner.create({
      ownerName: 'Bakery Owner',
      restaurantName: 'Karachi Bakery',
      userId: users[1]._id,
      shopName: 'Karachi Bakery',
      shopDescription: "Hyderabad's iconic bakery — Osmania biscuits, fruit biscuits and plum cake",
      category: 'bakery',
      address: {
        state: 'Telangana',
        city: 'Hyderabad',
        pincode: '500001',
        area: 'Nampally',
        colony: 'Moazzam Jahi Market',
        roadStreet: 'Mozamjahi Market Road',
        nearbyPlaces: ['Nampally Railway Station']
      },
      location: {
        type: 'Point',
        coordinates: [78.4656, 17.3850]
      },
      phone: '9876543211',
      isOpen: true,
      openingTime: '07:00',
      closingTime: '22:00',
      rating: 4.7,
      status: 'APPROVED'
    });
    console.log('✅ Created test partner');

    // Create menu items
    await MenuItem.insertMany([
      {
        partnerId: partner._id,
        name: 'Osmania Biscuit (250g)',
        description: 'Iconic Hyderabadi tea biscuit',
        price: 90,
        category: 'Biscuits',
        preparationTime: 5,
        isVegetarian: true,
        imageUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=900&q=80'
      },
      {
        partnerId: partner._id,
        name: 'Fruit Biscuit (250g)',
        description: 'Famous fruit biscuit with tutti-frutti',
        price: 100,
        category: 'Biscuits',
        preparationTime: 5,
        isVegetarian: true,
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80'
      },
      {
        partnerId: partner._id,
        name: 'Dilkhush',
        description: 'Sweet coconut-filled puff pastry',
        price: 35,
        category: 'Puffs',
        preparationTime: 6,
        isVegetarian: true,
        imageUrl: 'https://images.unsplash.com/photo-1625944525533-473f1bb3bc76?auto=format&fit=crop&w=900&q=80'
      },
      {
        partnerId: partner._id,
        name: 'Plum Cake (500g)',
        description: 'Rich fruit and nut cake',
        price: 280,
        category: 'Cakes',
        preparationTime: 5,
        isVegetarian: true,
        imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80'
      }
    ]);
    console.log('✅ Created menu items');

    // Create a test order
    const order = await Order.create({
      orderType: 'SHOP',
      customerId: users[0]._id,
      partnerId: partner._id,
      deliveryAddress: 'Flat 4B, Westend Colony, Bandlaguda Jagir, Hyderabad',
      note: 'Please deliver quickly',
      items: [
        {
          name: 'Osmania Biscuit (250g)',
          quantity: 2,
          price: 90
        },
        {
          name: 'Dilkhush',
          quantity: 3,
          price: 35
        }
      ],
      itemTotal: 285,
      deliveryFee: 30,
      grandTotal: 315,
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
    console.log('\n🏪 Test Shop: Karachi Bakery (Bakery)');
    console.log('\n📍 Location: Nampally, Hyderabad');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
