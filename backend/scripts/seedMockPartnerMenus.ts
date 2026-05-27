import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import Partner from "../src/models/Partner.model";
import MenuItem from "../src/models/MenuItem.model";
import Order from "../src/models/Order.model";
import User from "../src/models/User.model";

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

type AddressSeed = {
  state: string;
  city: string;
  pincode: string;
  area: string;
  colony: string;
  roadStreet: string;
  nearbyPlaces: string[];
};

type MockOrderPlan = {
  status: "CONFIRMED" | "ACCEPTED" | "PREPARING" | "DELIVERED" | "CANCELLED";
  daysAgo: number;
  itemOffset: number;
  quantities: number[];
  paymentMethod: "RAZORPAY" | "CASH_ON_DELIVERY" | "UPI";
};

const MENU_IMAGE_URLS = {
  sweets: "https://images.unsplash.com/photo-1605197183305-6ce593f789ec",
  bakery: "https://images.unsplash.com/photo-1509440159596-0249088772ff",
  juice: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b",
  grocery: "https://images.unsplash.com/photo-1542838132-92c53300491e",
  iceCream: "https://images.unsplash.com/photo-1563805042-7684c019e1cb"
};

const image = (url: string) => `${url}?auto=format&fit=crop&w=900&q=80`;

const SWEETS_ITEM_IMAGES = [
  "https://images.unsplash.com/photo-1605197183305-6ce593f789ec",
  "https://images.unsplash.com/photo-1617692855027-33b14f061079",
  "https://images.unsplash.com/photo-1606313564200-e75d5e30476c",
  "https://images.unsplash.com/photo-1578985545062-69928b1d9587",
  "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e",
  "https://images.unsplash.com/photo-1587314168485-3236d6710814",
  "https://images.unsplash.com/photo-1488477181946-6428a0291777",
  "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af",
  "https://images.unsplash.com/photo-1551024506-0bccd828d307",
  "https://images.unsplash.com/photo-1464195244916-405fa0a82545",
  "https://images.unsplash.com/photo-1563805042-7684c019e1cb",
  "https://images.unsplash.com/photo-1599785209707-a456fc1337bb",
  "https://images.unsplash.com/photo-1514517604298-cf80e0fb7f1e",
  "https://images.unsplash.com/photo-1495147466023-ac5c588e2e94",
  "https://images.unsplash.com/photo-1506459225024-1428097a7e18"
].map(image);

const BAKERY_ITEM_IMAGES = [
  "https://images.unsplash.com/photo-1549931319-a545dcf3bc73",
  "https://images.unsplash.com/photo-1509440159596-0249088772ff",
  "https://images.unsplash.com/photo-1555507036-ab1f4038808a",
  "https://images.unsplash.com/photo-1625944525533-473f1bb3bc76",
  "https://images.unsplash.com/photo-1585937421612-70a008356fbe",
  "https://images.unsplash.com/photo-1604908176997-4317c7eaeb9b",
  "https://images.unsplash.com/photo-1606313564200-e75d5e30476c",
  "https://images.unsplash.com/photo-1519869325930-281384150729",
  "https://images.unsplash.com/photo-1578985545062-69928b1d9587",
  "https://images.unsplash.com/photo-1464306076886-da185f6a9d05",
  "https://images.unsplash.com/photo-1517433367423-c7e5b0f35086",
  "https://images.unsplash.com/photo-1499636136210-6f4ee915583e",
  "https://images.unsplash.com/photo-1558961363-fa8fdf82db35",
  "https://images.unsplash.com/photo-1523294587484-bae6cc870010",
  "https://images.unsplash.com/photo-1528736235302-52922df5c122"
].map(image);

const JUICE_ITEM_IMAGES = [
  "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b",
  "https://images.unsplash.com/photo-1600271886742-f049cd451bba",
  "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd",
  "https://images.unsplash.com/photo-1546173159-315724a31696",
  "https://images.unsplash.com/photo-1613478223719-2ab802602423",
  "https://images.unsplash.com/photo-1577805947697-89e18249d767",
  "https://images.unsplash.com/photo-1572490122747-3968b75cc699",
  "https://images.unsplash.com/photo-1553530666-ba11a7da3888",
  "https://images.unsplash.com/photo-1568901839119-631418a3910d",
  "https://images.unsplash.com/photo-1595981267035-7b04ca84a82d",
  "https://images.unsplash.com/photo-1505252585461-04db1eb84625",
  "https://images.unsplash.com/photo-1556679343-c7306c1976bc",
  "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd",
  "https://images.unsplash.com/photo-1523371054106-bbf80586c38c",
  "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea"
].map(image);

const GROCERY_ITEM_IMAGES = [
  "https://images.unsplash.com/photo-1586201375761-83865001e31c",
  "https://images.unsplash.com/photo-1612257999756-ffc50b9a038f",
  "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26",
  "https://images.unsplash.com/photo-1587049352846-4a222e784d38",
  "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b",
  "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5",
  "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c",
  "https://images.unsplash.com/photo-1615485500704-8e990f9900f7",
  "https://images.unsplash.com/photo-1596040033229-a9821ebd058d",
  "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d",
  "https://images.unsplash.com/photo-1563636619-e9143da7973b",
  "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e",
  "https://images.unsplash.com/photo-1566478989037-eec170784d0b",
  "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80",
  "https://images.unsplash.com/photo-1556228720-195a672e8a03"
].map(image);

