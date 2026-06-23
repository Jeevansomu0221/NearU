const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");

const requireFromApp = createRequire(path.join(process.cwd(), "package.json"));
const { withDangerousMod } = requireFromApp("@expo/config-plugins");

const VYAHA_RULES_MARKER = "# Vyaha shared ProGuard / R8 rules";
const SHARED_RULES_PATH = path.join(__dirname, "proguard-rules.vyaha.pro");

const withVyahaAndroidProguard = (config) => {
  return withDangerousMod(config, [
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
};

module.exports = withVyahaAndroidProguard;
