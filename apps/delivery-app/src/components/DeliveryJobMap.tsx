import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type Region } from "react-native-maps";
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

const DEFAULT_REGION: Region = {
  latitude: 17.385,
  longitude: 78.4867,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08
};

const pinColor = (kind: MapPin["kind"]) => {
  if (kind === "rider") return "#1976D2";
  if (kind === "pickup") return "#2E7D32";
  return "#E65100";
};

export default function DeliveryJobMap({
  riderLocation,
  destination,
  pins = [],
  onOpenExternalMaps,
  height = 280
}: Props) {
  const mapRef = useRef<MapView | null>(null);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);

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

    const unique = coords.filter(
      (point, index, arr) =>
        arr.findIndex(
          (candidate) =>
            candidate.latitude === point.latitude && candidate.longitude === point.longitude
        ) === index
    );

    return unique;
  }, [markers, destination, riderLocation]);

  useEffect(() => {
    let cancelled = false;

    const loadRoute = async () => {
      if (!riderLocation || !destination) {
        setRouteCoords([]);
        return;
      }

      setLoadingRoute(true);
      const route = await fetchDrivingRoute(riderLocation, destination);
      if (!cancelled) {
        setRouteCoords(route || [riderLocation, destination]);
        setLoadingRoute(false);
      }
    };

    void loadRoute();
    return () => {
      cancelled = true;
    };
  }, [riderLocation?.latitude, riderLocation?.longitude, destination?.latitude, destination?.longitude]);

  useEffect(() => {
    if (!mapRef.current || fitCoordinates.length === 0) return;

    if (fitCoordinates.length === 1) {
      mapRef.current.animateToRegion(
        {
          ...fitCoordinates[0],
          latitudeDelta: 0.02,
          longitudeDelta: 0.02
        },
        350
      );
      return;
    }

    mapRef.current.fitToCoordinates(fitCoordinates, {
      edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
      animated: true
    });
  }, [fitCoordinates]);

  const initialRegion =
    fitCoordinates.length > 0
      ? {
          ...fitCoordinates[0],
          latitudeDelta: 0.04,
          longitudeDelta: 0.04
        }
      : DEFAULT_REGION;

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        loadingEnabled
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

      {loadingRoute ? (
        <View style={styles.routeLoading}>
          <ActivityIndicator size="small" color="#1A73E8" />
        </View>
      ) : null}

      <TouchableOpacity style={styles.mapsButton} onPress={onOpenExternalMaps} activeOpacity={0.85}>
        <Ionicons name="navigate" size={22} color="#FFFFFF" />
        <Text style={styles.mapsButtonLabel}>MAPS</Text>
      </TouchableOpacity>

      {fitCoordinates.length === 0 ? (
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
