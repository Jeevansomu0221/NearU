const { createRequire } = require("module");
const path = require("path");

const requireFromApp = createRequire(path.join(process.cwd(), "package.json"));
const { withAndroidManifest, withInfoPlist } = requireFromApp("@expo/config-plugins");

const ANDROID_UPI_PACKAGES = [
  "com.google.android.apps.nbu.paisa.user",
  "com.phonepe.app",
  "net.one97.paytm",
  "in.org.npci.upiapp",
  "com.whatsapp",
  "in.amazon.mShop.android.shopping",
  "com.dreamplug.androidapp",
  "com.mobikwik_new",
  "com.naviapp",
  "com.supermoney.in",
  "money.super.payments",
  "com.groww.investments",
  "com.myairtelapp",
  "com.freecharge.android",
  "com.jio.myjio"
];

const IOS_UPI_SCHEMES = [
  "tez",
  "gpay",
  "phonepe",
  "paytmmp",
  "paytm",
  "bhim",
  "amazonpay",
  "whatsapp",
  "navi",
  "supermoney",
  "super",
  "credpay",
  "mobikwik",
  "freecharge",
  "myairtel",
  "slice-upi",
  "jupiter",
  "payzapp",
  "kiwi",
  "in.fampay.app",
  "popclubapp",
  "sbiyono",
  "myjio",
  "bobupi",
  "groww"
];

const ensureAndroidQueries = (manifest) => {
  if (!manifest.queries) {
    manifest.queries = [{}];
  }

  const queriesNode = Array.isArray(manifest.queries) ? manifest.queries[0] : manifest.queries;
  if (!queriesNode.package) {
    queriesNode.package = [];
  }

  const packages = Array.isArray(queriesNode.package) ? queriesNode.package : [queriesNode.package];
  const existing = new Set(
    packages
      .filter(Boolean)
      .map((entry) => entry.$?.["android:name"])
      .filter(Boolean)
  );

  ANDROID_UPI_PACKAGES.forEach((packageName) => {
    if (existing.has(packageName)) return;
    packages.push({ $: { "android:name": packageName } });
  });

  queriesNode.package = packages;

  // Intent-based visibility: lets PackageManager list EVERY app that handles
  // upi://pay (required on Android 11+ so Razorpay can detect all UPI apps,
  // not just the packages declared above).
  if (!queriesNode.intent) {
    queriesNode.intent = [];
  }
  const intents = Array.isArray(queriesNode.intent) ? queriesNode.intent : [queriesNode.intent];
  const hasUpiIntent = intents.some((intent) =>
    (Array.isArray(intent?.data) ? intent.data : [intent?.data])
      .filter(Boolean)
      .some((data) => data.$?.["android:scheme"] === "upi")
  );

  if (!hasUpiIntent) {
    intents.push({
      action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
      data: [{ $: { "android:scheme": "upi", "android:host": "pay" } }]
    });
  }

  queriesNode.intent = intents;
  manifest.queries = [queriesNode];
};

const withVyahaUpiIntent = (config) => {
  config = withAndroidManifest(config, (androidConfig) => {
    ensureAndroidQueries(androidConfig.modResults.manifest);
    return androidConfig;
  });

  config = withInfoPlist(config, (iosConfig) => {
    const existing = iosConfig.modResults.LSApplicationQueriesSchemes || [];
    const merged = Array.from(new Set([...existing, ...IOS_UPI_SCHEMES]));
    iosConfig.modResults.LSApplicationQueriesSchemes = merged;
    return iosConfig;
  });

  return config;
};

module.exports = withVyahaUpiIntent;
