import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GooglePinMap from "./GooglePinMap";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { useKeyboardBottomInset } from "../hooks/useKeyboardBottomInset";
import { suggestAddresses, type AddressSuggestion } from "../api/geocode.api";

export type AddressPinConfirmMode = "picker" | "confirm";

export type AddressPinConfirmDetails = {
  houseFlatDoorNo: string;
  recipientName: string;
};

type AddressPinConfirmModalProps = {
  visible: boolean;
  mode?: AddressPinConfirmMode;
  latitude: number;
  longitude: number;
  formattedAddress: string;
  addressLines?: string[];
  houseFlatDoorNo: string;
  onHouseFlatDoorNoChange: (value: string) => void;
  recipientName: string;
  onRecipientNameChange: (value: string) => void;
  confirming?: boolean;
  locatingCurrentLocation?: boolean;
  onUseCurrentLocation?: () => void;
  onPinChange?: (pin: { latitude: number; longitude: number }) => void;
  onConfirm: (pin: { latitude: number; longitude: number }, details?: AddressPinConfirmDetails) => void;
  onClose: () => void;
};

const movedFarEnough = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) => Math.abs(from.latitude - to.latitude) > 0.00012 || Math.abs(from.longitude - to.longitude) > 0.00012;

const TILE_SIZE = 256;
const MAP_ZOOM = 18;
const TILE_SPAN = 3;

const latLngToTile = (latitude: number, longitude: number, zoom: number) => {
  const n = 2 ** zoom;
  const x = ((longitude + 180) / 360) * n;
  const latRad = (latitude * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
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
      showCenterPin={false}
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
  const [viewport, setViewport] = useState({ width: 360, height: 320 });

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
          const next = tileToLatLng(point.x - gesture.dx / TILE_SIZE, point.y - gesture.dy / TILE_SIZE, MAP_ZOOM);
          setDrag({ x: 0, y: 0 });
          setCenter(next);
          onPinChange(next);
        }
      }),
    [center.latitude, center.longitude, onPinChange]
  );

  const pinTop = viewport.height / 2;

  return (
    <View
      style={styles.mapFill}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setViewport({ width, height });
      }}
      {...panResponder.panHandlers}
    >
      <View
        style={[
          styles.tileLayer,
          {
            width: TILE_SIZE * TILE_SPAN,
            height: TILE_SIZE * TILE_SPAN,
            transform: [
              { translateX: viewport.width / 2 - tiles.offsetX + drag.x },
              { translateY: pinTop - tiles.offsetY + drag.y }
            ]
          }
        ]}
      >
        {tiles.items.map((tile) => (
          <Image key={tile.key} source={{ uri: tile.uri }} style={[styles.tile, { left: tile.left, top: tile.top }]} />
        ))}
      </View>
    </View>
  );
}

