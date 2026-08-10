export const ONBOARDING_STEPS = [
  { key: "basic", title: "Restaurant details", subtitle: "Owner and shop contact information." },
  { key: "address", title: "Restaurant address", subtitle: "Help customers and riders find you." },
  { key: "category", title: "Business category", subtitle: "Pick the closest match for your shop." },
  { key: "identity", title: "Owner verification", subtitle: "Verify Aadhaar and PAN via Eko / DigiLocker." },
  { key: "business", title: "Business & legal", subtitle: "FSSAI, GST and compliance documents." },
  { key: "bank", title: "Bank / payout", subtitle: "Verify payout account or skip for now." },
  { key: "media", title: "Shop photos", subtitle: "Logo, cover and restaurant images." },
  { key: "menu", title: "Menu setup", subtitle: "Optional — you can add items later too." },
  { key: "operations", title: "Operating info", subtitle: "Hours, delivery modes and packaging." },
  { key: "agreement", title: "Review & submit", subtitle: "Accept agreement and send for verification." }
] as const;

export const CATEGORIES = [
  "bakery",
  "restaurant",
  "cloud-kitchen",
  "grocery",
  "tiffin-center",
  "fast-food",
  "sweets",
  "ice-creams",
  "juice",
  "other"
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  bakery: "Bakery",
  restaurant: "Restaurant",
  "cloud-kitchen": "Cloud Kitchen",
  grocery: "Grocery",
  "tiffin-center": "Tiffin Center",
  "fast-food": "Fast Food",
  sweets: "Sweets",
  "ice-creams": "Ice Creams",
  juice: "Juice",
  other: "Other"
};

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
