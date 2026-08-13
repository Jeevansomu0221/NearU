const appJson = require("./app.json");

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "";

if (!googleMapsApiKey) {
  console.warn(
    "[vyaha-customer] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is empty. In-app Google Maps will fall back until the key is set."
  );
}

module.exports = {
  expo: {
    ...appJson.expo,
    ios: {
      ...appJson.expo.ios,
      config: {
        ...(appJson.expo.ios?.config || {}),
        googleMapsApiKey
      }
    },
    android: {
      ...appJson.expo.android,
      config: {
        ...(appJson.expo.android?.config || {}),
        googleMaps: {
          apiKey: googleMapsApiKey
        }
      }
    }
  }
};