const ICE_CREAM_ITEM_IMAGES = [
  "https://images.unsplash.com/photo-1563805042-7684c019e1cb",
  "https://images.unsplash.com/photo-1501443762994-82bd5dace89a",
  "https://images.unsplash.com/photo-1488900128323-21503983a07e",
  "https://images.unsplash.com/photo-1514849302-984523450cf4",
  "https://images.unsplash.com/photo-1526318472351-c75fcf070305",
  "https://images.unsplash.com/photo-1570197788417-0e82375c9371",
  "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57",
  "https://images.unsplash.com/photo-1556682851-c4580670113a",
  "https://images.unsplash.com/photo-1587563974670-b5181b459b30",
  "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f",
  "https://images.unsplash.com/photo-1551024601-bec78aea704b",
  "https://images.unsplash.com/photo-1534706936160-d5ee67737249",
  "https://images.unsplash.com/photo-1560008581-09826d1de69e",
  "https://images.unsplash.com/photo-1579954115545-a95591f28bfc",
  "https://images.unsplash.com/photo-1586195831800-24f14c992cea"
].map(image);

const RAJA_ITEM_IMAGES = [
  "https://images.unsplash.com/photo-1630383249896-424e482df921",
  "https://images.unsplash.com/photo-1626500155537-93690a4f4937",
  "https://images.unsplash.com/photo-1589302168068-964664d93dc0",
  "https://images.unsplash.com/photo-1601050690597-df0568f70950",
  "https://images.unsplash.com/photo-1482049016688-2d3e1b311543",
  "https://images.unsplash.com/photo-1498654896293-37aacf113fd9",
  "https://images.unsplash.com/photo-1512058564366-18510be2db19",
  "https://images.unsplash.com/photo-1603133872878-684f208fb84b",
  "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f",
  "https://images.unsplash.com/photo-1563379091339-03246963d51a",
  "https://images.unsplash.com/photo-1599043513900-ed6fe01d3833",
  "https://images.unsplash.com/photo-1596797038530-2c107aa1e2fd",
  "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841",
  "https://images.unsplash.com/photo-1604908176997-4317c7eaeb9b",
  "https://images.unsplash.com/photo-1601050690117-8b3b8f567f1f",
  "https://images.unsplash.com/photo-1546833999-b9f581a1996d"
].map(image);

const PARTNER_IMAGES: Record<string, { shopImageUrl: string; bannerImageUrl: string; restaurantPhotosUrls: string[] }> = {
  "Krishna sweets": {
    shopImageUrl: image("https://images.unsplash.com/photo-1605197183305-6ce593f789ec"),
    bannerImageUrl: image("https://images.unsplash.com/photo-1551024506-0bccd828d307"),
    restaurantPhotosUrls: [
      image("https://images.unsplash.com/photo-1488477181946-6428a0291777"),
      image("https://images.unsplash.com/photo-1514517604298-cf80e0fb7f1e"),
      image("https://images.unsplash.com/photo-1495147466023-ac5c588e2e94")
    ]
  },
  "Nandini Bakery": {
    shopImageUrl: image("https://images.unsplash.com/photo-1554118811-1e0d58224f24"),
    bannerImageUrl: image("https://images.unsplash.com/photo-1514933651103-005eec06c04b"),
    restaurantPhotosUrls: [
      image("https://images.unsplash.com/photo-1517433670267-08bbd4be890f"),
      image("https://images.unsplash.com/photo-1534432182912-63863115e106"),
      image("https://images.unsplash.com/photo-1555396273-367ea4eb4db5")
    ]
  },
  "Btech juices": {
    shopImageUrl: image("https://images.unsplash.com/photo-1621506289937-a8e4df240d0b"),
    bannerImageUrl: image("https://images.unsplash.com/photo-1546173159-315724a31696"),
    restaurantPhotosUrls: [
      image("https://images.unsplash.com/photo-1577805947697-89e18249d767"),
      image("https://images.unsplash.com/photo-1505252585461-04db1eb84625"),
      image("https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd")
    ]
  },
  "Ram grocery": {
    shopImageUrl: image("https://images.unsplash.com/photo-1542838132-92c53300491e"),
    bannerImageUrl: image("https://images.unsplash.com/photo-1578916171728-46686eac8d58"),
    restaurantPhotosUrls: [
      image("https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8"),
      image("https://images.unsplash.com/photo-1542838132-92c53300491e"),
      image("https://images.unsplash.com/photo-1578916171728-46686eac8d58")
    ]
  },
  "Amool icecream": {
    shopImageUrl: image("https://images.unsplash.com/photo-1563805042-7684c019e1cb"),
    bannerImageUrl: image("https://images.unsplash.com/photo-1501443762994-82bd5dace89a"),
    restaurantPhotosUrls: [
      image("https://images.unsplash.com/photo-1488900128323-21503983a07e"),
      image("https://images.unsplash.com/photo-1497034825429-c343d7c6a68f"),
      image("https://images.unsplash.com/photo-1579954115545-a95591f28bfc")
    ]
  }
};

const withItemImages = (items: MenuSeed[], imageUrls: string[]) =>
  items.map((item, index) => ({
    ...item,
    imageUrl: imageUrls[index] || item.imageUrl
  }));

