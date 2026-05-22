import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import Partner from "../src/models/Partner.model";
import MenuItem from "../src/models/MenuItem.model";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

type MenuSeed = {
  name: string;
  description: string;
  price: number;
  category: string;
  isVegetarian: boolean;
  preparationTime: number;
  imageUrl: string;
};

const FASTFOOD_TEST_ITEMS: MenuSeed[] = [
  { name: "Classic Veg Burger", description: "Crispy veg patty, lettuce and mayo", price: 129, category: "Burgers", isVegetarian: true, preparationTime: 12, imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd" },
  { name: "Chicken Zinger Burger", description: "Crunchy chicken fillet with spicy sauce", price: 169, category: "Burgers", isVegetarian: false, preparationTime: 14, imageUrl: "https://images.unsplash.com/photo-1550317138-10000687a72b" },
  { name: "Paneer Wrap", description: "Grilled paneer with onions and mint dip", price: 149, category: "Wraps", isVegetarian: true, preparationTime: 10, imageUrl: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f" },
  { name: "Chicken Roll", description: "Juicy chicken strips in flaky roll", price: 159, category: "Wraps", isVegetarian: false, preparationTime: 11, imageUrl: "https://images.unsplash.com/photo-1565299507177-b0ac66763828" },
  { name: "Peri Peri Fries", description: "Crispy fries tossed with peri peri seasoning", price: 109, category: "Sides", isVegetarian: true, preparationTime: 8, imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877" },
  { name: "Loaded Cheese Fries", description: "Fries topped with cheese and jalapenos", price: 139, category: "Sides", isVegetarian: true, preparationTime: 9, imageUrl: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5" },
  { name: "Crispy Chicken Wings", description: "Hot and crunchy wings with dip", price: 199, category: "Snacks", isVegetarian: false, preparationTime: 16, imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445" },
  { name: "Veg Nuggets", description: "Golden fried veggie nuggets", price: 119, category: "Snacks", isVegetarian: true, preparationTime: 10, imageUrl: "https://images.unsplash.com/photo-1625938145744-36f3a4ca3f5f" },
  { name: "Cold Coffee", description: "Chilled creamy coffee", price: 99, category: "Beverages", isVegetarian: true, preparationTime: 5, imageUrl: "https://images.unsplash.com/photo-1517701604599-bb29b565090c" },
  { name: "Brownie Sundae", description: "Warm brownie with vanilla scoop", price: 149, category: "Desserts", isVegetarian: true, preparationTime: 7, imageUrl: "https://images.unsplash.com/photo-1564355808539-22fda35bed7e" }
];

const TEST_RES1_ITEMS: MenuSeed[] = [
  { name: "Butter Croissant", description: "Fresh flaky croissant", price: 69, category: "Bakery", isVegetarian: true, preparationTime: 6, imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff" },
  { name: "Chocolate Muffin", description: "Moist muffin with chocolate chips", price: 79, category: "Bakery", isVegetarian: true, preparationTime: 6, imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c" },
  { name: "Red Velvet Pastry", description: "Cream layered red velvet pastry", price: 109, category: "Cakes", isVegetarian: true, preparationTime: 7, imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587" },
  { name: "Black Forest Slice", description: "Chocolate sponge with cherries", price: 119, category: "Cakes", isVegetarian: true, preparationTime: 7, imageUrl: "https://images.unsplash.com/photo-1464306076886-da185f6a9d05" },
  { name: "Veg Puff", description: "Spiced potato filling in puff pastry", price: 49, category: "Snacks", isVegetarian: true, preparationTime: 5, imageUrl: "https://images.unsplash.com/photo-1625944525533-473f1bb3bc76" },
  { name: "Paneer Puff", description: "Paneer masala baked puff", price: 59, category: "Snacks", isVegetarian: true, preparationTime: 6, imageUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe" },
  { name: "Garlic Bread", description: "Toasted garlic bread with herbs", price: 89, category: "Sides", isVegetarian: true, preparationTime: 8, imageUrl: "https://images.unsplash.com/photo-1619531038896-b0e2eb7f7f4d" },
  { name: "Veg Sandwich", description: "Loaded grilled veggie sandwich", price: 99, category: "Sandwiches", isVegetarian: true, preparationTime: 10, imageUrl: "https://images.unsplash.com/photo-1528736235302-52922df5c122" },
  { name: "Cold Coffee", description: "Creamy cold coffee", price: 89, category: "Beverages", isVegetarian: true, preparationTime: 5, imageUrl: "https://images.unsplash.com/photo-1517701604599-bb29b565090c" },
  { name: "Blueberry Cheesecake Jar", description: "Creamy cheesecake in a jar", price: 129, category: "Desserts", isVegetarian: true, preparationTime: 8, imageUrl: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad" }
];

const upsertMenuForPartner = async (phone: string, restaurantName: string, items: MenuSeed[]) => {
  const partner = await Partner.findOne({ phone });
  if (!partner) {
    console.log(`⚠️ Partner not found for ${restaurantName} (${phone})`);
    return;
  }

  await MenuItem.deleteMany({ partnerId: partner._id });
  await MenuItem.insertMany(
    items.map((item) => ({
      partnerId: partner._id,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      isVegetarian: item.isVegetarian,
      preparationTime: item.preparationTime,
      imageUrl: item.imageUrl,
      isAvailable: true
    }))
  );

  partner.menuItemsCount = items.length;
  partner.hasCompletedSetup = true;
  await partner.save();

  console.log(`✅ Seeded ${items.length} menu items for ${restaurantName} (${phone})`);
};

const run = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error("Missing MONGODB_URI / MONGO_URI in environment");
    }

    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    await upsertMenuForPartner("9999900000", "Fastfood test", FASTFOOD_TEST_ITEMS);
    await upsertMenuForPartner("1010101010", "Test res1", TEST_RES1_ITEMS);

    console.log("🎉 Mock partner menu seeding complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to seed mock partner menus:", error);
    process.exit(1);
  }
};

run();