function AddressPinConfirmBody({
  visible,
  mode = "picker",
  latitude,
  longitude,
  formattedAddress,
  addressLines = [],
  houseFlatDoorNo,
  onHouseFlatDoorNoChange,
  recipientName,
  onRecipientNameChange,
  confirming,
  locatingCurrentLocation,
  onUseCurrentLocation,
  onPinChange,
  onConfirm,
  onClose
}: AddressPinConfirmModalProps) {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const keyboardHeight = useKeyboardBottomInset();
  const keyboardOpen = keyboardHeight > 0;
  const formScrollRef = useRef<ScrollView>(null);
  const wasVisibleRef = useRef(false);
  const openedAtRef = useRef(0);
  const lastPinChangeRef = useRef({ latitude, longitude });
  const [pin, setPin] = useState({ latitude, longitude });
  const [draftHouseFlatDoorNo, setDraftHouseFlatDoorNo] = useState(houseFlatDoorNo);
  const [draftRecipientName, setDraftRecipientName] = useState(recipientName);
  const [formFieldFocused, setFormFieldFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formKeyboardOpen = keyboardOpen && !searchFocused;

  useEffect(() => {
    setPin({ latitude, longitude });
    lastPinChangeRef.current = { latitude, longitude };
  }, [latitude, longitude]);

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      openedAtRef.current = Date.now();
      setDraftHouseFlatDoorNo(houseFlatDoorNo);
      setDraftRecipientName(recipientName);
      setFormFieldFocused(false);
    }
    if (!visible) {
      setSearchQuery("");
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchFocused(false);
      setFormFieldFocused(false);
    }
    wasVisibleRef.current = visible;
  }, [visible, houseFlatDoorNo, recipientName]);

  useEffect(() => {
    if (keyboardOpen) {
      requestAnimationFrame(() => {
        formScrollRef.current?.scrollTo({ y: 0, animated: false });
      });
    }
  }, [keyboardOpen]);

  const handlePinUpdate = (next: { latitude: number; longitude: number }) => {
    if (keyboardOpen || formFieldFocused || searchFocused) return;
    if (Date.now() - openedAtRef.current < 800) return;
    if (!movedFarEnough(lastPinChangeRef.current, next)) return;
    lastPinChangeRef.current = next;
    setPin(next);
    onPinChange?.(next);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowSuggestions(Boolean(value.trim()));

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const result = await suggestAddresses(value.trim());
        setSuggestions(result.success && result.data ? result.data : []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 320);
  };

  const handleSelectSuggestion = (item: AddressSuggestion) => {
    setShowSuggestions(false);
    setSearchQuery(item.description);
    const geo = item.address;
    if (geo?.latitude && geo?.longitude) {
      handlePinUpdate({ latitude: geo.latitude, longitude: geo.longitude });
    }
  };

  const handleSave = () => {
    if (mode === "picker" && !draftHouseFlatDoorNo.trim()) {
      Alert.alert("Error", "Flat or house name is required");
      return;
    }
    if (mode === "picker" && !draftRecipientName.trim()) {
      Alert.alert("Error", "Receiver name is required");
      return;
    }
    if (mode === "picker") {
      onHouseFlatDoorNoChange(draftHouseFlatDoorNo);
      onRecipientNameChange(draftRecipientName);
      onConfirm(pin, {
        houseFlatDoorNo: draftHouseFlatDoorNo.trim(),
        recipientName: draftRecipientName.trim()
      });
      return;
    }
    onConfirm(pin);
  };

  const displayAddress =
    formattedAddress.trim() ||
    addressLines.filter(Boolean).join(", ") ||
    "Move the pin to your delivery spot";

  const isPicker = mode === "picker";
  const screenHeight = Dimensions.get("screen").height;
  const windowAlreadyResized = keyboardOpen && screenHeight - layout.height > Math.max(80, keyboardHeight * 0.45);
  const androidImePad =
    Platform.OS === "android" && keyboardOpen && !windowAlreadyResized
      ? Math.max(0, keyboardHeight - insets.bottom)
      : 0;
  const sheetBottomPad = formKeyboardOpen ? 28 : Math.max(insets.bottom, 14);
  const ScreenRoot = Platform.OS === "ios" ? KeyboardAvoidingView : View;
  const screenRootProps =
    Platform.OS === "ios" ? ({ behavior: "padding" as const, keyboardVerticalOffset: 0 } satisfies React.ComponentProps<typeof KeyboardAvoidingView>) : {};

  return (
      <ScreenRoot
        {...screenRootProps}
        style={[
          styles.screen,
          keyboardOpen && styles.screenKeyboardOpen,
          {
            maxWidth: layout.isTablet ? 560 : undefined,
            alignSelf: layout.isTablet ? "center" : undefined,
            width: "100%",
            paddingBottom: androidImePad
          }
        ]}
      >
        <View style={styles.screenInner}>
          <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
            <TouchableOpacity style={styles.backButton} onPress={onClose} activeOpacity={0.85}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="#1A120B" />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>{isPicker ? "Select delivery location" : "Confirm delivery pin"}</Text>
            <View style={styles.backButtonSpacer} />
          </View>

          <View style={styles.body}>
          {!formKeyboardOpen && isPicker ? (
            <View style={styles.searchWrap}>
              <MaterialCommunityIcons name="magnify" size={20} color="#e23744" />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={handleSearchChange}
                placeholder="Search for area, street name..."
                placeholderTextColor="#98A2B3"
                onFocus={() => {
                  setSearchFocused(true);
                  setShowSuggestions(Boolean(searchQuery.trim()));
                }}
                onBlur={() => setSearchFocused(false)}
              />
              {searching ? <ActivityIndicator size="small" color="#e23744" /> : null}
            </View>
          ) : null}

          {!formKeyboardOpen && showSuggestions && suggestions.length > 0 ? (
            <View style={styles.suggestionsCard}>
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item.placeId}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.suggestionRow} onPress={() => handleSelectSuggestion(item)}>
                    <MaterialCommunityIcons name="map-marker-outline" size={18} color="#7A6F65" />
                    <Text style={styles.suggestionText} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          ) : null}

          <View style={[styles.mapStage, formKeyboardOpen && styles.mapStageCompact]}>
            {Number.isFinite(latitude) && Number.isFinite(longitude) ? (
              <GoogleMapOrFallback latitude={pin.latitude} longitude={pin.longitude} onPinChange={handlePinUpdate} />
            ) : (
              <View style={styles.mapFallback}>
                <ActivityIndicator color="#e23744" />
              </View>
            )}

            {!formKeyboardOpen ? (
              <>
                <View pointerEvents="none" style={styles.centerPinStack}>
                  <View style={styles.pinTooltip}>
                    <Text style={styles.pinTooltipText}>Move pin to your exact delivery location</Text>
                    <View style={styles.pinTooltipTail} />
                  </View>
                  <MaterialCommunityIcons name="map-marker" size={42} color="#e23744" />
                </View>

                {isPicker && onUseCurrentLocation ? (
                  <TouchableOpacity
                    style={styles.useLocationFab}
                    onPress={onUseCurrentLocation}
                    disabled={locatingCurrentLocation}
                    activeOpacity={0.9}
                  >
                    {locatingCurrentLocation ? (
                      <ActivityIndicator size="small" color="#e23744" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#e23744" />
                        <Text style={styles.useLocationFabText}>Use current location</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
              </>
            ) : (
              <View pointerEvents="none" style={styles.compactPinMarker}>
                <MaterialCommunityIcons name="map-marker" size={30} color="#e23744" />
              </View>
            )}
          </View>

          <View
            style={[
              styles.bottomSheet,
              formKeyboardOpen && styles.bottomSheetKeyboardOpen,
              { paddingBottom: sheetBottomPad }
            ]}
          >
            <ScrollView
              ref={formScrollRef}
              style={formKeyboardOpen ? styles.formScrollKeyboardOpen : undefined}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets={false}
              contentContainerStyle={[styles.formScrollContent, formKeyboardOpen && styles.formScrollContentOpen]}
              bounces={false}
            >
              {!formKeyboardOpen ? (
                <>
                  <Text style={styles.sheetEyebrow}>Delivery details</Text>

                  <View style={styles.addressPreviewRow}>
                    <View style={styles.addressPreviewIcon}>
                      <MaterialCommunityIcons name="map-marker" size={18} color="#e23744" />
                    </View>
                    <Text style={styles.addressPreviewText} numberOfLines={3}>
                      {displayAddress}
                    </Text>
                    {isPicker ? (
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#B0A79D" />
                    ) : null}
                  </View>
                </>
              ) : null}

              {isPicker ? (
                <>
                  <Text style={styles.fieldLabel}>
                    Address details<Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <View>
                    <TextInput
                      style={styles.fieldInput}
                      value={draftHouseFlatDoorNo}
                      onChangeText={setDraftHouseFlatDoorNo}
                      placeholder="E.g. Floor, House no."
                      placeholderTextColor="#B0A79D"
                      autoComplete="off"
                      importantForAutofill="no"
                      onFocus={() => setFormFieldFocused(true)}
                      onBlur={() => setFormFieldFocused(false)}
                    />
                  </View>

                  <Text style={styles.fieldLabel}>
                    Receiver details for this address<Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <View>
                    <TextInput
                      style={[styles.fieldInput, styles.fieldInputLast]}
                      value={draftRecipientName}
                      onChangeText={setDraftRecipientName}
                      placeholder="Name of person receiving order"
                      placeholderTextColor="#B0A79D"
                      autoComplete="off"
                      importantForAutofill="no"
                      onFocus={() => setFormFieldFocused(true)}
                      onBlur={() => setFormFieldFocused(false)}
                    />
                  </View>
                </>
              ) : (
                <View style={styles.confirmLinesWrap}>
                  {addressLines.map((line, index) => (
                    <Text key={`confirm-line-${index}`} style={styles.confirmLine}>
                      {line}
                    </Text>
                  ))}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveButton, confirming && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={confirming}
              activeOpacity={0.9}
            >
              {confirming ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>{isPicker ? "Save address" : "Yes, this is my address"}</Text>
              )}
            </TouchableOpacity>
          </View>
          </View>
        </View>
      </ScreenRoot>
  );
}

export default function AddressPinConfirmModal(props: AddressPinConfirmModalProps) {
  useEffect(() => {
    if (!props.visible) return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      props.onClose();
      return true;
    });
    return () => sub.remove();
  }, [props.visible, props.onClose]);

  if (!props.visible) return null;

  return (
    <View style={styles.overlayRoot} pointerEvents="box-none">
      <AddressPinConfirmBody {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    elevation: 40,
    backgroundColor: "#F5F1EB"
  },
  screen: {
    flex: 1,
    backgroundColor: "#F5F1EB"
  },
  screenKeyboardOpen: {
    backgroundColor: "#FFFFFF"
  },
  screenInner: {
    flex: 1
  },
  body: {
    flex: 1,
    minHeight: 0
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: "#F5F1EB"
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  backButtonSpacer: {
    width: 40
  },
  screenTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: "#1A120B"
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 8,
    paddingHorizontal: 14,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECE3D9"
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1A120B",
    paddingVertical: 10
  },
  suggestionsCard: {
    marginHorizontal: 14,
    marginBottom: 8,
    maxHeight: 180,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECE3D9",
    overflow: "hidden"
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1EBE3"
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#344054"
  },
  mapStage: {
    flex: 1,
    backgroundColor: "#D9E2EC",
    overflow: "hidden",
    minHeight: 0
  },
  mapStageCompact: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minHeight: 0
  },
  compactPinMarker: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -15,
    marginTop: -30
  },
  mapFill: {
    flex: 1
  },
  mapFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  tileLayer: {
    position: "absolute"
  },
  tile: {
    position: "absolute",
    width: TILE_SIZE,
    height: TILE_SIZE
  },
  centerPinStack: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -21,
    marginTop: -72,
    alignItems: "center"
  },
  pinTooltip: {
    marginBottom: 6,
    maxWidth: 220,
    backgroundColor: "#1A120B",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  pinTooltipText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 15
  },
  pinTooltipTail: {
    position: "absolute",
    bottom: -5,
    alignSelf: "center",
    width: 10,
    height: 10,
    backgroundColor: "#1A120B",
    transform: [{ rotate: "45deg" }]
  },
  useLocationFab: {
    position: "absolute",
    alignSelf: "center",
    bottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    shadowColor: "#1A120B",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  useLocationFabText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#e23744"
  },
  bottomSheet: {
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 16,
    paddingHorizontal: 16,
    maxHeight: "46%",
    shadowColor: "#1A120B",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10
  },
  bottomSheetKeyboardOpen: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: "100%",
    paddingTop: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowOpacity: 0.04,
    elevation: 4
  },
  formScrollKeyboardOpen: {
    flexGrow: 0,
    flexShrink: 0
  },
  formScrollContent: {
    paddingBottom: 4
  },
  formScrollContentOpen: {
    flexGrow: 0,
    paddingBottom: 4
  },
  sheetEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#98A2B3",
    marginBottom: 10
  },
  addressPreviewRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ECE3D9",
    backgroundColor: "#FAFAF8",
    marginBottom: 14
  },
  addressPreviewIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FFF1E6",
    alignItems: "center",
    justifyContent: "center"
  },
  addressPreviewText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: "#241D17"
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7A6F65",
    marginBottom: 6
  },
  requiredMark: {
    color: "#e23744"
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: "#E4DBD2",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1A120B",
    backgroundColor: "#FFFFFF",
    marginBottom: 14
  },
  fieldInputLast: {
    marginBottom: 4
  },
  confirmLinesWrap: {
    marginBottom: 8
  },
  confirmLine: {
    fontSize: 14,
    lineHeight: 20,
    color: "#241D17",
    fontWeight: "600",
    marginBottom: 4
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: "#e23744",
    borderRadius: 14,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center"
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  },
  buttonDisabled: {
    opacity: 0.7
  }
});
