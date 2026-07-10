import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules } from "react-native";
import RazorpayCheckout from "react-native-razorpay";
import RazorpayCustom from "react-native-customui";

const PREFERRED_UPI_APP_KEY = "vyaha.preferredUpiApp";

const hasStandardRazorpayModule = () => Boolean(NativeModules.RNRazorpayCheckout?.open);
const hasCustomRazorpayModule = () => Boolean(NativeModules.RazorpayCustomui?.open);

export type UpiApp = {
  id: string;
  name: string;
  packageName: string;
  iconUrl?: string;
  source?: "detected" | "fallback";
};

const KNOWN_UPI_APPS: UpiApp[] = [
  { id: "com.google.android.apps.nbu.paisa.user", name: "Google Pay", packageName: "com.google.android.apps.nbu.paisa.user", source: "fallback" },
  { id: "com.phonepe.app", name: "PhonePe", packageName: "com.phonepe.app", source: "fallback" },
  { id: "net.one97.paytm", name: "Paytm", packageName: "net.one97.paytm", source: "fallback" },
  { id: "in.org.npci.upiapp", name: "BHIM", packageName: "in.org.npci.upiapp", source: "fallback" },
  { id: "com.whatsapp", name: "WhatsApp", packageName: "com.whatsapp", source: "fallback" },
  { id: "in.amazon.mShop.android.shopping", name: "Amazon Pay", packageName: "in.amazon.mShop.android.shopping", source: "fallback" },
  { id: "money.super.payments", name: "super.money", packageName: "money.super.payments", source: "fallback" },
  { id: "com.naviapp", name: "Navi UPI", packageName: "com.naviapp", source: "fallback" },
  { id: "com.dreamplug.androidapp", name: "CRED", packageName: "com.dreamplug.androidapp", source: "fallback" },
  { id: "com.mobikwik_new", name: "MobiKwik", packageName: "com.mobikwik_new", source: "fallback" },
  { id: "com.freecharge.android", name: "Freecharge", packageName: "com.freecharge.android", source: "fallback" },
  { id: "com.myairtelapp", name: "Airtel Thanks", packageName: "com.myairtelapp", source: "fallback" },
  { id: "com.jio.myjio", name: "MyJio", packageName: "com.jio.myjio", source: "fallback" }
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

const normalizeUpiApp = (entry: Record<string, unknown>, source: UpiApp["source"] = "detected"): UpiApp | null => {
  const packageName = String(
    entry.packageName || entry.package_name || entry.shortcode || entry.appPackage || ""
  ).trim();
  const name = String(entry.appName || entry.app_name || entry.name || entry.title || packageName).trim();

  if (!packageName) return null;

  return {
    id: packageName,
    name: name || packageName,
    packageName,
    source,
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
    merged.set(app.packageName, existing ? { ...existing, ...app, name: app.name || existing.name, source: app.source || existing.source } : app);
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
    .map((entry) => normalizeUpiApp((entry || {}) as Record<string, unknown>, "detected"))
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

let razorpayCustomInitKey: string | null = null;
let razorpayCustomInitPromise: Promise<void> | null = null;

const ensureRazorpayCustomInitialized = async (keyId: string) => {
  if (!hasCustomRazorpayModule()) return;

  if (razorpayCustomInitKey === keyId && razorpayCustomInitPromise) {
    await razorpayCustomInitPromise;
    return;
  }

  razorpayCustomInitKey = keyId;
  razorpayCustomInitPromise = RazorpayCustom.initRazorpay(keyId);
  await razorpayCustomInitPromise;
};

const detectUpiAppsOnce = async (): Promise<UpiApp[]> => {
  const payload = await withTimeout(
    RazorpayCustom.getAppsWhichSupportUPI(),
    8000,
    "Timed out while detecting UPI apps."
  );
  return parseUpiAppsResponse(payload);
};

let upiDetectionQueue = Promise.resolve();

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
  upiApp?: UpiApp | null;
};

export type UpiIntentPaymentResult = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export const formatRazorpayContact = (phone?: string) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return "";
};

const normalizePaymentSuccess = (result: Record<string, string>, fallbackOrderId: string): UpiIntentPaymentResult => {
  const paymentId = result.razorpay_payment_id || result.payment_id;
  const orderId = result.razorpay_order_id || fallbackOrderId;
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

const openStandardUpiCheckout = async (input: UpiIntentPaymentInput): Promise<UpiIntentPaymentResult> => {
  if (!hasStandardRazorpayModule()) {
    throw new Error("STANDARD_RAZORPAY_UNAVAILABLE");
  }

  const contact = formatRazorpayContact(input.customerPhone);
  const prefill: { name?: string; email?: string; contact?: string } = {};

  if (input.customerName) prefill.name = input.customerName;
  if (input.customerEmail) prefill.email = input.customerEmail;
  if (contact) prefill.contact = contact;

  const result = await RazorpayCheckout.open({
    key: input.keyId,
    amount: input.amountPaise,
    currency: "INR",
    name: "Vyaha",
    description: input.description,
    order_id: input.razorpayOrderId,
    prefill,
    theme: { color: "#FF6B35" },
    method: {
      upi: true,
      card: false,
      netbanking: false,
      wallet: false
    }
  });

  return normalizePaymentSuccess(result as unknown as Record<string, string>, input.razorpayOrderId);
};

const resolvePaymentUpiApp = async (selected?: UpiApp | null) => {
  if (!selected?.packageName) {
    throw new Error("Please choose a UPI app before paying.");
  }

  const apps = await getInstalledUpiApps();
  const matched = apps.find(
    (app) =>
      app.packageName === selected.packageName ||
      app.id === selected.id ||
      app.name.toLowerCase() === selected.name.toLowerCase()
  );

  return matched || selected;
};

const openCustomUpiIntent = async (input: UpiIntentPaymentInput, upiApp: UpiApp): Promise<UpiIntentPaymentResult> => {
  if (!hasCustomRazorpayModule()) {
    throw new Error("CUSTOM_RAZORPAY_UNAVAILABLE");
  }

  await ensureRazorpayCustomInitialized(input.keyId);

  const contact = formatRazorpayContact(input.customerPhone);
  const options: Record<string, string | number> = {
    description: input.description,
    currency: "INR",
    key_id: input.keyId,
    amount: String(input.amountPaise),
    order_id: input.razorpayOrderId,
    method: "upi",
    upi_app_package_name: upiApp.packageName,
    "_[flow]": "intent"
  };

  if (contact) options.contact = contact;
  if (input.customerEmail) options.email = input.customerEmail;

  const result = (await withTimeout(
    RazorpayCustom.open(options),
    180000,
    "Payment timed out. Complete payment in your UPI app or try again."
  )) as Record<string, string>;

  return normalizePaymentSuccess(result, input.razorpayOrderId);
};

export const openUpiIntentPayment = async (input: UpiIntentPaymentInput): Promise<UpiIntentPaymentResult> => {
  if (input.upiApp) {
    await savePreferredUpiApp(input.upiApp);
  }

  if (input.upiApp && hasCustomRazorpayModule()) {
    try {
      const upiApp = await resolvePaymentUpiApp(input.upiApp);
      return await openCustomUpiIntent(input, upiApp);
    } catch (error) {
      const message = describeRazorpayPaymentError(error);
      if (message.toLowerCase().includes("cancel")) {
        throw error;
      }
      console.warn("[upiPayment] Custom UPI intent failed, trying standard checkout:", error);
    }
  }

  if (hasStandardRazorpayModule()) {
    try {
      return await openStandardUpiCheckout(input);
    } catch (error) {
      const message = describeRazorpayPaymentError(error);
      if (!hasCustomRazorpayModule() || message.toLowerCase().includes("cancel")) {
        throw error;
      }
      console.warn("[upiPayment] Standard checkout failed, trying custom UPI intent:", error);
    }
  }

  if (hasCustomRazorpayModule()) {
    const upiApp = await resolvePaymentUpiApp(input.upiApp);
    return openCustomUpiIntent(input, upiApp);
  }

  throw new Error(
    "Online payment is unavailable in this app build. Reinstall the latest Vyaha build, then try again."
  );
};

export const prepareCheckoutUpiSelection = async () => {
  const apps = await getInstalledUpiApps();
  const selected = await resolvePreferredUpiApp(apps);
  return { apps, selected };
};

export const describeRazorpayPaymentError = (error: unknown) => {
  const payload = error as {
    description?: string;
    message?: string;
    reason?: string;
    code?: string | number;
    error?: { description?: string; code?: string | number; reason?: string };
  };

  const candidates = [
    payload?.description,
    payload?.error?.description,
    payload?.message,
    payload?.reason
  ].filter(Boolean) as string[];

  let rawMessage = "";
  for (const candidate of candidates) {
    const text = String(candidate).trim();
    if (!text) continue;

    if (text.startsWith("{")) {
      try {
        const parsed = JSON.parse(text) as { error?: { description?: string; reason?: string } };
        rawMessage = parsed?.error?.description || parsed?.error?.reason || text;
        break;
      } catch {
        rawMessage = text;
        break;
      }
    }

    rawMessage = text;
    break;
  }

  const code = String(payload?.code || payload?.error?.code || "");
  const normalizedMessage = rawMessage.toLowerCase();

  if (code === "0" || normalizedMessage.includes("cancel") || normalizedMessage.includes("back button")) {
    return "Payment was cancelled before it was completed.";
  }

  if (normalizedMessage.includes("open") && normalizedMessage.includes("null")) {
    return "This app build is missing the Razorpay payment module. Reinstall the latest Vyaha build.";
  }

  if (normalizedMessage.includes("not required and should not be sent")) {
    return "Payment could not start because of invalid checkout fields. Please try again.";
  }

  if (rawMessage) {
    return rawMessage;
  }

  if (String((error as Error)?.message || "").includes("STANDARD_RAZORPAY_UNAVAILABLE")) {
    return "This app build is missing the standard Razorpay module. Reinstall the latest Vyaha build.";
  }

  return "Online payment did not complete.";
};
