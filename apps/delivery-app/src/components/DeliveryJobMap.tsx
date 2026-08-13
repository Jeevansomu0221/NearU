import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
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

const pinColor = (kind: MapPin["kind"]) => {
  if (kind === "rider") return "#1976D2";
  if (kind === "pickup") return "#2E7D32";
  return "#E65100";
};

/**
 * In-app map preview for delivery jobs.
 * Google Maps SDK first; OSM WebView only if the native map cannot load.
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
  const [useGoogle, setUseGoogle] = useState(Platform.OS !== "web");
  const mapRef = useRef<MapView>(null);

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
    let timer: ReturnType<typeof setTimeout> | undefined;

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

    timer = setTimeout(() => {
      void loadRoute();
    }, 400);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    riderLocation ? Number(riderLocation.latitude.toFixed(3)) : null,
    riderLocation ? Number(riderLocation.longitude.toFixed(3)) : null,
    destination?.latitude,
    destination?.longitude
  ]);

  useEffect(() => {
    if (mapReady || mapFailed) return;
    const timer = setTimeout(() => {
      if (useGoogle) {
        setUseGoogle(false);
        setMapReady(false);
        return;
      }
      setMapFailed(true);
    }, MAP_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [mapReady, mapFailed, useGoogle]);

  const initialRegion = markers[0]?.coordinate
    ? {
        latitude: markers[0].coordinate.latitude,
        longitude: markers[0].coordinate.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      }
    : {
        latitude: 12.9716,
        longitude: 77.5946,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08
      };

  useEffect(() => {
    if (!useGoogle || !mapReady) return;
    const coords = [
      ...markers.map((pin) => pin.coordinate),
      ...routeCoords
    ].filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
    if (coords.length < 1) return;
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 48, right: 36, bottom: 72, left: 36 },
      animated: true
    });
  }, [useGoogle, mapReady, markers, routeCoords]);

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
      {useGoogle ? (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={{ width: "100%", height }}
          initialRegion={initialRegion}
          onMapReady={() => setMapReady(true)}
          showsUserLocation={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
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
      ) : (
        <OsmWebMap
          height={height}
          pins={markers}
          routeCoords={routeCoords}
          onReady={() => setMapReady(true)}
          onError={() => setMapFailed(true)}
        />
      )}

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
