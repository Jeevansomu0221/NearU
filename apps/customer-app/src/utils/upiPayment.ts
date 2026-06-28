import AsyncStorage from "@react-native-async-storage/async-storage";
import RazorpayCustom from "react-native-customui";

const PREFERRED_UPI_APP_KEY = "vyaha.preferredUpiApp";

export type UpiApp = {
  id: string;
  name: string;
  packageName: string;
  iconUrl?: string;
};

const KNOWN_UPI_APPS: UpiApp[] = [
  { id: "com.google.android.apps.nbu.paisa.user", name: "Google Pay", packageName: "com.google.android.apps.nbu.paisa.user" },
  { id: "com.phonepe.app", name: "PhonePe", packageName: "com.phonepe.app" },
  { id: "net.one97.paytm", name: "Paytm", packageName: "net.one97.paytm" },
  { id: "in.org.npci.upiapp", name: "BHIM", packageName: "in.org.npci.upiapp" },
  { id: "com.whatsapp", name: "WhatsApp", packageName: "com.whatsapp" },
  { id: "in.amazon.mShop.android.shopping", name: "Amazon Pay", packageName: "in.amazon.mShop.android.shopping" },
  { id: "money.super.payments", name: "super.money", packageName: "money.super.payments" },
  { id: "com.naviapp", name: "Navi UPI", packageName: "com.naviapp" },
  { id: "com.dreamplug.androidapp", name: "CRED", packageName: "com.dreamplug.androidapp" },
  { id: "com.mobikwik_new", name: "MobiKwik", packageName: "com.mobikwik_new" },
  { id: "com.freecharge.android", name: "Freecharge", packageName: "com.freecharge.android" },
  { id: "com.myairtelapp", name: "Airtel Thanks", packageName: "com.myairtelapp" },
  { id: "com.jio.myjio", name: "MyJio", packageName: "com.jio.myjio" }
];

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
  "super.money",
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
    iconUrl: typeof entry.image === "string" ? entry.image : typeof entry.appLogo === "string" ? entry.appLogo : undefined
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

const mergeUpiApps = (...groups: UpiApp[][]) => {
  const merged = new Map<string, UpiApp>();

  groups.flat().forEach((app) => {
    const existing = merged.get(app.packageName);
    merged.set(app.packageName, existing ? { ...existing, ...app, name: app.name || existing.name } : app);
  });

  return sortUpiApps(Array.from(merged.values()));
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

  return mergeUpiApps(apps);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

let upiDetectionQueue = Promise.resolve();

const detectUpiAppsOnce = async (): Promise<UpiApp[]> => {
  const payload = await withTimeout(
    RazorpayCustom.getAppsWhichSupportUPI(),
    8000,
    "Timed out while detecting UPI apps."
  );
  return parseUpiAppsResponse(payload);
};

const runUpiDetection = async () => {
  upiDetectionQueue = upiDetectionQueue.then(async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const detected = await detectUpiAppsOnce();
        if (detected.length > 0) {
          return mergeUpiApps(detected, KNOWN_UPI_APPS);
        }
      } catch (error) {
        lastError = error;
      }

      if (attempt < 2) {
        await sleep(350);
      }
    }

    if (lastError) {
      console.warn("[upiPayment] UPI detection failed, using fallback list:", lastError);
    }

    return mergeUpiApps(KNOWN_UPI_APPS);
  });

  return upiDetectionQueue;
};

export const getInstalledUpiApps = async (): Promise<UpiApp[]> => runUpiDetection();

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
  const saved = await loadPreferredUpiApp();
  if (saved) {
    const matched = apps.find((app) => app.packageName === saved.packageName || app.id === saved.id);
    if (matched) return matched;
    return saved;
  }

  return apps[0] || null;
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

export const prepareCheckoutUpiSelection = async () => {
  const apps = await getInstalledUpiApps();
  const selected = await resolvePreferredUpiApp(apps);
  return { apps, selected };
};
