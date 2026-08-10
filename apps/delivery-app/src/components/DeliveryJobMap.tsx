import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fetchDrivingRoute } from "../utils/directions";
import type { LatLng, MapPin } from "../utils/mapCoordinates";
import OsmWebMap from "./OsmWebMap";

export type { MapPin };

type Props = {
  riderLocation?: LatLng | null;
  destination?: LatLng | null;
  pins?: MapPin[];
  onOpenExternalMaps: () => void;
  height?: number;
};

const MAP_LOAD_TIMEOUT_MS = 12000;

/**
 * In-app map preview for delivery jobs.
 *
 * Uses OpenStreetMap via WebView so the preview works without Google Maps SDK
 * tiles / Android API-key SHA restrictions (those caused infinite loading on
 * react-native-maps). Turn-by-turn still opens in Google Maps via the FAB.
 */
export default function DeliveryJobMap({
  riderLocation,
  destination,
  pins = [],
  onOpenExternalMaps,
  height = 280
}: Props) {
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

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
    if (mapReady || mapFailed) return;
    const timer = setTimeout(() => setMapFailed(true), MAP_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [mapReady, mapFailed]);

  if (Platform.OS === "web" || mapFailed) {
    return (
      <View style={[styles.wrap, styles.fallbackWrap, { height }]}>
        <Ionicons name="map-outline" size={36} color="#64748B" />
        <Text style={styles.fallbackTitle}>Map preview unavailable</Text>
        <Text style={styles.fallbackText}>
          {Platform.OS === "web"
            ? "Embedded maps are available in the Android/iOS app."
            : "The in-app map could not load. Use Google Maps to navigate to this stop."}
        </Text>
        <TouchableOpacity style={styles.fallbackMapsButton} onPress={onOpenExternalMaps} activeOpacity={0.85}>
          <Ionicons name="navigate" size={18} color="#FFFFFF" />
          <Text style={styles.fallbackMapsLabel}>Open in Google Maps</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
      <OsmWebMap
        height={height}
        pins={markers}
        routeCoords={routeCoords}
        onReady={() => setMapReady(true)}
        onError={() => setMapFailed(true)}
      />

      {loadingRoute ? (
        <View style={styles.routeLoading}>
          <ActivityIndicator size="small" color="#1A73E8" />
        </View>
      ) : null}

      <TouchableOpacity style={styles.mapsButton} onPress={onOpenExternalMaps} activeOpacity={0.85}>
        <Ionicons name="navigate" size={22} color="#FFFFFF" />
        <Text style={styles.mapsButtonLabel}>MAPS</Text>
      </TouchableOpacity>

      {markers.length === 0 ? (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyText}>Location pin unavailable for this stop</Text>
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