const AFFORDABLE_PRICES: Record<string, Record<string, number>> = {
  "Raja cloud": {
    "Plain Dosa": 25,
    "Masala Dosa": 35,
    "Idly (2 pcs)": 20,
    "Ghee Podi Idly": 30,
    "Bread Omelette": 30,
    "Egg Fry (2 Eggs)": 35,
    "Veg Fried Rice": 50,
    "Egg Fried Rice": 55,
    "Chicken Fried Rice": 75,
    "Veg Biryani": 65,
    "Chicken Dum Biryani": 90,
    "Jeera Rice": 40,
    "Maggie Masala": 25,
    "Paneer Butter Masala": 75,
    "Chicken Curry": 85,
    "Curd Rice": 35
  },
  "Krishna sweets": {
    "Mysore Pak": 35,
    "Kaju Katli": 60,
    "Badam Halwa": 50,
    "Motichoor Laddu": 25,
    "Boondi Laddu": 20,
    "Gulab Jamun": 25,
    "Rasgulla": 25,
    "Rasmalai": 45,
    "Jalebi": 20,
    "Milk Peda": 25,
    "Soan Papdi": 25,
    "Dry Fruit Barfi": 65,
    "Coconut Barfi": 25,
    "Ghee Jangiri": 25,
    "Special Mixture": 30
  },
  "Nandini Bakery": {
    "Milk Bread Loaf": 20,
    "Whole Wheat Bread": 25,
    "Butter Croissant": 30,
    "Veg Puff": 15,
    "Paneer Puff": 20,
    "Egg Puff": 20,
    "Chocolate Muffin": 25,
    "Vanilla Cupcake": 20,
    "Black Forest Pastry": 40,
    "Pineapple Pastry": 35,
    "Plum Cake Slice": 30,
    "Jeera Cookies": 25,
    "Choco Chip Cookies": 30,
    "Cream Bun": 15,
    "Veg Grilled Sandwich": 40
  },
  "Btech juices": {
    "Fresh Mosambi Juice": 25,
    "Orange Juice": 30,
    "Watermelon Juice": 20,
    "Pineapple Juice": 25,
    "Pomegranate Juice": 50,
    "Mango Shake": 45,
    "Banana Shake": 30,
    "Strawberry Shake": 45,
    "Chocolate Shake": 50,
    "Oreo Shake": 55,
    "Avocado Smoothie": 60,
    "Apple Beetroot Carrot Juice": 50,
    "Lime Mint Cooler": 20,
    "Blue Lagoon": 35,
    "Mixed Fruit Bowl": 40
  },
  "Ram grocery": {
    "Sona Masoori Rice 1 kg": 45,
    "Toor Dal 1 kg": 75,
    "Urad Dal 500 g": 45,
    "Sugar 1 kg": 35,
    "Aashirvaad Atta 5 kg": 99,
    "Sunflower Oil 1 L": 95,
    "Tata Salt 1 kg": 20,
    "Turmeric Powder 200 g": 30,
    "Red Chilli Powder 200 g": 35,
    "Amul Butter 100 g": 40,
    "Curd 500 g": 25,
    "Good Day Cookies": 15,
    "Lays Classic Salted": 10,
    "Dishwash Bar": 10,
    "Toothpaste 100 g": 35
  },
  "Amool icecream": {
    "Vanilla Scoop": 20,
    "Chocolate Scoop": 25,
    "Strawberry Scoop": 25,
    "Butterscotch Scoop": 30,
    "Black Currant Scoop": 30,
    "Mango Cup": 20,
    "Pista Cup": 20,
    "Choco Bar": 15,
    "Kulfi Stick": 15,
    "Vanilla Family Pack": 80,
    "Chocolate Family Pack": 90,
    "Fruit Overload Sundae": 60,
    "Brownie Sundae": 70,
    "Cold Coffee Shake": 45,
    "Chocolate Thick Shake": 55
  }
};

const withAffordablePrices = (restaurantName: string, items: MenuSeed[]) =>
  items.map((item) => ({
    ...item,
    price: AFFORDABLE_PRICES[restaurantName]?.[item.name] ?? item.price
  }));

const prepareMenu = (restaurantName: string, items: MenuSeed[], imageUrls: string[]) =>
  withAffordablePrices(restaurantName, withItemImages(items, imageUrls));

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

const KRISHNA_SWEETS_ITEMS: MenuSeed[] = [
  { name: "Mysore Pak", description: "Ghee-rich gram flour sweet cut into soft pieces", price: 140, category: "Milk Sweets", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.sweets },
  { name: "Kaju Katli", description: "Thin cashew fudge slices finished with silver varq", price: 240, category: "Dry Sweets", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.sweets },
  { name: "Badam Halwa", description: "Warm almond halwa cooked with ghee and saffron", price: 180, category: "Festival Specials", isVegetarian: true, preparationTime: 8, imageUrl: MENU_IMAGE_URLS.sweets },
  { name: "Motichoor Laddu", description: "Fine boondi laddus with cardamom aroma", price: 120, category: "Milk Sweets", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.sweets },
  { name: "Boondi Laddu", description: "Classic temple-style laddu with crunchy boondi", price: 110, category: "Milk Sweets", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.sweets },
  { name: "Gulab Jamun", description: "Soft khoya dumplings soaked in rose syrup", price: 90, category: "Milk Sweets", isVegetarian: true, preparationTime: 6, imageUrl: MENU_IMAGE_URLS.sweets },
  { name: "Rasgulla", description: "Spongy chenna balls in light sugar syrup", price: 95, category: "Milk Sweets", isVegetarian: true, preparationTime: 6, imageUrl: MENU_IMAGE_URLS.sweets },
  { name: "Rasmalai", description: "Chenna patties soaked in chilled saffron milk", price: 130, category: "Milk Sweets", isVegetarian: true, preparationTime: 6, imageUrl: MENU_IMAGE_URLS.sweets },
  { name: "Jalebi", description: "Crispy spirals dipped in saffron sugar syrup", price: 80, category: "Festival Specials", isVegetarian: true, preparationTime: 7, imageUrl: MENU_IMAGE_URLS.sweets },
  { name: "Milk Peda", description: "Soft milk peda with cardamom and pistachio", price: 115, category: "Milk Sweets", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.sweets },
  { name: "Soan Papdi", description: "Flaky cube sweet with roasted besan and ghee", price: 105, category: "Dry Sweets", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.sweets },
  { name: "Dry Fruit Barfi", description: "Rich barfi packed with cashew, almond and pista", price: 260, category: "Dry Sweets", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.sweets },
  { name: "Coconut Barfi", description: "Fresh coconut fudge with mild cardamom", price: 100, category: "Dry Sweets", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.sweets },
  { name: "Ghee Jangiri", description: "South Indian jangiri fried in ghee and soaked in syrup", price: 120, category: "Festival Specials", isVegetarian: true, preparationTime: 7, imageUrl: MENU_IMAGE_URLS.sweets },
  { name: "Special Mixture", description: "Crunchy namkeen mix with nuts and curry leaves", price: 95, category: "Namkeen", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.sweets }
];

