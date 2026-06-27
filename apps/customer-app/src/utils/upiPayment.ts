import AsyncStorage from "@react-native-async-storage/async-storage";
import RazorpayCustom from "react-native-customui";

const PREFERRED_UPI_APP_KEY = "vyaha.preferredUpiApp";

export type UpiApp = {
  id: string;
  name: string;
  packageName: string;
  iconUrl?: string;
};

const RECOMMENDED_ORDER = [
  "google pay",
  "gpay",
  "phonepe",
  "paytm",
  "bhim",
  "whatsapp",
  "amazon pay",
  "navi",
  "supermoney",
  "cred",
  "mobikwik"
];

const normalizeUpiApp = (entry: Record<string, unknown>): UpiApp | null => {
  const packageName = String(
    entry.packageName || entry.package_name || entry.shortcode || entry.appPackage || ""
  ).trim();
  const name = String(entry.appName || entry.app_name || entry.name || entry.title || packageName).trim();

  if (!packageName) return null;

  return {
    id: packageName,
    name: name || packageName,
    packageName,
    iconUrl: typeof entry.image === "string" ? entry.image : undefined
  };
};

const sortUpiApps = (apps: UpiApp[]) => {
  const rank = (app: UpiApp) => {
    const label = app.name.toLowerCase();
    const index = RECOMMENDED_ORDER.findIndex((token) => label.includes(token));
    return index === -1 ? RECOMMENDED_ORDER.length + 1 : index;
  };

  return [...apps].sort((left, right) => {
    const leftRank = rank(left);
    const rightRank = rank(right);
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.name.localeCompare(right.name);
  });
};

const parseUpiAppsResponse = (payload: unknown): UpiApp[] => {
  const rawList = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown[] })?.data)
      ? (payload as { data: unknown[] }).data
      : [];

  const apps = rawList
    .map((entry) => normalizeUpiApp((entry || {}) as Record<string, unknown>))
    .filter((entry): entry is UpiApp => Boolean(entry));

  const unique = new Map<string, UpiApp>();
  apps.forEach((app) => unique.set(app.id, app));
  return sortUpiApps(Array.from(unique.values()));
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export const getInstalledUpiApps = async (): Promise<UpiApp[]> => {
  try {
    const payload = await RazorpayCustom.getAppsWhichSupportUPI();
    return parseUpiAppsResponse(payload);
  } catch {
    return [];
  }
};

export const loadPreferredUpiApp = async (): Promise<UpiApp | null> => {
  try {
    const raw = await AsyncStorage.getItem(PREFERRED_UPI_APP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UpiApp;
    if (!parsed?.packageName) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const savePreferredUpiApp = async (app: UpiApp) => {
  await AsyncStorage.setItem(PREFERRED_UPI_APP_KEY, JSON.stringify(app));
};

export const resolvePreferredUpiApp = async (apps: UpiApp[]) => {
  if (apps.length === 0) return null;

  const saved = await loadPreferredUpiApp();
  if (saved) {
    const matched = apps.find((app) => app.packageName === saved.packageName || app.id === saved.id);
    if (matched) return matched;
  }

  return apps[0];
};

export type UpiIntentPaymentInput = {
  keyId: string;
  amountPaise: number;
  orderId: string;
  razorpayOrderId: string;
  description: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  upiApp: UpiApp;
};

export type UpiIntentPaymentResult = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export const openUpiIntentPayment = async (input: UpiIntentPaymentInput): Promise<UpiIntentPaymentResult> => {
  await savePreferredUpiApp(input.upiApp);

  const options: Record<string, string | number> = {
    description: input.description,
    currency: "INR",
    key_id: input.keyId,
    amount: String(input.amountPaise),
    order_id: input.razorpayOrderId,
    contact: input.customerPhone || "",
    email: input.customerEmail || "",
    method: "upi",
    upi_app_package_name: input.upiApp.packageName,
    "_[flow]": "intent"
  };

  if (input.customerName) {
    options.name = input.customerName;
  }

  // Do not call initRazorpay or validateOptions here. The native module keeps a
  // separate Razorpay instance for those helpers, and calling them before it is
  // ready causes a NullPointerException. PaymentActivity creates its own client.
  const result = (await withTimeout(
    RazorpayCustom.open(options),
    180000,
    "Payment timed out. Complete payment in your UPI app or try again."
  )) as Record<string, string>;

  const paymentId = result.razorpay_payment_id || result.payment_id;
  const orderId = result.razorpay_order_id || input.razorpayOrderId;
  const signature = result.razorpay_signature || result.signature;

  if (!paymentId || !orderId || !signature) {
    throw new Error("Payment was not completed.");
  }

  return {
    razorpay_payment_id: paymentId,
    razorpay_order_id: orderId,
    razorpay_signature: signature
  };
};
