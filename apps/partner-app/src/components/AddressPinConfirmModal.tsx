import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GooglePinMap from "./GooglePinMap";

type AddressPinConfirmModalProps = {
  visible: boolean;
  addressLines: string[];
  latitude: number;
  longitude: number;
  confirming?: boolean;
  onConfirm: (pin: { latitude: number; longitude: number }) => void;
  onEdit: () => void;
};

const TILE_SIZE = 256;
const MAP_ZOOM = 18;
const TILE_SPAN = 3;

const latLngToTile = (latitude: number, longitude: number, zoom: number) => {
  const n = 2 ** zoom;
  const x = ((longitude + 180) / 360) * n;
  const latRad = (latitude * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
};

const tileToLatLng = (x: number, y: number, zoom: number) => {
  const n = 2 ** zoom;
  const longitude = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  return { latitude: (latRad * 180) / Math.PI, longitude };
};

const tileUrl = (x: number, y: number, zoom: number) => {
  const n = 2 ** zoom;
  const tx = ((x % n) + n) % n;
  return `https://basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${tx}/${y}@2x.png`;
};

function GoogleMapOrFallback({
  latitude,
  longitude,
  onPinChange
}: {
  latitude: number;
  longitude: number;
  onPinChange: (pin: { latitude: number; longitude: number }) => void;
}) {
  const [mode, setMode] = useState<"google" | "fallback">("google");
  const readyRef = React.useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!readyRef.current) setMode("fallback");
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  if (mode === "fallback") {
    return <PannablePinMap latitude={latitude} longitude={longitude} onPinChange={onPinChange} />;
  }

  return (
    <GooglePinMap
      latitude={latitude}
      longitude={longitude}
      onPinChange={onPinChange}
      onReady={() => {
        readyRef.current = true;
      }}
    />
  );
}

function PannablePinMap({
  latitude,
  longitude,
  onPinChange
}: {
  latitude: number;
  longitude: number;
  onPinChange: (pin: { latitude: number; longitude: number }) => void;
}) {
  const [center, setCenter] = useState({ latitude, longitude });
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [viewportWidth, setViewportWidth] = useState(360);

  useEffect(() => {
    setCenter({ latitude, longitude });
    setDrag({ x: 0, y: 0 });
  }, [latitude, longitude]);

  const tiles = useMemo(() => {
    const point = latLngToTile(center.latitude, center.longitude, MAP_ZOOM);
    const originX = Math.floor(point.x) - 1;
    const originY = Math.floor(point.y) - 1;
    const items = [];
    for (let row = 0; row < TILE_SPAN; row += 1) {
      for (let col = 0; col < TILE_SPAN; col += 1) {
        const x = originX + col;
        const y = originY + row;
        items.push({
          key: `${MAP_ZOOM}-${x}-${y}`,
          uri: tileUrl(x, y, MAP_ZOOM),
          left: col * TILE_SIZE,
          top: row * TILE_SIZE
        });
      }
    }
    return {
      items,
      offsetX: (point.x - originX) * TILE_SIZE,
      offsetY: (point.y - originY) * TILE_SIZE
    };
  }, [center.latitude, center.longitude]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gesture) => {
          setDrag({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: (_, gesture) => {
          const point = latLngToTile(center.latitude, center.longitude, MAP_ZOOM);
          const next = tileToLatLng(
            point.x - gesture.dx / TILE_SIZE,
            point.y - gesture.dy / TILE_SIZE,
            MAP_ZOOM
          );
          setDrag({ x: 0, y: 0 });
          setCenter(next);
          onPinChange(next);
        }
      }),
    [center.latitude, center.longitude, onPinChange]
  );

  return (
    <View
      style={styles.mapViewport}
      onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
    >
      <View
        style={[
          styles.tileLayer,
          {
            width: TILE_SIZE * TILE_SPAN,
            height: TILE_SIZE * TILE_SPAN,
            transform: [
              { translateX: viewportWidth / 2 - tiles.offsetX + drag.x },
              { translateY: 140 - tiles.offsetY + drag.y }
            ]
          }
        ]}
      >
        {tiles.items.map((tile) => (
          <Image
            key={tile.key}
            source={{ uri: tile.uri }}
            style={[styles.tile, { left: tile.left, top: tile.top }]}
          />
        ))}
      </View>
      <View pointerEvents="none" style={styles.pinWrap}>
        <View style={styles.pinDot} />
        <View style={styles.pinStem} />
      </View>
      <View pointerEvents="none" style={styles.mapHint}>
        <Text style={styles.mapHintText}>Drag the map to place the pin</Text>
      </View>
    </View>
  );
}

export default function AddressPinConfirmModal({
  visible,
  addressLines,
  latitude,
  longitude,
  confirming,
  onConfirm,
  onEdit
}: AddressPinConfirmModalProps) {
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState({ latitude, longitude });

  useEffect(() => {
    setPin({ latitude, longitude });
  }, [latitude, longitude]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onEdit}>
      <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.title}>Confirm shop pin</Text>
        <Text style={styles.subtitle}>
          Place the pin on your shop. Drag the map until the orange pin sits on the entrance or building.
        </Text>

        <View style={styles.mapCard}>
          {Number.isFinite(latitude) && Number.isFinite(longitude) ? (
            <GoogleMapOrFallback latitude={latitude} longitude={longitude} onPinChange={setPin} />
          ) : (
            <View style={styles.mapFallback}>
              <ActivityIndicator color="#FF6B35" />
            </View>
          )}
        </View>

        <View style={styles.addressCard}>
          <Text style={styles.addressLabel}>Shop address</Text>
          {addressLines.map((line) => (
            <Text key={line} style={styles.addressLine}>
              {line}
            </Text>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.confirmButton, confirming && styles.buttonDisabled]}
          onPress={() => onConfirm(pin)}
          disabled={confirming}
        >
          {confirming ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>Yes, this is my shop</Text>
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
    backgroundColor: "#D9E2EC",
    borderWidth: 1,
    borderColor: "#E7DED4"
  },
  mapViewport: {
    width: "100%",
    height: 280
  },
  tileLayer: {
    position: "absolute"
  },
  tile: {
    position: "absolute",
    width: TILE_SIZE,
    height: TILE_SIZE
  },
  pinWrap: {
    position: "absolute",
    left: "50%",
    top: 140,
    marginLeft: -12,
    marginTop: -28,
    alignItems: "center"
  },
  pinDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FF6B35",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#1A120B",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4
  },
  pinStem: {
    width: 3,
    height: 10,
    backgroundColor: "#FF6B35",
    marginTop: -2
  },
  mapHint: {
    position: "absolute",
    alignSelf: "center",
    bottom: 10,
    backgroundColor: "rgba(26,18,11,0.72)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  mapHintText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700"
  },
  mapFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  addressCard: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEE6DE"
  },
  addressLabel: {
    marginBottom: 6,
    fontSize: 11,
    fontWeight: "800",
    color: "#9A8F85",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  addressLine: {
    fontSize: 14,
    lineHeight: 20,
    color: "#241D17",
    fontWeight: "600"
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
