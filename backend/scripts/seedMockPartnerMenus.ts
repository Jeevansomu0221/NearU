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

type PartnerCatalogEntry = {
  restaurantName: string;
  legacyNames: string[];
  phoneEnv: string;
  shopDescription: string;
  category: string;
  rating: number;
  ratingCount: number;
  openingTime: string;
  closingTime: string;
  distanceKm: number;
  bearingDegrees: number;
  address: AddressSeed;
};

const image = (url: string) => `${url}?auto=format&fit=crop&w=900&q=80`;

const BIRYANI_ITEM_IMAGES = [
  "https://images.unsplash.com/photo-1563379091339-03246963d51a",
  "https://images.unsplash.com/photo-1599043513900-ed6fe01d3833",
  "https://images.unsplash.com/photo-1630383249896-424e482df921",
  "https://images.unsplash.com/photo-1601050690597-df0568f70950",
  "https://images.unsplash.com/photo-1603133872878-684f208fb84b",
  "https://images.unsplash.com/photo-1546833999-b9f581a1996d",
  "https://images.unsplash.com/photo-1589302168068-964664d93dc0",
  "https://images.unsplash.com/photo-1604908176997-4317c7eaeb9b",
  "https://images.unsplash.com/photo-1601050690117-8b3b8f567f1f",
  "https://images.unsplash.com/photo-1512058564366-18510be2db19",
  "https://images.unsplash.com/photo-1596797038530-2c107aa1e2fd",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445",
  "https://images.unsplash.com/photo-1498654896293-37aacf113fd9",
  "https://images.unsplash.com/photo-1482049016688-2d3e1b311543",
  "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f"
].map(image);

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

