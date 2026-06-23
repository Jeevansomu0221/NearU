const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");

const requireFromApp = createRequire(path.join(process.cwd(), "package.json"));
const { withAppBuildGradle, withDangerousMod } = requireFromApp("@expo/config-plugins");

const VYAHA_RULES_MARKER = "# Vyaha shared ProGuard / R8 rules";
const SHARED_RULES_PATH = path.join(__dirname, "proguard-rules.vyaha.pro");

const withVyahaAndroidProguard = (config) => {
  config = withDangerousMod(config, [
    "android",
    async (androidConfig) => {
      const appDir = path.join(androidConfig.modRequest.platformProjectRoot, "app");
      const destination = path.join(appDir, "proguard-rules.pro");
      const sharedRules = fs.readFileSync(SHARED_RULES_PATH, "utf8");
      const existing = fs.existsSync(destination) ? fs.readFileSync(destination, "utf8") : "";

      if (!existing.includes(VYAHA_RULES_MARKER)) {
        const prefix = existing.trim() ? `${existing.trim()}\n\n` : "";
        fs.writeFileSync(destination, `${prefix}${VYAHA_RULES_MARKER}\n${sharedRules}\n`);
      }

      return androidConfig;
    }
  ]);

  return withAppBuildGradle(config, (androidConfig) => {
    let contents = androidConfig.modResults.contents;

    if (!contents.includes("mappingFileUploadEnabled")) {
      contents = contents.replace(
        /release\s*\{/,
        `release {
            firebaseCrashlytics {
                mappingFileUploadEnabled true
            }`
      );
    }

    if (!contents.includes("proguard-rules.pro")) {
      contents = contents.replace(
        /release\s*\{([\s\S]*?)(\n\s*\})/,
        (match, body, closing) => {
          if (body.includes("proguardFiles")) {
            return match;
          }

          return `release {${body}
            proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"${closing}`;
        }
      );
    }

    androidConfig.modResults.contents = contents;
    return androidConfig;
  });
};

module.exports = withVyahaAndroidProguard;
