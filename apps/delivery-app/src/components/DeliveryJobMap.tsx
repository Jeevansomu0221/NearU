import React, { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fetchDrivingRoute } from "../utils/directions";
import type { LatLng } from "../utils/mapCoordinates";

export type MapPin = {
  id: string;
  coordinate: LatLng;
  title?: string;
  kind: "rider" | "pickup" | "drop";
};

type Props = {
  riderLocation?: LatLng | null;
  destination?: LatLng | null;
  pins?: MapPin[];
  onOpenExternalMaps: () => void;
  height?: number;
};

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const DEFAULT_REGION: Region = {
  latitude: 17.385,
  longitude: 78.4867,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08
};

const MAP_READY_TIMEOUT_MS = 5000;
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "";

const pinColor = (kind: MapPin["kind"]) => {
  if (kind === "rider") return "#1976D2";
  if (kind === "pickup") return "#2E7D32";
  return "#E65100";
};

const hasNativeMapView = () => {
  if (Platform.OS === "web") return false;

  try {
    const config =
      UIManager.getViewManagerConfig?.("AIRMap") ||
      UIManager.getViewManagerConfig?.("RNMapsMapView") ||
      // Older RN helpers
      (UIManager as any).AIRMap ||
      (UIManager as any).RNMapsMapView;
    return Boolean(config);
  } catch {
    return false;
  }
};

/** Android Google Maps tiles need a valid API key; without one MapView stays white forever. */
const canRenderGoogleTiles = () => {
  if (Platform.OS !== "android") return true;
  return Boolean(GOOGLE_MAPS_API_KEY);
};

type MapsModule = {
  default: React.ComponentType<any>;
  Marker: React.ComponentType<any>;
  Polyline: React.ComponentType<any>;
  PROVIDER_GOOGLE?: string;
};

let cachedMapsModule: MapsModule | null | undefined;

const getMapsModule = (): MapsModule | null => {
  if (cachedMapsModule !== undefined) return cachedMapsModule;
  if (!hasNativeMapView()) {
    cachedMapsModule = null;
    return null;
  }

  try {
    cachedMapsModule = require("react-native-maps") as MapsModule;
    return cachedMapsModule;
  } catch {
    cachedMapsModule = null;
    return null;
  }
};

class MapErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("DeliveryJobMap failed to render native map:", error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function MapFallback({
  height,
  onOpenExternalMaps,
  message
}: {
  height: number;
  onOpenExternalMaps: () => void;
  message: string;
}) {
  return (
    <View style={[styles.wrap, styles.fallbackWrap, { height }]}>
      <Ionicons name="map-outline" size={36} color="#64748B" />
      <Text style={styles.fallbackTitle}>Map preview unavailable</Text>
      <Text style={styles.fallbackText}>{message}</Text>
      <TouchableOpacity style={styles.fallbackMapsButton} onPress={onOpenExternalMaps} activeOpacity={0.85}>
        <Ionicons name="navigate" size={18} color="#FFFFFF" />
        <Text style={styles.fallbackMapsLabel}>Open in Google Maps</Text>
      </TouchableOpacity>
    </View>
  );
}

function NativeDeliveryJobMap({
  riderLocation,
  destination,
  pins = [],
  onOpenExternalMaps,
  height = 280,
  maps
}: Props & { maps: MapsModule }) {
  const MapView = maps.default;
  const Marker = maps.Marker;
  const Polyline = maps.Polyline;
  const mapRef = useRef<any>(null);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const markers = useMemo(() => {
    const list = [...pins];
    if (riderLocation) {
      const hasRider = list.some((pin) => pin.kind === "rider");
      if (!hasRider) {
        list.unshift({
          id: "rider",
          coordinate: riderLocation,
          title: "You",
          kind: "rider"
        });
      }
    }
    return list;
  }, [pins, riderLocation]);

  const fitCoordinates = useMemo(() => {
    const coords = [
      ...markers.map((marker) => marker.coordinate),
      ...(destination ? [destination] : []),
      ...(riderLocation ? [riderLocation] : [])
    ];

    return coords.filter(
      (point, index, arr) =>
        arr.findIndex(
          (candidate) =>
            candidate.latitude === point.latitude && candidate.longitude === point.longitude
        ) === index
    );
  }, [markers, destination, riderLocation]);

  useEffect(() => {
    let cancelled = false;

    const loadRoute = async () => {
      if (!riderLocation || !destination) {
        setRouteCoords([]);
        setLoadingRoute(false);
        return;
      }

      setLoadingRoute(true);
      try {
        const route = await fetchDrivingRoute(riderLocation, destination);
        if (!cancelled) {
          setRouteCoords(route || [riderLocation, destination]);
        }
      } finally {
        if (!cancelled) {
          setLoadingRoute(false);
        }
      }
    };

    void loadRoute();
    return () => {
      cancelled = true;
    };
  }, [riderLocation?.latitude, riderLocation?.longitude, destination?.latitude, destination?.longitude]);

  useEffect(() => {
    if (mapReady) return;

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, MAP_READY_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [mapReady]);

  useEffect(() => {
    if (!mapRef.current || !mapReady || fitCoordinates.length === 0) return;

    if (fitCoordinates.length === 1) {
      mapRef.current.animateToRegion?.(
        {
          ...fitCoordinates[0],
          latitudeDelta: 0.02,
          longitudeDelta: 0.02
        },
        350
      );
      return;
    }

    mapRef.current.fitToCoordinates?.(fitCoordinates, {
      edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
      animated: true
    });
  }, [fitCoordinates, mapReady]);

  if (timedOut && !mapReady) {
    return (
      <MapFallback
        height={height}
        onOpenExternalMaps={onOpenExternalMaps}
        message="The in-app map could not load. Use Google Maps to navigate to this stop."
      />
    );
  }

  const initialRegion =
    fitCoordinates.length > 0
      ? {
          ...fitCoordinates[0],
          latitudeDelta: 0.04,
          longitudeDelta: 0.04
        }
      : DEFAULT_REGION;

  const useGoogleProvider = Platform.OS === "android" && Boolean(maps.PROVIDER_GOOGLE) && Boolean(GOOGLE_MAPS_API_KEY);

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={useGoogleProvider ? maps.PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        loadingEnabled={!mapReady}
        onMapReady={() => setMapReady(true)}
      >
        {markers.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={pin.coordinate}
            title={pin.title}
            pinColor={pinColor(pin.kind)}
          />
        ))}
        {routeCoords.length > 1 ? (
          <Polyline coordinates={routeCoords} strokeColor="#1A73E8" strokeWidth={4} />
        ) : null}
      </MapView>

      {!mapReady ? (
        <View style={styles.mapBootOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#0F9D58" />
        </View>
      ) : null}

      {mapReady && loadingRoute ? (
        <View style={styles.routeLoading}>
          <ActivityIndicator size="small" color="#1A73E8" />
        </View>
      ) : null}

      <TouchableOpacity style={styles.mapsButton} onPress={onOpenExternalMaps} activeOpacity={0.85}>
        <Ionicons name="navigate" size={22} color="#FFFFFF" />
        <Text style={styles.mapsButtonLabel}>MAPS</Text>
      </TouchableOpacity>

      {mapReady && fitCoordinates.length === 0 ? (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyText}>Location pin unavailable for this stop</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function DeliveryJobMap(props: Props) {
  const height = props.height ?? 280;
  const maps = getMapsModule();
  const fallback = (
    <MapFallback
      height={height}
      onOpenExternalMaps={props.onOpenExternalMaps}
      message={
        Platform.OS === "web"
          ? "Embedded maps are available in the Android/iOS app."
          : !canRenderGoogleTiles()
            ? "Google Maps is not configured for this build. Open Google Maps to navigate."
            : "Rebuild the delivery app (expo run:android) to enable the in-app map. You can still navigate with Google Maps."
      }
    />
  );

  if (!maps || !canRenderGoogleTiles()) {
    return fallback;
  }

  return (
    <MapErrorBoundary fallback={fallback}>
      <NativeDeliveryJobMap {...props} height={height} maps={maps} />
    </MapErrorBoundary>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    backgroundColor: "#E8EEF5",
    overflow: "hidden"
  },
  fallbackWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155"
  },
  fallbackText: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    color: "#64748B",
    marginBottom: 8
  },
  fallbackMapsButton: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1A73E8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10
  },
  fallbackMapsLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700"
  },
  mapsButton: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#1A73E8",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  mapsButtonLabel: {
    marginTop: 2,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4
  },
  mapBootOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8EEF5"
  },
  routeLoading: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(232, 238, 245, 0.72)",
    paddingHorizontal: 24
  },
  emptyText: {
    textAlign: "center",
    color: "#475467",
    fontSize: 14,
    fontWeight: "600"
  }
});
