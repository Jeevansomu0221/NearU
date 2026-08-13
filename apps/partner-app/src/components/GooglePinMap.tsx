import React, { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";

type Props = {
  latitude: number;
  longitude: number;
  onPinChange: (pin: { latitude: number; longitude: number }) => void;
  pinColor?: string;
  onReady?: () => void;
};

const CLOSE_ZOOM = 0.0018;

export default function GooglePinMap({ latitude, longitude, onPinChange, pinColor = "#2F7DE1", onReady }: Props) {
  const mapRef = useRef<MapView>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: CLOSE_ZOOM,
        longitudeDelta: CLOSE_ZOOM
      },
      280
    );
  }, [latitude, longitude, ready]);

  return (
    <View style={styles.wrap}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: CLOSE_ZOOM,
          longitudeDelta: CLOSE_ZOOM
        }}
        onMapReady={() => {
          setReady(true);
          onReady?.();
        }}
        onRegionChangeComplete={(region) => {
          onPinChange({ latitude: region.latitude, longitude: region.longitude });
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      />
      <View pointerEvents="none" style={styles.pinWrap}>
        <View style={[styles.pinDot, { backgroundColor: pinColor }]} />
        <View style={[styles.pinStem, { backgroundColor: pinColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#D9E2EC"
  },
  pinWrap: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -12,
    marginTop: -28,
    alignItems: "center"
  },
  pinDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4
  },
  pinStem: {
    width: 3,
    height: 10,
    marginTop: -2
  }
});
