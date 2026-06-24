const mongoose = require('mongoose');

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/nearu');
    console.log('✅ Connected to MongoDB');

    // Define simple schemas inline
    const userSchema = new mongoose.Schema({
      phone: { type: String, required: true, unique: true },
      name: { type: String, required: true },
      role: { type: String, enum: ['customer', 'partner', 'delivery', 'admin'], default: 'customer' },
      email: String,
      isActive: { type: Boolean, default: true },
      lastLogin: Date
    }, { timestamps: true });

    const partnerSchema = new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      shopName: { type: String, required: true },
      description: String,
      category: { type: String, enum: ['bakery', 'tiffin', 'fast-food', 'restaurant', 'grocery', 'other'], required: true },
      address: { type: String, required: true },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true }
      },
      phone: { type: String, required: true },
      isActive: { type: Boolean, default: false },
      isOpen: { type: Boolean, default: true },
      openingTime: { type: String, default: '09:00' },
      closingTime: { type: String, default: '22:00' },
      deliveryRadius: { type: Number, default: 5 },
      rating: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 }
    }, { timestamps: true });

    const menuItemSchema = new mongoose.Schema({
      partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
      name: { type: String, required: true },
      description: String,
      price: { type: Number, required: true, min: 0 },
      category: { type: String, enum: ['main', 'starter', 'dessert', 'beverage', 'snack'], default: 'main' },
      isAvailable: { type: Boolean, default: true },
      image: String,
      preparationTime: { type: Number, default: 15 },
      isVeg: { type: Boolean, default: true }
    }, { timestamps: true });

    const orderSchema = new mongoose.Schema({
      orderType: { type: String, enum: ['SHOP', 'CUSTOM'], required: true },
      customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
      deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      deliveryAddress: { type: String, required: true },
      note: String,
      items: [{
        name: String,
        quantity: Number,
        price: Number
      }],
      itemTotal: Number,
      deliveryFee: Number,
      grandTotal: Number,
      paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED'], default: 'PENDING' },
      status: {
        type: String,
        enum: ['CREATED', 'PRICED', 'CONFIRMED', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'],
        default: 'CREATED'
      }
    }, { timestamps: true });

    // Create models
    const User = mongoose.model('User', userSchema);
    const Partner = mongoose.model('Partner', partnerSchema);
    const MenuItem = mongoose.model('MenuItem', menuItemSchema);
    const Order = mongoose.model('Order', orderSchema);

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
    console.log('✅ Created 4 test users');

    // Create test partner — Karachi Bakery, Hyderabad
    const partner = await Partner.create({
      userId: users[1]._id,
      shopName: 'Karachi Bakery',
      description: "Hyderabad's iconic bakery — Osmania biscuits and plum cake",
      category: 'bakery',
      address: 'Mozamjahi Market Road, Nampally, Hyderabad',
      location: {
        type: 'Point',
        coordinates: [78.4656, 17.3850]
      },
      phone: '9876543211',
      isActive: true,
      isOpen: true,
      openingTime: '07:00',
      closingTime: '22:00',
      deliveryRadius: 5,
      rating: 4.7
    });
    console.log('✅ Created test partner shop');

    // Create menu items
    await MenuItem.insertMany([
      {
        partnerId: partner._id,
        name: 'Osmania Biscuit (250g)',
        description: 'Iconic Hyderabadi tea biscuit',
        price: 90,
        category: 'snack',
        preparationTime: 5,
        isVeg: true
      },
      {
        partnerId: partner._id,
        name: 'Fruit Biscuit (250g)',
        description: 'Famous fruit biscuit with tutti-frutti',
        price: 100,
        category: 'snack',
        preparationTime: 5,
        isVeg: true
      },
      {
        partnerId: partner._id,
        name: 'Dilkhush',
        description: 'Sweet coconut-filled puff pastry',
        price: 35,
        category: 'snack',
        preparationTime: 6,
        isVeg: true
      }
    ]);
    console.log('✅ Created 3 menu items');

    console.log('\n🎉 DATABASE SEEDED SUCCESSFULLY!');
    console.log('\n📱 TEST CREDENTIALS:');
    console.log('Customer: 9876543210 (any OTP)');
    console.log('Partner: 9876543211 (any OTP)');
    console.log('Delivery: 9876543212 (any OTP)');
    console.log('Admin: 9876543213 (any OTP)');
    console.log('\n🏪 Test Shop: Karachi Bakery');
    console.log('📍 Location: Nampally, Hyderabad');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Check if MongoDB is running first
console.log('🔍 Checking MongoDB connection...');
seedDatabase();