const NANDINI_BAKERY_ITEMS: MenuSeed[] = [
  { name: "Milk Bread Loaf", description: "Soft daily bread loaf for sandwiches and toast", price: 55, category: "Breads", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.bakery },
  { name: "Whole Wheat Bread", description: "Fresh wheat bread loaf with soft slices", price: 65, category: "Breads", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.bakery },
  { name: "Butter Croissant", description: "Flaky butter croissant baked fresh", price: 75, category: "Breads", isVegetarian: true, preparationTime: 6, imageUrl: MENU_IMAGE_URLS.bakery },
  { name: "Veg Puff", description: "Crisp puff stuffed with spiced vegetable masala", price: 35, category: "Puffs", isVegetarian: true, preparationTime: 6, imageUrl: MENU_IMAGE_URLS.bakery },
  { name: "Paneer Puff", description: "Golden puff with paneer and mild spices", price: 45, category: "Puffs", isVegetarian: true, preparationTime: 6, imageUrl: MENU_IMAGE_URLS.bakery },
  { name: "Egg Puff", description: "Flaky puff filled with boiled egg and masala", price: 45, category: "Puffs", isVegetarian: false, preparationTime: 6, imageUrl: MENU_IMAGE_URLS.bakery },
  { name: "Chocolate Muffin", description: "Moist chocolate muffin with choco chips", price: 60, category: "Cakes", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.bakery },
  { name: "Vanilla Cupcake", description: "Soft vanilla cupcake with buttercream swirl", price: 50, category: "Cakes", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.bakery },
  { name: "Black Forest Pastry", description: "Chocolate sponge layered with cream and cherries", price: 90, category: "Pastries", isVegetarian: true, preparationTime: 6, imageUrl: MENU_IMAGE_URLS.bakery },
  { name: "Pineapple Pastry", description: "Light sponge pastry with pineapple cream", price: 85, category: "Pastries", isVegetarian: true, preparationTime: 6, imageUrl: MENU_IMAGE_URLS.bakery },
  { name: "Plum Cake Slice", description: "Rich fruit cake slice with nuts and raisins", price: 70, category: "Cakes", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.bakery },
  { name: "Jeera Cookies", description: "Crisp cumin cookies baked with butter", price: 65, category: "Cookies", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.bakery },
  { name: "Choco Chip Cookies", description: "Crunchy cookies loaded with chocolate chips", price: 80, category: "Cookies", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.bakery },
  { name: "Cream Bun", description: "Soft bun filled with sweet vanilla cream", price: 40, category: "Buns", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.bakery },
  { name: "Veg Grilled Sandwich", description: "Grilled bakery sandwich with vegetables and cheese", price: 95, category: "Hots", isVegetarian: true, preparationTime: 10, imageUrl: MENU_IMAGE_URLS.bakery }
];

const BTECH_JUICES_ITEMS: MenuSeed[] = [
  { name: "Fresh Mosambi Juice", description: "Freshly squeezed sweet lime juice", price: 70, category: "Fresh Juice", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.juice },
  { name: "Orange Juice", description: "Fresh orange juice served chilled", price: 80, category: "Fresh Juice", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.juice },
  { name: "Watermelon Juice", description: "Cooling watermelon juice with no added color", price: 60, category: "Fresh Juice", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.juice },
  { name: "Pineapple Juice", description: "Tangy pineapple juice with a hint of salt", price: 75, category: "Fresh Juice", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.juice },
  { name: "Pomegranate Juice", description: "Rich anar juice made from fresh fruit", price: 120, category: "Fresh Juice", isVegetarian: true, preparationTime: 7, imageUrl: MENU_IMAGE_URLS.juice },
  { name: "Mango Shake", description: "Creamy mango milkshake with seasonal mango pulp", price: 110, category: "Milkshakes", isVegetarian: true, preparationTime: 6, imageUrl: MENU_IMAGE_URLS.juice },
  { name: "Banana Shake", description: "Thick banana milkshake with chilled milk", price: 80, category: "Milkshakes", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.juice },
  { name: "Strawberry Shake", description: "Sweet strawberry milkshake with cream finish", price: 115, category: "Milkshakes", isVegetarian: true, preparationTime: 6, imageUrl: MENU_IMAGE_URLS.juice },
  { name: "Chocolate Shake", description: "Thick chocolate shake with cocoa and ice cream", price: 120, category: "Milkshakes", isVegetarian: true, preparationTime: 6, imageUrl: MENU_IMAGE_URLS.juice },
  { name: "Oreo Shake", description: "Crushed Oreo shake with vanilla ice cream", price: 130, category: "Milkshakes", isVegetarian: true, preparationTime: 6, imageUrl: MENU_IMAGE_URLS.juice },
  { name: "Avocado Smoothie", description: "Creamy avocado smoothie with honey", price: 150, category: "Smoothies", isVegetarian: true, preparationTime: 7, imageUrl: MENU_IMAGE_URLS.juice },
  { name: "Apple Beetroot Carrot Juice", description: "ABC immunity juice with apple, beetroot and carrot", price: 130, category: "Fresh Juice", isVegetarian: true, preparationTime: 7, imageUrl: MENU_IMAGE_URLS.juice },
  { name: "Lime Mint Cooler", description: "Refreshing lime, mint and soda cooler", price: 70, category: "Mocktails", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.juice },
  { name: "Blue Lagoon", description: "Fizzy blue lagoon mocktail with lemon", price: 100, category: "Mocktails", isVegetarian: true, preparationTime: 5, imageUrl: MENU_IMAGE_URLS.juice },
  { name: "Mixed Fruit Bowl", description: "Seasonal fruit bowl with apple, banana and melon", price: 100, category: "Fruit Bowls", isVegetarian: true, preparationTime: 6, imageUrl: MENU_IMAGE_URLS.juice }
];

