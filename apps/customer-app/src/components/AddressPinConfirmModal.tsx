import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AddressPinConfirmModalProps = {
  visible: boolean;
  addressLines: string[];
  formattedAddress?: string;
  latitude: number;
  longitude: number;
  confirming?: boolean;
  onConfirm: (pin: { latitude: number; longitude: number }) => void;
  onEdit: () => void;
};

const buildMapHtml = (latitude: number, longitude: number) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #F4EFE9; }
    .vyaha-pin {
      width: 18px; height: 18px; border-radius: 50%;
      background: #FF6B35; border: 3px solid #fff;
      box-shadow: 0 2px 8px rgba(26,18,11,.35);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map', { zoomControl: true, attributionControl: true }).setView([${latitude}, ${longitude}], 17);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    const marker = L.marker([${latitude}, ${longitude}], {
      draggable: true,
      icon: L.divIcon({
        className: '',
        html: '<div class="vyaha-pin"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      })
    }).addTo(map);
    const notify = () => {
      const point = marker.getLatLng();
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          latitude: point.lat,
          longitude: point.lng
        }));
      }
    };
    marker.on('dragend', notify);
    map.on('click', (event) => {
      marker.setLatLng(event.latlng);
      notify();
    });
  </script>
</body>
</html>`;

let MapWebView: any = null;
try {
  MapWebView = require("react-native-webview").WebView;
} catch {
  MapWebView = null;
}

export default function AddressPinConfirmModal({
  visible,
  addressLines,
  formattedAddress,
  latitude,
  longitude,
  confirming,
  onConfirm,
  onEdit
}: AddressPinConfirmModalProps) {
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState({ latitude, longitude });
  const [mapFailed, setMapFailed] = useState(!MapWebView);

  useEffect(() => {
    setPin({ latitude, longitude });
    setMapFailed(!MapWebView);
  }, [latitude, longitude]);
  const html = useMemo(() => buildMapHtml(latitude, longitude), [latitude, longitude]);
  const staticMapUri = `https://staticmap.openstreetmap.de/staticmap.php?center=${pin.latitude},${pin.longitude}&zoom=17&size=640x420&markers=${pin.latitude},${pin.longitude},orangered-pushpin`;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onEdit}>
      <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.title}>Confirm delivery pin</Text>
        <Text style={styles.subtitle}>
          Check that this pin matches your address. Drag it on the map if you need to adjust.
        </Text>

        <View style={styles.mapCard}>
          {MapWebView && !mapFailed ? (
            <MapWebView
              originWhitelist={["*"]}
              source={{ html }}
              style={styles.map}
              onMessage={(event: any) => {
                try {
                  const next = JSON.parse(event.nativeEvent.data);
                  if (Number.isFinite(next.latitude) && Number.isFinite(next.longitude)) {
                    setPin({ latitude: next.latitude, longitude: next.longitude });
                  }
                } catch {
                  // Ignore malformed map messages.
                }
              }}
              onError={() => setMapFailed(true)}
              onHttpError={() => setMapFailed(true)}
            />
          ) : (
            <Image source={{ uri: staticMapUri }} style={styles.map} resizeMode="cover" />
          )}
        </View>

        <View style={styles.addressCard}>
          {addressLines.map((line) => (
            <Text key={line} style={styles.addressLine}>
              {line}
            </Text>
          ))}
          {formattedAddress ? <Text style={styles.mappedLine}>{formattedAddress}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.confirmButton, confirming && styles.buttonDisabled]}
          onPress={() => onConfirm(pin)}
          disabled={confirming}
        >
          {confirming ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>Yes, this is my address</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.editButton} onPress={onEdit} disabled={confirming}>
          <Text style={styles.editButtonText}>Edit address</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F3EE",
    paddingHorizontal: 18
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A120B"
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 19,
    color: "#7A6F65"
  },
  mapCard: {
    height: 280,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#E8E0D6",
    borderWidth: 1,
    borderColor: "#E7DED4"
  },
  map: {
    width: "100%",
    height: "100%"
  },
  addressCard: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEE6DE"
  },
  addressLine: {
    fontSize: 14,
    lineHeight: 20,
    color: "#241D17",
    fontWeight: "600"
  },
  mappedLine: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: "#8A7F75"
  },
  confirmButton: {
    marginTop: 18,
    backgroundColor: "#FF6B35",
    borderRadius: 16,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center"
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  },
  buttonDisabled: {
    opacity: 0.7
  },
  editButton: {
    marginTop: 10,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  editButtonText: {
    color: "#7A6F65",
    fontSize: 14,
    fontWeight: "700"
  }
});
