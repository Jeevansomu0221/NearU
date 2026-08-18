import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";

type Props = {
  latitude: number;
  longitude: number;
  onPinChange: (pin: { latitude: number; longitude: number }) => void;
  pinColor?: string;
  onReady?: () => void;
};

const CLOSE_ZOOM = 0.00055;

export default function GooglePinMap({
  latitude,
  longitude,
  onPinChange,
  pinColor = "#FF6B35",
  onReady
}: Props) {
  const mapRef = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const userMovedRef = useRef(false);
  const skipRegionRef = useRef(true);

  useEffect(() => {
    userMovedRef.current = false;
    skipRegionRef.current = true;
  }, [latitude, longitude]);

  useEffect(() => {
    if (!ready || userMovedRef.current || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    skipRegionRef.current = true;
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
        provider={PROVIDER_GOOGLE}
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
        onPanDrag={() => {
          userMovedRef.current = true;
          skipRegionRef.current = false;
        }}
        onRegionChangeComplete={(region) => {
          if (userMovedRef.current) {
            onPinChange({ latitude: region.latitude, longitude: region.longitude });
            return;
          }
          if (skipRegionRef.current) {
            skipRegionRef.current = false;
            return;
          }
        }}
        showsPointsOfInterest
        showsUserLocation
        showsMyLocationButton={false}
        showsBuildings
        showsCompass={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        zoomEnabled
        scrollEnabled
        liteMode={false}
      />
      <View pointerEvents="none" style={styles.pinWrap}>
        <View style={[styles.pinHead, { backgroundColor: pinColor, borderColor: "#FFFFFF" }]} />
        <View style={[styles.pinStem, { borderTopColor: pinColor }]} />
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
    marginLeft: -14,
    marginTop: -36,
    alignItems: "center"
  },
  pinHead: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 4,
    shadowColor: "#0F172A",
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6
  },
  pinStem: {
    width: 0,
    height: 0,
    marginTop: -2,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent"
  }
});
