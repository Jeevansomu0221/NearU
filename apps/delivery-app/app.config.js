const appJson = require("./app.json");

// Kept for optional native Google Maps / Directions. In-app preview uses OSM WebView
// so missing/restricted keys no longer blank the job map forever.
const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "";

if (!googleMapsApiKey) {
  console.warn(
    "[vyaha-delivery] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is empty. In-app map uses OpenStreetMap; external Google Maps navigation still works."
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
