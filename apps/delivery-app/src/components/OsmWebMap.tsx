import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import type { LatLng, MapPin } from "../utils/mapCoordinates";

type Props = {
  height: number;
  pins: MapPin[];
  routeCoords: LatLng[];
  onReady?: () => void;
  onError?: () => void;
};

const pinColorHex = (kind: MapPin["kind"]) => {
  if (kind === "rider") return "#1976D2";
  if (kind === "pickup") return "#2E7D32";
  return "#E65100";
};

const buildMapHtml = (pins: MapPin[], routeCoords: LatLng[]) => {
  const markers = pins.map((pin) => ({
    id: pin.id,
    lat: pin.coordinate.latitude,
    lng: pin.coordinate.longitude,
    title: pin.title || pin.kind,
    color: pinColorHex(pin.kind)
  }));

  const route = routeCoords.map((point) => [point.latitude, point.longitude]);

  // Inline Leaflet from CDN so the preview works without Google Maps SDK / API key.
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #E8EEF5; }
    .vyaha-pin {
      width: 16px; height: 16px; border-radius: 50%;
      border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,.35);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const markers = ${JSON.stringify(markers)};
    const route = ${JSON.stringify(route)};
    const map = L.map('map', { zoomControl: false, attributionControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const bounds = [];
    window.__markers = {};
    window.__map = map;
    markers.forEach((m) => {
      const icon = L.divIcon({
        className: '',
        html: '<div class="vyaha-pin" style="background:' + m.color + '"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      window.__markers[m.id] = L.marker([m.lat, m.lng], { icon }).addTo(map).bindPopup(m.title || '');
      bounds.push([m.lat, m.lng]);
    });
    window.__updatePin = function(id, lat, lng, title, color) {
      if (window.__markers[id]) {
        window.__markers[id].setLatLng([lat, lng]);
        return;
      }
      const icon = L.divIcon({
        className: '',
        html: '<div class="vyaha-pin" style="background:' + (color || '#1976D2') + '"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      window.__markers[id] = L.marker([lat, lng], { icon }).addTo(map).bindPopup(title || 'You');
    };

    if (route.length > 1) {
      L.polyline(route, { color: '#1A73E8', weight: 4, opacity: 0.9 }).addTo(map);
      route.forEach((p) => bounds.push(p));
    }

    if (bounds.length === 0) {
      map.setView([17.385, 78.4867], 12);
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 15);
    } else {
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    setTimeout(function () { map.invalidateSize(); }, 120);
    true;
  </script>
</body>
</html>`;
};

export default function OsmWebMap({ height, pins, routeCoords, onReady, onError }: Props) {
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const riderPin = pins.find((pin) => pin.kind === "rider");
  const staticPins = pins.filter((pin) => pin.kind !== "rider");

  // Remount only when destination/route change. Live rider moves are injected.
  const contentKey = useMemo(
    () =>
      JSON.stringify({
        pins: staticPins.map((p) => [
          p.id,
          Number(p.coordinate.latitude.toFixed(5)),
          Number(p.coordinate.longitude.toFixed(5))
        ]),
        route: routeCoords.map((p) => [
          Number(p.latitude.toFixed(5)),
          Number(p.longitude.toFixed(5))
        ])
      }),
    [staticPins, routeCoords]
  );
  const html = useMemo(() => buildMapHtml(pins, routeCoords), [contentKey]);

  useEffect(() => {
    if (!ready || !riderPin || !webRef.current) return;
    const { latitude, longitude } = riderPin.coordinate;
    webRef.current.injectJavaScript(`
      (function() {
        if (window.__updatePin) {
          window.__updatePin('rider', ${latitude}, ${longitude}, ${JSON.stringify(riderPin.title || "You")}, '#1976D2');
        }
        true;
      })();
    `);
  }, [ready, riderPin?.coordinate.latitude, riderPin?.coordinate.longitude, riderPin?.title]);

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        ref={webRef}
        key={contentKey}
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.webview}
        onLoadStart={() => {
          if (!hasLoadedOnceRef.current) {
            setReady(false);
          }
        }}
        onLoadEnd={() => {
          hasLoadedOnceRef.current = true;
          setReady(true);
          onReady?.();
        }}
        onError={() => onError?.()}
        onHttpError={() => onError?.()}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback
      />
      {!ready ? (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator size="large" color="#0F9D58" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    backgroundColor: "#E8EEF5",
    overflow: "hidden"
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent"
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8EEF5"
  }
});
