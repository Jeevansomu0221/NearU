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

const RAJA_CLOUD_KITCHEN_ITEMS: MenuSeed[] = [
  { name: "Plain Dosa", description: "Crispy dosa with chutney and sambar", price: 79, category: "Breakfast", isVegetarian: true, preparationTime: 10, imageUrl: "https://images.unsplash.com/photo-1630383249896-424e482df921" },
  { name: "Masala Dosa", description: "Dosa stuffed with spiced potato masala", price: 99, category: "Breakfast", isVegetarian: true, preparationTime: 12, imageUrl: "https://images.unsplash.com/photo-1626500155537-93690a4f4937" },
  { name: "Idly (2 pcs)", description: "Soft steamed idly served hot", price: 59, category: "Breakfast", isVegetarian: true, preparationTime: 8, imageUrl: "https://images.unsplash.com/photo-1589302168068-964664d93dc0" },
  { name: "Ghee Podi Idly", description: "Mini idly tossed with ghee and podi", price: 89, category: "Breakfast", isVegetarian: true, preparationTime: 9, imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950" },
  { name: "Bread Omelette", description: "Street-style bread omelette with masala", price: 69, category: "Egg Specials", isVegetarian: false, preparationTime: 9, imageUrl: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543" },
  { name: "Egg Fry (2 Eggs)", description: "Pan-fried eggs with onion and chili", price: 79, category: "Egg Specials", isVegetarian: false, preparationTime: 8, imageUrl: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9" },
  { name: "Veg Fried Rice", description: "Classic Indo-Chinese veg fried rice", price: 119, category: "Rice", isVegetarian: true, preparationTime: 12, imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19" },
  { name: "Egg Fried Rice", description: "Fried rice with eggs and spring onion", price: 129, category: "Rice", isVegetarian: false, preparationTime: 13, imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b" },
  { name: "Chicken Fried Rice", description: "Smoky fried rice with juicy chicken", price: 159, category: "Rice", isVegetarian: false, preparationTime: 14, imageUrl: "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f" },
  { name: "Veg Biryani", description: "Aromatic dum biryani with mixed vegetables", price: 149, category: "Biryani", isVegetarian: true, preparationTime: 18, imageUrl: "https://images.unsplash.com/photo-1563379091339-03246963d51a" },
  { name: "Chicken Dum Biryani", description: "Spicy chicken dum biryani", price: 199, category: "Biryani", isVegetarian: false, preparationTime: 20, imageUrl: "https://images.unsplash.com/photo-1599043513900-ed6fe01d3833" },
  { name: "Jeera Rice", description: "Steamed jeera rice with ghee aroma", price: 99, category: "Rice", isVegetarian: true, preparationTime: 10, imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19" },
  { name: "Maggie Masala", description: "Classic masala maggie with veggies", price: 69, category: "Snacks", isVegetarian: true, preparationTime: 7, imageUrl: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841" },
  { name: "Paneer Butter Masala", description: "Creamy paneer curry with rich gravy", price: 179, category: "Curries", isVegetarian: true, preparationTime: 16, imageUrl: "https://images.unsplash.com/photo-1604908176997-4317c7eaeb9b" },
  { name: "Chicken Curry", description: "Homestyle spicy chicken curry", price: 189, category: "Curries", isVegetarian: false, preparationTime: 17, imageUrl: "https://images.unsplash.com/photo-1601050690117-8b3b8f567f1f" },
  { name: "Curd Rice", description: "Cooling curd rice tempered with mustard", price: 89, category: "Rice", isVegetarian: true, preparationTime: 8, imageUrl: "https://images.unsplash.com/photo-1596797038530-2c107aa1e2fd" }
];

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const upsertMenuForPartner = async (
  phone: string | null,
  restaurantName: string,
  items: MenuSeed[]
) => {
  let partner = phone ? await Partner.findOne({ phone }) : null;

  if (!partner) {
    partner = await Partner.findOne({
      restaurantName: { $regex: new RegExp(`^${escapeRegex(restaurantName)}$`, "i") }
    });
  }

  if (!partner) {
    console.log(`Partner not found for ${restaurantName} (${phone || "no-phone"})`);
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

  console.log(`Seeded ${items.length} menu items for ${restaurantName}`);
};

const run = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error("Missing MONGODB_URI / MONGO_URI in environment");
    }

    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB");

    await upsertMenuForPartner("9999900000", "Fastfood test", FASTFOOD_TEST_ITEMS);
    await upsertMenuForPartner("1010101010", "Test res1", TEST_RES1_ITEMS);
    await upsertMenuForPartner(process.env.RAJA_CLOUD_PHONE || null, "Raja cloud", RAJA_CLOUD_KITCHEN_ITEMS);

    console.log("Mock partner menu seeding complete");
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed mock partner menus:", error);
    process.exit(1);
  }
};

run();