const RAM_GROCERY_ITEMS: MenuSeed[] = [
  { name: "Sona Masoori Rice 1 kg", description: "Everyday sona masoori rice pack", price: 68, category: "Staples", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.grocery },
  { name: "Toor Dal 1 kg", description: "Premium toor dal for daily cooking", price: 145, category: "Staples", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.grocery },
  { name: "Urad Dal 500 g", description: "Cleaned urad dal for dosa, idli and curries", price: 85, category: "Staples", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.grocery },
  { name: "Sugar 1 kg", description: "Refined white sugar pack", price: 48, category: "Staples", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.grocery },
  { name: "Aashirvaad Atta 5 kg", description: "Whole wheat atta family pack", price: 260, category: "Staples", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.grocery },
  { name: "Sunflower Oil 1 L", description: "Refined sunflower oil pouch", price: 145, category: "Staples", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.grocery },
  { name: "Tata Salt 1 kg", description: "Iodized salt for everyday cooking", price: 28, category: "Staples", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.grocery },
  { name: "Turmeric Powder 200 g", description: "Ground turmeric powder pack", price: 55, category: "Staples", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.grocery },
  { name: "Red Chilli Powder 200 g", description: "Spicy red chilli powder pack", price: 65, category: "Staples", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.grocery },
  { name: "Amul Butter 100 g", description: "Salted table butter pack", price: 58, category: "Dairy", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.grocery },
  { name: "Curd 500 g", description: "Fresh packaged curd", price: 45, category: "Dairy", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.grocery },
  { name: "Good Day Cookies", description: "Butter cookies family pack", price: 35, category: "Snacks", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.grocery },
  { name: "Lays Classic Salted", description: "Classic salted potato chips pack", price: 20, category: "Snacks", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.grocery },
  { name: "Dishwash Bar", description: "Lemon dishwash cleaning bar", price: 25, category: "Household", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.grocery },
  { name: "Toothpaste 100 g", description: "Daily-use toothpaste tube", price: 60, category: "Personal Care", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.grocery }
];

const AMOOL_ICECREAM_ITEMS: MenuSeed[] = [
  { name: "Vanilla Scoop", description: "Classic vanilla ice cream scoop", price: 60, category: "Scoops", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.iceCream },
  { name: "Chocolate Scoop", description: "Rich chocolate ice cream scoop", price: 70, category: "Scoops", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.iceCream },
  { name: "Strawberry Scoop", description: "Creamy strawberry ice cream scoop", price: 70, category: "Scoops", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.iceCream },
  { name: "Butterscotch Scoop", description: "Butterscotch ice cream with crunchy praline", price: 75, category: "Scoops", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.iceCream },
  { name: "Black Currant Scoop", description: "Tangy black currant ice cream scoop", price: 80, category: "Scoops", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.iceCream },
  { name: "Mango Cup", description: "Mango ice cream cup for single serve", price: 55, category: "Cups", isVegetarian: true, preparationTime: 3, imageUrl: MENU_IMAGE_URLS.iceCream },
  { name: "Pista Cup", description: "Pista flavored ice cream cup", price: 60, category: "Cups", isVegetarian: true, preparationTime: 3, imageUrl: MENU_IMAGE_URLS.iceCream },
  { name: "Choco Bar", description: "Chocolate coated vanilla ice cream bar", price: 45, category: "Cups", isVegetarian: true, preparationTime: 3, imageUrl: MENU_IMAGE_URLS.iceCream },
  { name: "Kulfi Stick", description: "Traditional malai kulfi on stick", price: 50, category: "Cups", isVegetarian: true, preparationTime: 3, imageUrl: MENU_IMAGE_URLS.iceCream },
  { name: "Vanilla Family Pack", description: "Vanilla ice cream family pack", price: 180, category: "Family Packs", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.iceCream },
  { name: "Chocolate Family Pack", description: "Chocolate ice cream family pack", price: 210, category: "Family Packs", isVegetarian: true, preparationTime: 4, imageUrl: MENU_IMAGE_URLS.iceCream },
  { name: "Fruit Overload Sundae", description: "Mixed fruit sundae with vanilla ice cream", price: 150, category: "Sundaes", isVegetarian: true, preparationTime: 7, imageUrl: MENU_IMAGE_URLS.iceCream },
  { name: "Brownie Sundae", description: "Chocolate brownie topped with ice cream and sauce", price: 170, category: "Sundaes", isVegetarian: true, preparationTime: 8, imageUrl: MENU_IMAGE_URLS.iceCream },
  { name: "Cold Coffee Shake", description: "Cold coffee blended with vanilla ice cream", price: 120, category: "Shakes", isVegetarian: true, preparationTime: 6, imageUrl: MENU_IMAGE_URLS.iceCream },
  { name: "Chocolate Thick Shake", description: "Thick chocolate shake with ice cream", price: 140, category: "Shakes", isVegetarian: true, preparationTime: 6, imageUrl: MENU_IMAGE_URLS.iceCream }
];

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const MOCK_PARTNER_LOCATIONS: Array<{
  restaurantName: string;
  phoneEnv: string;
  distanceKm: number;
  bearingDegrees: number;
  address: AddressSeed;
}> = [
  {
    restaurantName: "Raja cloud",
    phoneEnv: "RAJA_CLOUD_PHONE",
    distanceKm: 0.5,
    bearingDegrees: 35,
    address: {
      state: "Telangana",
      city: "Hyderabad",
      pincode: "500086",
      area: "Bandlaguda Jagir",
      colony: "Westend Colony",
      roadStreet: "Road No. 1",
      nearbyPlaces: ["Near Westend Colony Park", "Bandlaguda Jagir Main Road"]
    }
  },
  {
    restaurantName: "Krishna sweets",
    phoneEnv: "KRISHNA_SWEETS_PHONE",
    distanceKm: 1,
    bearingDegrees: 90,
    address: {
      state: "Telangana",
      city: "Hyderabad",
      pincode: "500086",
      area: "Bandlaguda Jagir",
      colony: "Westend Colony",
      roadStreet: "Road No. 3",
      nearbyPlaces: ["Near Westend Colony Masjid", "Bandlaguda Jagir Main Road"]
    }
  },
  {
    restaurantName: "Nandini Bakery",
    phoneEnv: "NANDINI_BAKERY_PHONE",
    distanceKm: 1.5,
    bearingDegrees: 135,
    address: {
      state: "Telangana",
      city: "Hyderabad",
      pincode: "500086",
      area: "Bandlaguda Jagir",
      colony: "Keerthi Richmond Villas",
      roadStreet: "Richmond Villas Road",
      nearbyPlaces: ["Near Keerthi Richmond Villas", "Bandlaguda Jagir"]
    }
  },
  {
    restaurantName: "Btech juices",
    phoneEnv: "BTECH_JUICES_PHONE",
    distanceKm: 2,
    bearingDegrees: 180,
    address: {
      state: "Telangana",
      city: "Hyderabad",
      pincode: "500086",
      area: "Bandlaguda Jagir",
      colony: "Kismatpur Road",
      roadStreet: "Kali Mandir Road",
      nearbyPlaces: ["Near Kali Mandir Road", "Bandlaguda Jagir"]
    }
  },
  {
    restaurantName: "Ram grocery",
    phoneEnv: "RAM_GROCERY_PHONE",
    distanceKm: 2.5,
    bearingDegrees: 225,
    address: {
      state: "Telangana",
      city: "Hyderabad",
      pincode: "500086",
      area: "Bandlaguda Jagir",
      colony: "Janachaitanya Colony",
      roadStreet: "Janachaitanya Colony Road",
      nearbyPlaces: ["Near Janachaitanya Colony Gate", "Bandlaguda Jagir"]
    }
  },
  {
    restaurantName: "Amool icecream",
    phoneEnv: "AMOOL_ICECREAM_PHONE",
    distanceKm: 2.8,
    bearingDegrees: 300,
    address: {
      state: "Telangana",
      city: "Hyderabad",
      pincode: "500086",
      area: "Bandlaguda Jagir",
      colony: "Sun City",
      roadStreet: "Sun City Road",
      nearbyPlaces: ["Near Sun City Road", "Bandlaguda Jagir"]
    }
  }
];

