const fs = require("fs");
const path = require("path");

const appRoot = process.cwd();
const appJsonPath = path.join(appRoot, "app.json");

if (!fs.existsSync(appJsonPath)) {
  console.error("Run this script from an Expo app folder (customer-app, delivery-app, or partner-app).");
  process.exit(1);
}

const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
const versionCode = appJson?.expo?.android?.versionCode;
const appName = appJson?.expo?.name || "app";
const mappingSrc = path.join(appRoot, "android", "app", "build", "outputs", "mapping", "release", "mapping.txt");
const outputDir = path.join(appRoot, "release-artifacts");
const mappingDest = path.join(outputDir, `mapping-v${versionCode}.txt`);

if (!fs.existsSync(mappingSrc)) {
  console.error(`mapping.txt not found for ${appName}.`);
  console.error("Build a release bundle first, for example:");
  console.error("  npx expo prebuild --platform android --clean");
  console.error("  cd android && ./gradlew bundleRelease");
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });
fs.copyFileSync(mappingSrc, mappingDest);

console.log(`Saved deobfuscation file for ${appName}:`);
console.log(mappingDest);
console.log("");
console.log("Upload it in Play Console:");
console.log("Test and release → App bundle explorer → select this version → Downloads → Assets → ProGuard mapping file");
