const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Delivery app is native-only (Android/iOS). Do not serve web bundles.
config.resolver.platforms = ["ios", "android", "native"];

const previousEnhanceMiddleware = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const base = previousEnhanceMiddleware
      ? previousEnhanceMiddleware(middleware, server)
      : middleware;

    return (req, res, next) => {
      const url = req.url || "";
      if (url.includes("platform=web")) {
        // Avoid noisy "Unable to resolve react-native-web" when Cursor/browser probes Expo.
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Web is disabled for the delivery app. Use an Android device or emulator.");
        return;
      }
      return base(req, res, next);
    };
  }
};

module.exports = config;