const FASTFOOD_ITEM_IMAGES = [
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
  "https://images.unsplash.com/photo-1550317138-10000687a72b",
  "https://images.unsplash.com/photo-1626700051175-6818013e1d4f",
  "https://images.unsplash.com/photo-1565299507177-b0ac66763828",
  "https://images.unsplash.com/photo-1573080496219-bb080dd4f877",
  "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445",
  "https://images.unsplash.com/photo-1625938145744-36f3a4ca3f5f",
  "https://images.unsplash.com/photo-1517701604599-bb29b565090c",
  "https://images.unsplash.com/photo-1564355808539-22fda35bed7e",
  "https://images.unsplash.com/photo-1513104890138-7c749659a591",
  "https://images.unsplash.com/photo-1550547660-d9450f859349",
  "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5",
  "https://images.unsplash.com/photo-1606755962773-d324e0a13086",
  "https://images.unsplash.com/photo-1525059696084-b0ee060f9c64"
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

const PARTNER_IMAGES: Record<string, { shopImageUrl: string; bannerImageUrl: string; restaurantPhotosUrls: string[] }> = {
  "Paradise Biryani": {
    shopImageUrl: image("https://images.unsplash.com/photo-1563379091339-03246963d51a"),
    bannerImageUrl: image("https://images.unsplash.com/photo-1599043513900-ed6fe01d3833"),
    restaurantPhotosUrls: [
      image("https://images.unsplash.com/photo-1546833999-b9f581a1996d"),
      image("https://images.unsplash.com/photo-1517248135467-4c7edcad34c4"),
      image("https://images.unsplash.com/photo-1559339352-11d035aa65de")
    ]
  },
  "Pulla Reddy Sweets": {
    shopImageUrl: image("https://images.unsplash.com/photo-1605197183305-6ce593f789ec"),
    bannerImageUrl: image("https://images.unsplash.com/photo-1551024506-0bccd828d307"),
    restaurantPhotosUrls: [
      image("https://images.unsplash.com/photo-1488477181946-6428a0291777"),
      image("https://images.unsplash.com/photo-1514517604298-cf80e0fb7f1e"),
      image("https://images.unsplash.com/photo-1495147466023-ac5c588e2e94")
    ]
  },
  "Karachi Bakery": {
    shopImageUrl: image("https://images.unsplash.com/photo-1509440159596-0249088772ff"),
    bannerImageUrl: image("https://images.unsplash.com/photo-1514933651103-005eec06c04b"),
    restaurantPhotosUrls: [
      image("https://images.unsplash.com/photo-1517433670267-08bbd4be890f"),
      image("https://images.unsplash.com/photo-1555507036-ab1f4038808a"),
      image("https://images.unsplash.com/photo-1555396273-367ea4eb4db5")
    ]
  },
  "Sree Krishna Juice Point": {
    shopImageUrl: image("https://images.unsplash.com/photo-1621506289937-a8e4df240d0b"),
    bannerImageUrl: image("https://images.unsplash.com/photo-1546173159-315724a31696"),
    restaurantPhotosUrls: [
      image("https://images.unsplash.com/photo-1577805947697-89e18249d767"),
      image("https://images.unsplash.com/photo-1505252585461-04db1eb84625"),
      image("https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd")
    ]
  },
  "Louis Burger": {
    shopImageUrl: image("https://images.unsplash.com/photo-1568901346375-23c9450c58cd"),
    bannerImageUrl: image("https://images.unsplash.com/photo-1513104890138-7c749659a591"),
    restaurantPhotosUrls: [
      image("https://images.unsplash.com/photo-1550547660-d9450f859349"),
      image("https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5"),
      image("https://images.unsplash.com/photo-1573080496219-bb080dd4f877")
    ]
  },
  "Naturals Ice Cream": {
    shopImageUrl: image("https://images.unsplash.com/photo-1563805042-7684c019e1cb"),
    bannerImageUrl: image("https://images.unsplash.com/photo-1501443762994-82bd5dace89a"),
    restaurantPhotosUrls: [
      image("https://images.unsplash.com/photo-1488900128323-21503983a07e"),
      image("https://images.unsplash.com/photo-1497034825429-c343d7c6a68f"),
      image("https://images.unsplash.com/photo-1579954115545-a95591f28bfc")
    ]
  }
};

const PARADISE_BIRYANI_ITEMS: MenuSeed[] = [
  { name: "Chicken Dum Biryani", description: "Hyderabadi dum biryani with tender chicken and aromatic basmati rice", price: 249, category: "Biryani", isVegetarian: false, preparationTime: 25, imageUrl: BIRYANI_ITEM_IMAGES[0] },
  { name: "Mutton Dum Biryani", description: "Slow-cooked mutton biryani with saffron and fried onions", price: 329, category: "Biryani", isVegetarian: false, preparationTime: 28, imageUrl: BIRYANI_ITEM_IMAGES[1] },
  { name: "Boneless Chicken Biryani", description: "Juicy boneless chicken layered with fragrant rice", price: 279, category: "Biryani", isVegetarian: false, preparationTime: 22, imageUrl: BIRYANI_ITEM_IMAGES[2] },
  { name: "Veg Dum Biryani", description: "Mixed vegetables dum-cooked with Hyderabadi spices", price: 199, category: "Biryani", isVegetarian: true, preparationTime: 20, imageUrl: BIRYANI_ITEM_IMAGES[3] },
  { name: "Paneer Biryani", description: "Cottage cheese biryani with mint and fried onions", price: 219, category: "Biryani", isVegetarian: true, preparationTime: 20, imageUrl: BIRYANI_ITEM_IMAGES[4] },
  { name: "Chicken 65", description: "Spicy deep-fried chicken bites — Hyderabad street classic", price: 249, category: "Starters", isVegetarian: false, preparationTime: 15, imageUrl: BIRYANI_ITEM_IMAGES[5] },
  { name: "Apollo Fish", description: "Crispy Apollo-style fish fry with house masala", price: 299, category: "Starters", isVegetarian: false, preparationTime: 16, imageUrl: BIRYANI_ITEM_IMAGES[6] },
  { name: "Mirchi Ka Salan", description: "Green chilli curry served with biryani — Hyderabadi staple", price: 89, category: "Sides", isVegetarian: true, preparationTime: 10, imageUrl: BIRYANI_ITEM_IMAGES[7] },
  { name: "Raita", description: "Cooling onion-tomato curd raita", price: 49, category: "Sides", isVegetarian: true, preparationTime: 5, imageUrl: BIRYANI_ITEM_IMAGES[8] },
  { name: "Double Ka Meetha", description: "Bread pudding dessert with dry fruits and rabri", price: 99, category: "Desserts", isVegetarian: true, preparationTime: 8, imageUrl: BIRYANI_ITEM_IMAGES[9] },
  { name: "Qubani Ka Meetha", description: "Apricot dessert topped with cream — Nizami classic", price: 119, category: "Desserts", isVegetarian: true, preparationTime: 8, imageUrl: BIRYANI_ITEM_IMAGES[10] },
  { name: "Chicken Fry Piece Biryani", description: "Biryani topped with crispy chicken fry pieces", price: 269, category: "Biryani", isVegetarian: false, preparationTime: 24, imageUrl: BIRYANI_ITEM_IMAGES[11] },
  { name: "Egg Biryani", description: "Boiled eggs layered in spiced dum biryani", price: 179, category: "Biryani", isVegetarian: false, preparationTime: 18, imageUrl: BIRYANI_ITEM_IMAGES[12] },
  { name: "Talawa Gosht", description: "Pan-fried mutton chunks with Hyderabadi spices", price: 349, category: "Curries", isVegetarian: false, preparationTime: 22, imageUrl: BIRYANI_ITEM_IMAGES[13] },
  { name: "Roomali Roti", description: "Thin hand-tossed roti, perfect with curries", price: 35, category: "Breads", isVegetarian: true, preparationTime: 6, imageUrl: BIRYANI_ITEM_IMAGES[14] }
];

const PULLA_REDDY_SWEETS_ITEMS: MenuSeed[] = [
  { name: "Pootharekulu", description: "Paper-thin sweet rolls with sugar and ghee — Andhra specialty", price: 180, category: "Festival Specials", isVegetarian: true, preparationTime: 5, imageUrl: SWEETS_ITEM_IMAGES[0] },
  { name: "Kaju Katli", description: "Diamond-cut cashew fudge with silver varq", price: 240, category: "Dry Sweets", isVegetarian: true, preparationTime: 5, imageUrl: SWEETS_ITEM_IMAGES[1] },
  { name: "Mysore Pak", description: "Ghee-rich gram flour sweet, melt-in-mouth texture", price: 140, category: "Milk Sweets", isVegetarian: true, preparationTime: 5, imageUrl: SWEETS_ITEM_IMAGES[2] },
  { name: "Motichoor Laddu", description: "Fine boondi laddus with cardamom and saffron", price: 120, category: "Milk Sweets", isVegetarian: true, preparationTime: 5, imageUrl: SWEETS_ITEM_IMAGES[3] },
  { name: "Gulab Jamun", description: "Soft khoya dumplings in rose-cardamom syrup", price: 90, category: "Milk Sweets", isVegetarian: true, preparationTime: 6, imageUrl: SWEETS_ITEM_IMAGES[4] },
  { name: "Rasmalai", description: "Chenna patties soaked in chilled saffron milk", price: 130, category: "Milk Sweets", isVegetarian: true, preparationTime: 6, imageUrl: SWEETS_ITEM_IMAGES[5] },
  { name: "Jalebi", description: "Crispy spirals dipped in saffron sugar syrup", price: 80, category: "Festival Specials", isVegetarian: true, preparationTime: 7, imageUrl: SWEETS_ITEM_IMAGES[6] },
  { name: "Badam Halwa", description: "Warm almond halwa with ghee and saffron strands", price: 180, category: "Festival Specials", isVegetarian: true, preparationTime: 8, imageUrl: SWEETS_ITEM_IMAGES[7] },
  { name: "Dry Fruit Barfi", description: "Rich barfi with cashew, almond and pistachio", price: 260, category: "Dry Sweets", isVegetarian: true, preparationTime: 5, imageUrl: SWEETS_ITEM_IMAGES[8] },
  { name: "Ghee Jangiri", description: "South Indian jangiri fried in ghee and soaked in syrup", price: 120, category: "Festival Specials", isVegetarian: true, preparationTime: 7, imageUrl: SWEETS_ITEM_IMAGES[9] },
  { name: "Soan Papdi", description: "Flaky cube sweet with roasted besan and ghee", price: 105, category: "Dry Sweets", isVegetarian: true, preparationTime: 5, imageUrl: SWEETS_ITEM_IMAGES[10] },
  { name: "Coconut Barfi", description: "Fresh coconut fudge with mild cardamom", price: 100, category: "Dry Sweets", isVegetarian: true, preparationTime: 5, imageUrl: SWEETS_ITEM_IMAGES[11] },
  { name: "Boondi Laddu", description: "Temple-style laddu with crunchy boondi", price: 110, category: "Milk Sweets", isVegetarian: true, preparationTime: 5, imageUrl: SWEETS_ITEM_IMAGES[12] },
  { name: "Milk Peda", description: "Soft milk peda with cardamom and pistachio", price: 115, category: "Milk Sweets", isVegetarian: true, preparationTime: 5, imageUrl: SWEETS_ITEM_IMAGES[13] },
  { name: "Special Mixture", description: "Crunchy namkeen mix with nuts and curry leaves", price: 95, category: "Namkeen", isVegetarian: true, preparationTime: 5, imageUrl: SWEETS_ITEM_IMAGES[14] }
];

const KARACHI_BAKERY_ITEMS: MenuSeed[] = [
  { name: "Osmania Biscuit (250g)", description: "Iconic Hyderabadi tea biscuit — slightly sweet, buttery", price: 120, category: "Biscuits", isVegetarian: true, preparationTime: 5, imageUrl: BAKERY_ITEM_IMAGES[0] },
  { name: "Fruit Biscuit (250g)", description: "Karachi Bakery's famous fruit biscuit with tutti-frutti", price: 130, category: "Biscuits", isVegetarian: true, preparationTime: 5, imageUrl: BAKERY_ITEM_IMAGES[1] },
  { name: "Khara Biscuit (250g)", description: "Savory spiced biscuit, perfect with chai", price: 110, category: "Biscuits", isVegetarian: true, preparationTime: 5, imageUrl: BAKERY_ITEM_IMAGES[2] },
  { name: "Dilkhush", description: "Sweet coconut-filled puff pastry — Karachi Bakery classic", price: 45, category: "Puffs", isVegetarian: true, preparationTime: 6, imageUrl: BAKERY_ITEM_IMAGES[3] },
  { name: "Plum Cake (500g)", description: "Rich fruit and nut cake — year-round bestseller", price: 350, category: "Cakes", isVegetarian: true, preparationTime: 5, imageUrl: BAKERY_ITEM_IMAGES[4] },
  { name: "Butter Croissant", description: "Flaky French croissant baked fresh every morning", price: 75, category: "Breads", isVegetarian: true, preparationTime: 6, imageUrl: BAKERY_ITEM_IMAGES[5] },
  { name: "Veg Puff", description: "Crisp puff with spiced potato and peas filling", price: 35, category: "Puffs", isVegetarian: true, preparationTime: 6, imageUrl: BAKERY_ITEM_IMAGES[6] },
  { name: "Egg Puff", description: "Golden puff with boiled egg and onion masala", price: 45, category: "Puffs", isVegetarian: false, preparationTime: 6, imageUrl: BAKERY_ITEM_IMAGES[7] },
  { name: "Chocolate Muffin", description: "Moist chocolate muffin with choco chips", price: 60, category: "Cakes", isVegetarian: true, preparationTime: 5, imageUrl: BAKERY_ITEM_IMAGES[8] },
  { name: "Black Forest Pastry", description: "Chocolate sponge with cream and cherries", price: 90, category: "Pastries", isVegetarian: true, preparationTime: 6, imageUrl: BAKERY_ITEM_IMAGES[9] },
  { name: "Pineapple Pastry", description: "Light sponge with fresh pineapple cream", price: 85, category: "Pastries", isVegetarian: true, preparationTime: 6, imageUrl: BAKERY_ITEM_IMAGES[10] },
  { name: "Jeera Cookies", description: "Crisp cumin cookies baked with butter", price: 65, category: "Cookies", isVegetarian: true, preparationTime: 5, imageUrl: BAKERY_ITEM_IMAGES[11] },
  { name: "Cream Bun", description: "Soft bun filled with sweet vanilla cream", price: 40, category: "Buns", isVegetarian: true, preparationTime: 5, imageUrl: BAKERY_ITEM_IMAGES[12] },
  { name: "Milk Bread Loaf", description: "Soft daily bread loaf for sandwiches and toast", price: 55, category: "Breads", isVegetarian: true, preparationTime: 5, imageUrl: BAKERY_ITEM_IMAGES[13] },
  { name: "Veg Grilled Sandwich", description: "Grilled sandwich with vegetables and cheese", price: 95, category: "Hots", isVegetarian: true, preparationTime: 10, imageUrl: BAKERY_ITEM_IMAGES[14] }
];

const SREE_KRISHNA_JUICE_ITEMS: MenuSeed[] = [
  { name: "Fresh Mosambi Juice", description: "Sweet lime juice squeezed to order", price: 70, category: "Fresh Juice", isVegetarian: true, preparationTime: 5, imageUrl: JUICE_ITEM_IMAGES[0] },
  { name: "Sugarcane Juice", description: "Chilled ganne ka ras with ginger and lemon", price: 40, category: "Fresh Juice", isVegetarian: true, preparationTime: 5, imageUrl: JUICE_ITEM_IMAGES[1] },
  { name: "Watermelon Juice", description: "Cooling watermelon juice, no added sugar", price: 60, category: "Fresh Juice", isVegetarian: true, preparationTime: 5, imageUrl: JUICE_ITEM_IMAGES[2] },
  { name: "Pomegranate Juice", description: "Fresh anar juice — antioxidant rich", price: 120, category: "Fresh Juice", isVegetarian: true, preparationTime: 7, imageUrl: JUICE_ITEM_IMAGES[3] },
  { name: "Badam Milk", description: "Chilled almond milk with saffron and nuts", price: 80, category: "Milkshakes", isVegetarian: true, preparationTime: 6, imageUrl: JUICE_ITEM_IMAGES[4] },
  { name: "Mango Shake", description: "Seasonal mango milkshake with Alphonso pulp", price: 110, category: "Milkshakes", isVegetarian: true, preparationTime: 6, imageUrl: JUICE_ITEM_IMAGES[5] },
  { name: "Banana Shake", description: "Thick banana milkshake with chilled milk", price: 80, category: "Milkshakes", isVegetarian: true, preparationTime: 5, imageUrl: JUICE_ITEM_IMAGES[6] },
  { name: "Oreo Shake", description: "Crushed Oreo blended with vanilla ice cream", price: 130, category: "Milkshakes", isVegetarian: true, preparationTime: 6, imageUrl: JUICE_ITEM_IMAGES[7] },
  { name: "Chocolate Shake", description: "Thick chocolate shake with cocoa and ice cream", price: 120, category: "Milkshakes", isVegetarian: true, preparationTime: 6, imageUrl: JUICE_ITEM_IMAGES[8] },
  { name: "Apple Beetroot Carrot Juice", description: "ABC immunity booster juice", price: 130, category: "Fresh Juice", isVegetarian: true, preparationTime: 7, imageUrl: JUICE_ITEM_IMAGES[9] },
  { name: "Lime Mint Cooler", description: "Refreshing lime and mint soda cooler", price: 70, category: "Mocktails", isVegetarian: true, preparationTime: 5, imageUrl: JUICE_ITEM_IMAGES[10] },
  { name: "Blue Lagoon", description: "Fizzy blue lagoon mocktail with lemon", price: 100, category: "Mocktails", isVegetarian: true, preparationTime: 5, imageUrl: JUICE_ITEM_IMAGES[11] },
  { name: "Avocado Smoothie", description: "Creamy avocado smoothie with honey", price: 150, category: "Smoothies", isVegetarian: true, preparationTime: 7, imageUrl: JUICE_ITEM_IMAGES[12] },
  { name: "Mixed Fruit Bowl", description: "Seasonal fruits — apple, banana, papaya and melon", price: 100, category: "Fruit Bowls", isVegetarian: true, preparationTime: 6, imageUrl: JUICE_ITEM_IMAGES[13] },
  { name: "Pineapple Juice", description: "Tangy pineapple juice with a pinch of salt", price: 75, category: "Fresh Juice", isVegetarian: true, preparationTime: 5, imageUrl: JUICE_ITEM_IMAGES[14] }
];

const LOUIS_BURGER_ITEMS: MenuSeed[] = [
  { name: "Classic Chicken Burger", description: "Grilled chicken patty with lettuce, mayo and cheese", price: 149, category: "Burgers", isVegetarian: false, preparationTime: 12, imageUrl: FASTFOOD_ITEM_IMAGES[0] },
  { name: "Peri Peri Chicken Burger", description: "Spicy peri peri chicken with jalapeños and sauce", price: 179, category: "Burgers", isVegetarian: false, preparationTime: 14, imageUrl: FASTFOOD_ITEM_IMAGES[1] },
  { name: "Veg Supreme Burger", description: "Crispy veg patty with onion rings and special sauce", price: 129, category: "Burgers", isVegetarian: true, preparationTime: 12, imageUrl: FASTFOOD_ITEM_IMAGES[2] },
  { name: "BBQ Chicken Wrap", description: "Smoky BBQ chicken wrapped in soft tortilla", price: 159, category: "Wraps", isVegetarian: false, preparationTime: 11, imageUrl: FASTFOOD_ITEM_IMAGES[3] },
  { name: "Paneer Tikka Wrap", description: "Grilled paneer tikka with mint chutney", price: 149, category: "Wraps", isVegetarian: true, preparationTime: 10, imageUrl: FASTFOOD_ITEM_IMAGES[4] },
  { name: "Peri Peri Fries", description: "Crispy fries tossed in peri peri seasoning", price: 109, category: "Sides", isVegetarian: true, preparationTime: 8, imageUrl: FASTFOOD_ITEM_IMAGES[5] },
  { name: "Loaded Cheese Fries", description: "Fries topped with melted cheese and jalapeños", price: 139, category: "Sides", isVegetarian: true, preparationTime: 9, imageUrl: FASTFOOD_ITEM_IMAGES[6] },
  { name: "Chicken Wings (6 pcs)", description: "Crispy wings with choice of hot or BBQ sauce", price: 199, category: "Snacks", isVegetarian: false, preparationTime: 16, imageUrl: FASTFOOD_ITEM_IMAGES[7] },
  { name: "Veg Nuggets (8 pcs)", description: "Golden fried veggie nuggets with dip", price: 119, category: "Snacks", isVegetarian: true, preparationTime: 10, imageUrl: FASTFOOD_ITEM_IMAGES[8] },
  { name: "Cold Coffee", description: "Chilled creamy coffee with ice cream", price: 99, category: "Beverages", isVegetarian: true, preparationTime: 5, imageUrl: FASTFOOD_ITEM_IMAGES[9] },
  { name: "Brownie Sundae", description: "Warm chocolate brownie with vanilla ice cream", price: 149, category: "Desserts", isVegetarian: true, preparationTime: 7, imageUrl: FASTFOOD_ITEM_IMAGES[10] },
  { name: "Margherita Pizza", description: "Thin crust pizza with mozzarella and basil", price: 199, category: "Pizza", isVegetarian: true, preparationTime: 18, imageUrl: FASTFOOD_ITEM_IMAGES[11] },
  { name: "Chicken Pepperoni Pizza", description: "Loaded pizza with chicken pepperoni and cheese", price: 279, category: "Pizza", isVegetarian: false, preparationTime: 20, imageUrl: FASTFOOD_ITEM_IMAGES[12] },
  { name: "Garlic Bread (4 pcs)", description: "Toasted garlic bread with herbs and butter", price: 89, category: "Sides", isVegetarian: true, preparationTime: 8, imageUrl: FASTFOOD_ITEM_IMAGES[13] },
  { name: "Chocolate Thick Shake", description: "Rich chocolate shake topped with whipped cream", price: 129, category: "Beverages", isVegetarian: true, preparationTime: 6, imageUrl: FASTFOOD_ITEM_IMAGES[14] }
];

const NATURALS_ICECREAM_ITEMS: MenuSeed[] = [
  { name: "Tender Coconut", description: "Fresh tender coconut ice cream — Naturals signature", price: 70, category: "Scoops", isVegetarian: true, preparationTime: 4, imageUrl: ICE_CREAM_ITEM_IMAGES[0] },
  { name: "Sitaphal (Custard Apple)", description: "Creamy sitaphal ice cream with real fruit pulp", price: 80, category: "Scoops", isVegetarian: true, preparationTime: 4, imageUrl: ICE_CREAM_ITEM_IMAGES[1] },
  { name: "Butterscotch Scoop", description: "Butterscotch ice cream with crunchy praline", price: 75, category: "Scoops", isVegetarian: true, preparationTime: 4, imageUrl: ICE_CREAM_ITEM_IMAGES[2] },
  { name: "Mango Scoop", description: "Alphonso mango ice cream — seasonal favourite", price: 80, category: "Scoops", isVegetarian: true, preparationTime: 4, imageUrl: ICE_CREAM_ITEM_IMAGES[3] },
  { name: "Chocolate Scoop", description: "Rich Belgian chocolate ice cream", price: 70, category: "Scoops", isVegetarian: true, preparationTime: 4, imageUrl: ICE_CREAM_ITEM_IMAGES[4] },
  { name: "Anjeer (Fig) Scoop", description: "Fig ice cream with real anjeer pieces", price: 85, category: "Scoops", isVegetarian: true, preparationTime: 4, imageUrl: ICE_CREAM_ITEM_IMAGES[5] },
  { name: "Kulfi Stick", description: "Traditional malai kulfi on stick", price: 50, category: "Kulfi", isVegetarian: true, preparationTime: 3, imageUrl: ICE_CREAM_ITEM_IMAGES[6] },
  { name: "Pista Kulfi", description: "Pistachio-flavoured dense kulfi", price: 60, category: "Kulfi", isVegetarian: true, preparationTime: 3, imageUrl: ICE_CREAM_ITEM_IMAGES[7] },
  { name: "Fruit Overload Sundae", description: "Mixed seasonal fruits with vanilla ice cream", price: 150, category: "Sundaes", isVegetarian: true, preparationTime: 7, imageUrl: ICE_CREAM_ITEM_IMAGES[8] },
  { name: "Brownie Sundae", description: "Warm brownie topped with ice cream and chocolate sauce", price: 170, category: "Sundaes", isVegetarian: true, preparationTime: 8, imageUrl: ICE_CREAM_ITEM_IMAGES[9] },
  { name: "Vanilla Family Pack (500ml)", description: "Take-home vanilla ice cream tub", price: 180, category: "Family Packs", isVegetarian: true, preparationTime: 4, imageUrl: ICE_CREAM_ITEM_IMAGES[10] },
  { name: "Mango Family Pack (500ml)", description: "Take-home mango ice cream tub", price: 210, category: "Family Packs", isVegetarian: true, preparationTime: 4, imageUrl: ICE_CREAM_ITEM_IMAGES[11] },
  { name: "Cold Coffee Shake", description: "Cold coffee blended with vanilla ice cream", price: 120, category: "Shakes", isVegetarian: true, preparationTime: 6, imageUrl: ICE_CREAM_ITEM_IMAGES[12] },
  { name: "Choco Bar", description: "Chocolate-coated vanilla ice cream bar", price: 45, category: "Bars", isVegetarian: true, preparationTime: 3, imageUrl: ICE_CREAM_ITEM_IMAGES[13] },
  { name: "Jackfruit Scoop", description: "Unique jackfruit ice cream with real fruit", price: 80, category: "Scoops", isVegetarian: true, preparationTime: 4, imageUrl: ICE_CREAM_ITEM_IMAGES[14] }
];

const AFFORDABLE_PRICES: Record<string, Record<string, number>> = {
  "Paradise Biryani": {
    "Chicken Dum Biryani": 199,
    "Mutton Dum Biryani": 279,
    "Boneless Chicken Biryani": 219,
    "Veg Dum Biryani": 149,
    "Paneer Biryani": 169,
    "Chicken 65": 199,
    "Apollo Fish": 249,
    "Mirchi Ka Salan": 49,
    "Raita": 35,
    "Double Ka Meetha": 79,
    "Qubani Ka Meetha": 99,
    "Chicken Fry Piece Biryani": 219,
    "Egg Biryani": 149,
    "Talawa Gosht": 299,
    "Roomali Roti": 25
  },
  "Pulla Reddy Sweets": {
    "Pootharekulu": 120,
    "Kaju Katli": 60,
    "Mysore Pak": 35,
    "Motichoor Laddu": 25,
    "Gulab Jamun": 25,
    "Rasmalai": 45,
    "Jalebi": 20,
    "Badam Halwa": 50,
    "Dry Fruit Barfi": 65,
    "Ghee Jangiri": 25,
    "Soan Papdi": 25,
    "Coconut Barfi": 25,
    "Boondi Laddu": 20,
    "Milk Peda": 25,
    "Special Mixture": 30
  },
  "Karachi Bakery": {
    "Osmania Biscuit (250g)": 90,
    "Fruit Biscuit (250g)": 100,
    "Khara Biscuit (250g)": 85,
    "Dilkhush": 35,
    "Plum Cake (500g)": 280,
    "Butter Croissant": 30,
    "Veg Puff": 15,
    "Egg Puff": 20,
    "Chocolate Muffin": 25,
    "Black Forest Pastry": 40,
    "Pineapple Pastry": 35,
    "Jeera Cookies": 25,
    "Cream Bun": 15,
    "Milk Bread Loaf": 20,
    "Veg Grilled Sandwich": 40
  },
  "Sree Krishna Juice Point": {
    "Fresh Mosambi Juice": 25,
    "Sugarcane Juice": 20,
    "Watermelon Juice": 20,
    "Pomegranate Juice": 50,
    "Badam Milk": 40,
    "Mango Shake": 45,
    "Banana Shake": 30,
    "Oreo Shake": 55,
    "Chocolate Shake": 50,
    "Apple Beetroot Carrot Juice": 50,
    "Lime Mint Cooler": 20,
    "Blue Lagoon": 35,
    "Avocado Smoothie": 60,
    "Mixed Fruit Bowl": 40,
    "Pineapple Juice": 25
  },
  "Louis Burger": {
    "Classic Chicken Burger": 129,
    "Peri Peri Chicken Burger": 149,
    "Veg Supreme Burger": 99,
    "BBQ Chicken Wrap": 129,
    "Paneer Tikka Wrap": 119,
    "Peri Peri Fries": 79,
    "Loaded Cheese Fries": 99,
    "Chicken Wings (6 pcs)": 169,
    "Veg Nuggets (8 pcs)": 89,
    "Cold Coffee": 69,
    "Brownie Sundae": 119,
    "Margherita Pizza": 149,
    "Chicken Pepperoni Pizza": 199,
    "Garlic Bread (4 pcs)": 59,
    "Chocolate Thick Shake": 89
  },
  "Naturals Ice Cream": {
    "Tender Coconut": 60,
    "Sitaphal (Custard Apple)": 70,
    "Butterscotch Scoop": 55,
    "Mango Scoop": 65,
    "Chocolate Scoop": 55,
    "Anjeer (Fig) Scoop": 70,
    "Kulfi Stick": 40,
    "Pista Kulfi": 50,
    "Fruit Overload Sundae": 120,
    "Brownie Sundae": 140,
    "Vanilla Family Pack (500ml)": 160,
    "Mango Family Pack (500ml)": 180,
    "Cold Coffee Shake": 90,
    "Choco Bar": 35,
    "Jackfruit Scoop": 65
  }
};

const PARTNER_CATALOG: PartnerCatalogEntry[] = [
  {
    restaurantName: "Paradise Biryani",
    legacyNames: ["Raja cloud"],
    phoneEnv: "RAJA_CLOUD_PHONE",
    shopDescription: "Legendary Hyderabadi biryani since 1953 — dum biryani, kebabs and Nizami desserts",
    category: "cloud-kitchen",
    rating: 4.6,
    ratingCount: 2840,
    openingTime: "11:00",
    closingTime: "23:00",
    distanceKm: 0.5,
    bearingDegrees: 35,
    address: {
      state: "Telangana",
      city: "Hyderabad",
      pincode: "500028",
      area: "Secunderabad",
      colony: "Paradise Circle",
      roadStreet: "SD Road, Near Paradise Junction",
      nearbyPlaces: ["Paradise Metro Station", "Ranigunj"]
    }
  },
  {
    restaurantName: "Pulla Reddy Sweets",
    legacyNames: ["Krishna sweets"],
    phoneEnv: "KRISHNA_SWEETS_PHONE",
    shopDescription: "Authentic Andhra sweets — Pootharekulu, Kaju Katli and festival specials",
    category: "sweets",
    rating: 4.5,
    ratingCount: 1520,
    openingTime: "08:00",
    closingTime: "22:00",
    distanceKm: 1,
    bearingDegrees: 90,
    address: {
      state: "Telangana",
      city: "Hyderabad",
      pincode: "500034",
      area: "Banjara Hills",
      colony: "Road No. 12",
      roadStreet: "Banjara Hills Main Road",
      nearbyPlaces: ["GVK One Mall", "Jalagam Vengal Rao Park"]
    }
  },
  {
    restaurantName: "Karachi Bakery",
    legacyNames: ["Nandini Bakery"],
    phoneEnv: "NANDINI_BAKERY_PHONE",
    shopDescription: "Hyderabad's iconic bakery — Osmania biscuits, fruit biscuits and plum cake",
    category: "bakery",
    rating: 4.7,
    ratingCount: 4200,
    openingTime: "07:00",
    closingTime: "22:00",
    distanceKm: 1.5,
    bearingDegrees: 135,
    address: {
      state: "Telangana",
      city: "Hyderabad",
      pincode: "500001",
      area: "Nampally",
      colony: "Moazzam Jahi Market",
      roadStreet: "Mozamjahi Market Road",
      nearbyPlaces: ["Nampally Railway Station", "Charminar (2 km)"]
    }
  },
  {
    restaurantName: "Sree Krishna Juice Point",
    legacyNames: ["Btech juices"],
    phoneEnv: "BTECH_JUICES_PHONE",
    shopDescription: "Fresh fruit juices, sugarcane, badam milk and thick shakes",
    category: "juice",
    rating: 4.3,
    ratingCount: 680,
    openingTime: "09:00",
    closingTime: "22:00",
    distanceKm: 2,
    bearingDegrees: 180,
    address: {
      state: "Telangana",
      city: "Hyderabad",
      pincode: "500072",
      area: "Kukatpally",
      colony: "KPHB Colony",
      roadStreet: "KPHB 4th Phase Main Road",
      nearbyPlaces: ["KPHB Metro Station", "Forum Sujana Mall"]
    }
  },
  {
    restaurantName: "Louis Burger",
    legacyNames: ["Ram grocery"],
    phoneEnv: "RAM_GROCERY_PHONE",
    shopDescription: "Gourmet burgers, wraps, wings and pizzas — Hyderabad's favourite cloud kitchen",
    category: "fast-food",
    rating: 4.4,
    ratingCount: 2100,
    openingTime: "11:00",
    closingTime: "23:30",
    distanceKm: 2.5,
    bearingDegrees: 225,
    address: {
      state: "Telangana",
      city: "Hyderabad",
      pincode: "500032",
      area: "Gachibowli",
      colony: "DLF Cyber City",
      roadStreet: "Gachibowli Main Road",
      nearbyPlaces: ["DLF Cyber Towers", "IKEA Hyderabad"]
    }
  },
  {
    restaurantName: "Naturals Ice Cream",
    legacyNames: ["Amool icecream"],
    phoneEnv: "AMOOL_ICECREAM_PHONE",
    shopDescription: "Fresh fruit ice creams — tender coconut, sitaphal, mango and more",
    category: "ice-creams",
    rating: 4.5,
    ratingCount: 1890,
    openingTime: "10:00",
    closingTime: "23:00",
    distanceKm: 2.8,
    bearingDegrees: 300,
    address: {
      state: "Telangana",
      city: "Hyderabad",
      pincode: "500081",
      area: "Madhapur",
      colony: "Hitech City",
      roadStreet: "Mindspace Road",
      nearbyPlaces: ["Inorbit Mall", "Durgam Cheruvu"]
    }
  }
];

const MENU_BY_PARTNER: Record<string, { items: MenuSeed[]; images: string[] }> = {
  "Paradise Biryani": { items: PARADISE_BIRYANI_ITEMS, images: BIRYANI_ITEM_IMAGES },
  "Pulla Reddy Sweets": { items: PULLA_REDDY_SWEETS_ITEMS, images: SWEETS_ITEM_IMAGES },
  "Karachi Bakery": { items: KARACHI_BAKERY_ITEMS, images: BAKERY_ITEM_IMAGES },
  "Sree Krishna Juice Point": { items: SREE_KRISHNA_JUICE_ITEMS, images: JUICE_ITEM_IMAGES },
  "Louis Burger": { items: LOUIS_BURGER_ITEMS, images: FASTFOOD_ITEM_IMAGES },
  "Naturals Ice Cream": { items: NATURALS_ICECREAM_ITEMS, images: ICE_CREAM_ITEM_IMAGES }
};

const LEGACY_MENU_ITEMS_TO_REMOVE: Record<string, string[]> = {
  "Louis Burger": [
    "Sona Masoori Rice 1 kg", "Toor Dal 1 kg", "Urad Dal 500 g", "Sugar 1 kg",
    "Aashirvaad Atta 5 kg", "Sunflower Oil 1 L", "Tata Salt 1 kg",
    "Classic Veg Burger", "Chicken Zinger Burger", "Paneer Wrap", "Chicken Roll"
  ],
  "Pulla Reddy Sweets": [
    "Butter Croissant", "Chocolate Muffin", "Red Velvet Pastry", "Black Forest Slice",
    "Veg Sandwich", "Blueberry Cheesecake Jar"
  ],
  "Paradise Biryani": [
    "Plain Dosa", "Masala Dosa", "Idly (2 pcs)", "Ghee Podi Idly", "Maggie Masala"
  ]
};

const withItemImages = (items: MenuSeed[], imageUrls: string[]) =>
  items.map((item, index) => ({
    ...item,
    imageUrl: imageUrls[index] || item.imageUrl
  }));

const withAffordablePrices = (restaurantName: string, items: MenuSeed[]) =>
  items.map((item) => ({
    ...item,
    price: AFFORDABLE_PRICES[restaurantName]?.[item.name] ?? item.price
  }));

const prepareMenu = (restaurantName: string, items: MenuSeed[], imageUrls: string[]) =>
  withAffordablePrices(restaurantName, withItemImages(items, imageUrls));

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const findPartnerByName = async (name: string) =>
  Partner.findOne({
    restaurantName: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") }
  });

const findMockPartner = async (entry: PartnerCatalogEntry) => {
  const phone = process.env[entry.phoneEnv] || null;
  if (phone) {
    const partnerByPhone = await Partner.findOne({ phone });
    if (partnerByPhone) return partnerByPhone;
  }

  const partnerByCurrentName = await findPartnerByName(entry.restaurantName);
  if (partnerByCurrentName) return partnerByCurrentName;

  for (const legacyName of entry.legacyNames) {
    const partnerByLegacyName = await findPartnerByName(legacyName);
    if (partnerByLegacyName) return partnerByLegacyName;
  }

  return null;
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

const upsertMenuForPartner = async (entry: PartnerCatalogEntry, items: MenuSeed[]) => {
  const partner = await findMockPartner(entry);

  if (!partner) {
    console.log(`Partner not found for ${entry.restaurantName} (${process.env[entry.phoneEnv] || "no-phone"})`);
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

  console.log(`Added/updated ${items.length} menu items for ${partner.restaurantName || entry.restaurantName} (${partner._id})`);
};

const removeStaleMenuItems = async (entry: PartnerCatalogEntry, itemNames: string[]) => {
  const partner = await findMockPartner(entry);
  if (!partner || itemNames.length === 0) return;

  const result = await MenuItem.deleteMany({
    partnerId: partner._id,
    name: { $in: itemNames }
  });

  if (result.deletedCount) {
    partner.menuItemsCount = await MenuItem.countDocuments({ partnerId: partner._id });
    await partner.save();
    console.log(`Removed ${result.deletedCount} stale items from ${partner.restaurantName}`);
  }
};

const updatePartnerProfile = async (entry: PartnerCatalogEntry) => {
  const partner = await findMockPartner(entry);
  if (!partner) {
    console.log(`Partner not found while updating profile for ${entry.restaurantName}`);
    return;
  }

  partner.restaurantName = entry.restaurantName;
  partner.shopName = entry.restaurantName;
  partner.shopDescription = entry.shopDescription;
  partner.category = entry.category as any;
  partner.rating = entry.rating;
  partner.ratingCount = entry.ratingCount;
  partner.openingTime = entry.openingTime;
  partner.closingTime = entry.closingTime;
  partner.isOpen = true;
  partner.status = partner.status === "PENDING" ? "APPROVED" : partner.status;
  partner.hasCompletedSetup = true;
  await partner.save();

  console.log(`Updated profile for ${entry.restaurantName}`);
};

const updateMockPartnerAddresses = async () => {
  const anchorEntry = PARTNER_CATALOG[0];
  const anchorPartner = await findMockPartner(anchorEntry);
  const anchorCoordinates = (anchorPartner as any)?.location?.coordinates;
  const origin = hasUsableCoordinates(anchorCoordinates)
    ? { longitude: Number(anchorCoordinates[0]), latitude: Number(anchorCoordinates[1]) }
    : DEFAULT_CLUSTER_CENTER;

  for (const entry of PARTNER_CATALOG) {
    const partner = await findMockPartner(entry);

    if (!partner) {
      console.log(`Partner not found while updating address for ${entry.restaurantName}`);
      continue;
    }

    const coordinates = coordinatesAtDistance(origin, entry.distanceKm, entry.bearingDegrees);
    (partner as any).address = {
      ...entry.address,
      googleMapsLink: googleMapsLinkFor(coordinates)
    };
    (partner as any).location = {
      type: "Point",
      coordinates
    };
    partner.hasCompletedSetup = true;
    await partner.save();

    console.log(`Updated address/location for ${partner.restaurantName} (~${entry.distanceKm} km)`);
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
        name: "Rahul Reddy",
        role: "customer",
        email: "rahul.reddy@nearu.local",
        address: {
          recipientName: "Rahul Reddy",
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

  for (const [partnerIndex, entry] of PARTNER_CATALOG.entries()) {
    const partner = await findMockPartner(entry);

    if (!partner) {
      console.log(`Partner not found while seeding mock orders for ${entry.restaurantName}`);
      continue;
    }

    const menuItems = await MenuItem.find({ partnerId: partner._id, isAvailable: true })
      .sort({ name: 1 })
      .limit(15)
      .lean();

    if (menuItems.length === 0) {
      console.log(`No menu items found while seeding mock orders for ${partner.restaurantName}`);
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
        deliveryAddress: `Flat 4B, Westend Colony, Bandlaguda Jagir, Hyderabad`,
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

  const partner = await findPartnerByName(restaurantName);
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

  console.log(`Updated shop and restaurant photos for ${partner.restaurantName}`);
};

const run = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error("Missing MONGODB_URI / MONGO_URI in environment");
    }

    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB");

    for (const entry of PARTNER_CATALOG) {
      await updatePartnerProfile(entry);

      const staleItems = LEGACY_MENU_ITEMS_TO_REMOVE[entry.restaurantName] || [];
      if (staleItems.length > 0) {
        await removeStaleMenuItems(entry, staleItems);
      }

      const menuConfig = MENU_BY_PARTNER[entry.restaurantName];
      if (menuConfig) {
        const menu = prepareMenu(entry.restaurantName, menuConfig.items, menuConfig.images);
        await upsertMenuForPartner(entry, menu);
      }
    }

    await updateMockPartnerAddresses();
    await seedMockOrdersForPartners();

    for (const entry of PARTNER_CATALOG) {
      await updatePartnerImages(entry.restaurantName);
    }

    console.log("Hyderabad partner data seeding complete");
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed Hyderabad partner data:", error);
    process.exit(1);
  }
};

run();