const DEFAULT_CLUSTER_CENTER = {
  longitude: 78.3896,
  latitude: 17.3142
};

const MOCK_CUSTOMER_PHONE = "9000000001";
const MOCK_ORDER_NOTE = "mock-partner-dashboard-seed";
const MOCK_ORDER_PLANS: MockOrderPlan[] = [
  { status: "CONFIRMED", daysAgo: 0, itemOffset: 0, quantities: [2, 2], paymentMethod: "CASH_ON_DELIVERY" },
  { status: "CONFIRMED", daysAgo: 0, itemOffset: 2, quantities: [3], paymentMethod: "UPI" },
  { status: "CONFIRMED", daysAgo: 0, itemOffset: 4, quantities: [2, 1], paymentMethod: "RAZORPAY" },
  { status: "CONFIRMED", daysAgo: 1, itemOffset: 6, quantities: [2], paymentMethod: "CASH_ON_DELIVERY" },
  { status: "ACCEPTED", daysAgo: 0, itemOffset: 8, quantities: [2, 2], paymentMethod: "RAZORPAY" },
  { status: "PREPARING", daysAgo: 0, itemOffset: 10, quantities: [3], paymentMethod: "CASH_ON_DELIVERY" },
  { status: "DELIVERED", daysAgo: 0, itemOffset: 12, quantities: [3, 2], paymentMethod: "UPI" },
  { status: "DELIVERED", daysAgo: 0, itemOffset: 1, quantities: [4], paymentMethod: "RAZORPAY" },
  { status: "DELIVERED", daysAgo: 1, itemOffset: 3, quantities: [2, 2, 1], paymentMethod: "CASH_ON_DELIVERY" },
  { status: "DELIVERED", daysAgo: 2, itemOffset: 5, quantities: [3, 3], paymentMethod: "UPI" },
  { status: "DELIVERED", daysAgo: 3, itemOffset: 7, quantities: [5], paymentMethod: "RAZORPAY" },
  { status: "DELIVERED", daysAgo: 4, itemOffset: 9, quantities: [2, 3], paymentMethod: "CASH_ON_DELIVERY" },
  { status: "DELIVERED", daysAgo: 5, itemOffset: 11, quantities: [4, 2], paymentMethod: "UPI" },
  { status: "DELIVERED", daysAgo: 7, itemOffset: 13, quantities: [3, 2, 2], paymentMethod: "RAZORPAY" },
  { status: "CANCELLED", daysAgo: 6, itemOffset: 1, quantities: [1], paymentMethod: "CASH_ON_DELIVERY" }
];

const findMockPartner = async (phone: string | null, restaurantName: string) => {
  if (phone) {
    const partnerByPhone = await Partner.findOne({ phone });
    if (partnerByPhone) return partnerByPhone;
  }

  return Partner.findOne({
    restaurantName: { $regex: new RegExp(`^${escapeRegex(restaurantName)}$`, "i") }
  });
};

const hasUsableCoordinates = (coordinates: unknown): coordinates is [number, number] => {
  return (
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    Number.isFinite(Number(coordinates[0])) &&
    Number.isFinite(Number(coordinates[1])) &&
    !(Number(coordinates[0]) === 0 && Number(coordinates[1]) === 0)
  );
};

const roundCoordinate = (value: number) => Number(value.toFixed(6));

const coordinatesAtDistance = (
  origin: { longitude: number; latitude: number },
  distanceKm: number,
  bearingDegrees: number
): [number, number] => {
  const bearing = (bearingDegrees * Math.PI) / 180;
  const northKm = Math.cos(bearing) * distanceKm;
  const eastKm = Math.sin(bearing) * distanceKm;
  const latitude = origin.latitude + northKm / 110.574;
  const longitude = origin.longitude + eastKm / (111.32 * Math.cos((origin.latitude * Math.PI) / 180));

  return [roundCoordinate(longitude), roundCoordinate(latitude)];
};

const googleMapsLinkFor = ([longitude, latitude]: [number, number]) =>
  `https://www.google.com/maps?q=${latitude},${longitude}`;

const upsertMenuForPartner = async (
  phone: string | null,
  restaurantName: string,
  items: MenuSeed[]
) => {
  const partner = await findMockPartner(phone, restaurantName);

  if (!partner) {
    console.log(`Partner not found for ${restaurantName} (${phone || "no-phone"})`);
    return;
  }

  await MenuItem.bulkWrite(
    items.map((item) => ({
      updateOne: {
        filter: { partnerId: partner._id, name: item.name },
        update: {
          $set: {
            partnerId: partner._id,
            name: item.name,
            description: item.description,
            price: item.price,
            category: item.category,
            isVegetarian: item.isVegetarian,
            preparationTime: item.preparationTime,
            imageUrl: item.imageUrl,
            isAvailable: true
          }
        },
        upsert: true
      }
    }))
  );

  partner.menuItemsCount = await MenuItem.countDocuments({ partnerId: partner._id });
  partner.hasCompletedSetup = true;
  await partner.save();

  console.log(`Added/updated ${items.length} menu items for existing partner ${partner.restaurantName || restaurantName} (${partner._id})`);
};

const removeLegacySeedItemsForPartner = async (restaurantName: string, items: MenuSeed[]) => {
  const partner = await Partner.findOne({
    restaurantName: { $regex: new RegExp(`^${escapeRegex(restaurantName)}$`, "i") }
  });

  if (!partner) return;

  const result = await MenuItem.deleteMany({
    partnerId: partner._id,
    name: { $in: items.map((item) => item.name) }
  });

  if (result.deletedCount) {
    partner.menuItemsCount = await MenuItem.countDocuments({ partnerId: partner._id });
    await partner.save();
    console.log(`Removed ${result.deletedCount} legacy test items from ${partner.restaurantName}`);
  }
};

const updateMockPartnerAddresses = async () => {
  const anchorSeed = MOCK_PARTNER_LOCATIONS[0];
  const anchorPartner = await findMockPartner(process.env[anchorSeed.phoneEnv] || null, anchorSeed.restaurantName);
  const anchorCoordinates = (anchorPartner as any)?.location?.coordinates;
  const origin = hasUsableCoordinates(anchorCoordinates)
    ? { longitude: Number(anchorCoordinates[0]), latitude: Number(anchorCoordinates[1]) }
    : DEFAULT_CLUSTER_CENTER;

  for (const seed of MOCK_PARTNER_LOCATIONS) {
    const partner = await findMockPartner(process.env[seed.phoneEnv] || null, seed.restaurantName);

    if (!partner) {
      console.log(`Partner not found while updating mock address for ${seed.restaurantName}`);
      continue;
    }

    const coordinates = coordinatesAtDistance(origin, seed.distanceKm, seed.bearingDegrees);
    (partner as any).address = {
      ...seed.address,
      googleMapsLink: googleMapsLinkFor(coordinates)
    };
    (partner as any).location = {
      type: "Point",
      coordinates
    };
    partner.hasCompletedSetup = true;
    await partner.save();

    console.log(
      `Updated mock address/location for ${partner.restaurantName || seed.restaurantName} (~${seed.distanceKm} km)`
    );
  }
};

const orderDate = (daysAgo: number, index: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(10 + (index % 8), (index * 11) % 60, 0, 0);
  return date;
};

const paymentStatusFor = (plan: MockOrderPlan) => {
  if (plan.status === "CANCELLED") return "CANCELLED";
  if (plan.status === "DELIVERED") return "PAID";
  if (plan.paymentMethod === "CASH_ON_DELIVERY") return "PAYMENT_PENDING_DELIVERY";
  return "PAID";
};

const ensureMockCustomer = async () => {
  return User.findOneAndUpdate(
    { phone: MOCK_CUSTOMER_PHONE },
    {
      $setOnInsert: {
        phone: MOCK_CUSTOMER_PHONE,
        name: "Mock Customer",
        role: "customer",
        email: "mock.customer@nearu.local",
        address: {
          recipientName: "Mock Customer",
          houseFlatDoorNo: "12-2",
          streetRoadName: "Westend Colony Road",
          city: "Hyderabad",
          state: "Telangana",
          pincode: "500086",
          area: "Bandlaguda Jagir",
          country: "India"
        }
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

const seedMockOrdersForPartners = async () => {
  const customer = await ensureMockCustomer();
  const partnerIds: any[] = [];
  const ordersToInsert: any[] = [];

  for (const [partnerIndex, seed] of MOCK_PARTNER_LOCATIONS.entries()) {
    const partner = await findMockPartner(process.env[seed.phoneEnv] || null, seed.restaurantName);

    if (!partner) {
      console.log(`Partner not found while seeding mock orders for ${seed.restaurantName}`);
      continue;
    }

    const menuItems = await MenuItem.find({ partnerId: partner._id, isAvailable: true })
      .sort({ name: 1 })
      .limit(15)
      .lean();

    if (menuItems.length === 0) {
      console.log(`No menu items found while seeding mock orders for ${partner.restaurantName || seed.restaurantName}`);
      continue;
    }

    partnerIds.push(partner._id);
    const partnerCoordinates = (partner as any).location?.coordinates;
    const deliveryCoordinates = hasUsableCoordinates(partnerCoordinates)
      ? coordinatesAtDistance(
          { longitude: Number(partnerCoordinates[0]), latitude: Number(partnerCoordinates[1]) },
          0.35 + partnerIndex * 0.05,
          270
        )
      : [DEFAULT_CLUSTER_CENTER.longitude, DEFAULT_CLUSTER_CENTER.latitude];

    MOCK_ORDER_PLANS.forEach((plan, orderIndex) => {
      const selectedItems = plan.quantities.map((quantity, quantityIndex) => {
        const menuItem = menuItems[(plan.itemOffset + quantityIndex) % menuItems.length] as any;
        return {
          menuItemId: menuItem._id,
          name: menuItem.name,
          quantity,
          price: menuItem.price
        };
      });
      const itemTotal = selectedItems.reduce((total, item) => total + item.price * item.quantity, 0);
      const deliveryFee = 49;
      const createdAt = orderDate(plan.daysAgo, partnerIndex + orderIndex);

      ordersToInsert.push({
        orderType: "SHOP",
        customerId: customer._id,
        partnerId: partner._id,
        deliveryAddress: `Mock address ${partnerIndex + 1}, Bandlaguda Jagir, Hyderabad`,
        deliveryLocation: {
          type: "Point",
          coordinates: deliveryCoordinates
        },
        note: MOCK_ORDER_NOTE,
        items: selectedItems,
        itemTotal,
        deliveryFee,
        grandTotal: itemTotal + deliveryFee,
        paymentMethod: plan.paymentMethod,
        paymentStatus: paymentStatusFor(plan),
        status: plan.status,
        createdAt,
        updatedAt: createdAt
      });
    });
  }

  if (partnerIds.length === 0 || ordersToInsert.length === 0) {
    console.log("No mock partner orders were created");
    return;
  }

  await Order.deleteMany({
    partnerId: { $in: partnerIds },
    note: MOCK_ORDER_NOTE
  });
  await Order.insertMany(ordersToInsert);

  console.log(`Seeded ${ordersToInsert.length} mock dashboard orders across ${partnerIds.length} partners`);
};

const updatePartnerImages = async (restaurantName: string) => {
  const images = PARTNER_IMAGES[restaurantName];
  if (!images) return;

  const partner = await Partner.findOne({
    restaurantName: { $regex: new RegExp(`^${escapeRegex(restaurantName)}$`, "i") }
  });

  if (!partner) {
    console.log(`Partner not found while updating images for ${restaurantName}`);
    return;
  }

  const existingDocuments = ((partner as any).documents?.toObject?.() || (partner as any).documents || {}) as Record<string, any>;
  partner.shopImageUrl = images.shopImageUrl;
  partner.bannerImageUrl = images.bannerImageUrl;
  (partner as any).documents = {
    ...existingDocuments,
    restaurantPhotosUrls: images.restaurantPhotosUrls
  };
  await partner.save();

  console.log(`Updated shop and restaurant photos for ${partner.restaurantName || restaurantName}`);
};

const run = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error("Missing MONGODB_URI / MONGO_URI in environment");
    }

    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB");

    await removeLegacySeedItemsForPartner("Ram grocery", FASTFOOD_TEST_ITEMS);
    await removeLegacySeedItemsForPartner("Krishna sweets", TEST_RES1_ITEMS);
    await upsertMenuForPartner(process.env.RAJA_CLOUD_PHONE || null, "Raja cloud", prepareMenu("Raja cloud", RAJA_CLOUD_KITCHEN_ITEMS, RAJA_ITEM_IMAGES));
    await upsertMenuForPartner(process.env.KRISHNA_SWEETS_PHONE || null, "Krishna sweets", prepareMenu("Krishna sweets", KRISHNA_SWEETS_ITEMS, SWEETS_ITEM_IMAGES));
    await upsertMenuForPartner(process.env.NANDINI_BAKERY_PHONE || null, "Nandini Bakery", prepareMenu("Nandini Bakery", NANDINI_BAKERY_ITEMS, BAKERY_ITEM_IMAGES));
    await upsertMenuForPartner(process.env.BTECH_JUICES_PHONE || null, "Btech juices", prepareMenu("Btech juices", BTECH_JUICES_ITEMS, JUICE_ITEM_IMAGES));
    await upsertMenuForPartner(process.env.RAM_GROCERY_PHONE || null, "Ram grocery", prepareMenu("Ram grocery", RAM_GROCERY_ITEMS, GROCERY_ITEM_IMAGES));
    await upsertMenuForPartner(process.env.AMOOL_ICECREAM_PHONE || null, "Amool icecream", prepareMenu("Amool icecream", AMOOL_ICECREAM_ITEMS, ICE_CREAM_ITEM_IMAGES));

    await updateMockPartnerAddresses();
    await seedMockOrdersForPartners();

    await updatePartnerImages("Krishna sweets");
    await updatePartnerImages("Nandini Bakery");
    await updatePartnerImages("Btech juices");
    await updatePartnerImages("Ram grocery");
    await updatePartnerImages("Amool icecream");

    console.log("Mock partner menu seeding complete");
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed mock partner menus:", error);
    process.exit(1);
  }
};

run();
