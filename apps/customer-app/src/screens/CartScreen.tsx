import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart, type CartItem, type CartItemRef } from "../context/CartContext";
import { getUserProfile, updateUserAddress, type SavedAddress, type UserProfile } from "../api/user.api";
import { quoteOrderPricing, type OrderPricingQuote } from "../api/order.api";

const formatAmount = (value = 0) => {
  const rounded = Number(value || 0).toFixed(2).replace(/\.?0+$/, "");
  return `Rs ${rounded || "0"}`;
};

const MAX_PIN_DRIFT_KM = 5;
const LOCATION_CACHE_MS = 2 * 60 * 1000;
const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;

const haversineKmClient = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

export default function CartScreen({ route, navigation }: any) {
  const { items, clear, removeItem, updateQuantity } = useCart();
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [pricingQuote, setPricingQuote] = useState<OrderPricingQuote | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [locationResolving, setLocationResolving] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const instructionsOffsetY = useRef(0);
  const hasProfileRef = useRef(false);
  const locationCacheRef = useRef<{ location: { latitude: number; longitude: number }; at: number } | null>(null);

  const loadUserProfile = useCallback(async () => {
    try {
      // Full-screen loader only on the first load; focus refreshes are silent.
      if (!hasProfileRef.current) {
        setLoadingProfile(true);
      }
      const response = await getUserProfile();
      if (response.success && response.data) {
        setUserProfile(response.data);
        hasProfileRef.current = true;
      }
    } catch (error) {
      console.error("CartScreen: Error loading profile:", error);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, { shopId: string; shopName: string; items: CartItem[] }>();

    items.forEach((item: CartItem) => {
      const existing = groups.get(item.shopId) || {
        shopId: item.shopId,
        shopName: item.shopName,
        items: []
      };
      existing.items.push(item);
      groups.set(item.shopId, existing);
    });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      subtotal: group.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    }));
  }, [items]);

  const subtotal = items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);
  const deliveryFee = pricingQuote?.deliveryFee || 0;
  const foodGst = pricingQuote?.foodGst ?? subtotal * 0.05;
  const deliveryGst = pricingQuote?.deliveryGst ?? deliveryFee * 0.18;
  const platformFee = pricingQuote?.platformFee ?? 0;
  const taxDiscount = pricingQuote?.taxDiscount ?? foodGst + deliveryGst + platformFee;
  const total = subtotal + deliveryFee;

  const getSelectedAddress = (): SavedAddress | string | undefined => {
    const defaultSavedAddress = userProfile?.addresses?.find((address) => address.isDefault);
    return (defaultSavedAddress || userProfile?.address) as SavedAddress | string | undefined;
  };

  const formatAddress = () => {
    const selectedAddress = getSelectedAddress();
    if (!selectedAddress) {
      return "No address saved. Please add delivery address in Profile.";
    }

    if (typeof selectedAddress === "string") {
      return selectedAddress;
    }

    const addr = selectedAddress;
    return [
      addr.recipientName,
      [addr.houseFlatDoorNo, addr.buildingApartmentName].filter(Boolean).join(", ") || addr.street,
      addr.streetRoadName,
      addr.areaLocality || addr.area,
      addr.landmark ? `Near ${addr.landmark}` : null,
      [addr.cityTownVillage || addr.city, addr.district ? `${addr.district} District` : null, addr.state].filter(Boolean).join(", ") +
        (addr.pincode ? ` - ${addr.pincode}` : ""),
      addr.country || "India"
    ]
      .filter(Boolean)
      .join(", ");
  };

  const getDeliveryLocation = () => {
    const address = getSelectedAddress();
    if (!address || typeof address === "string") return undefined;

    if (
      typeof address.latitude === "number" &&
      typeof address.longitude === "number" &&
      Number.isFinite(address.latitude) &&
      Number.isFinite(address.longitude) &&
      !(address.latitude === 0 && address.longitude === 0)
    ) {
      return {
        latitude: address.latitude,
        longitude: address.longitude
      };
    }

    return undefined;
  };

  const fetchPricingQuote = useCallback(
    async (
      deliveryLocation: { latitude: number; longitude: number },
      options?: { showAlert?: boolean }
    ) => {
      if (groupedItems.length === 0) {
        setPricingQuote(null);
        setPricingError(null);
        return null;
      }

      try {
        setPricingLoading(true);
        setPricingError(null);
        const response = await quoteOrderPricing(
          groupedItems.map((group) => ({
            partnerId: group.shopId,
            itemTotal: group.subtotal
          })),
          deliveryLocation
        );

        if (!response.success || !response.data) {
          throw new Error(response.message || "Could not calculate delivery fee.");
        }

        setPricingQuote(response.data);
        return response.data;
      } catch (error: any) {
        setPricingQuote(null);
        const message = error.message || "Could not calculate delivery fee.";
        setPricingError(message);
        if (options?.showAlert) {
          Alert.alert("Pricing Error", message);
        }
        return null;
      } finally {
        setPricingLoading(false);
      }
    },
    [groupedItems]
  );

  const captureAndSaveDeliveryLocation = async () => {
    const address = getSelectedAddress();
    if (!address || typeof address === "string") {
      Alert.alert("Address Required", "Please add your delivery address in Profile before placing order.");
      return undefined;
    }

    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(
        "Location Permission Needed",
        "Please allow location access so we can save your exact GPS pin. Orders cannot be placed with only pincode or text address."
      );
      return undefined;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });

    const deliveryLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    };

    const payload: SavedAddress = {
      ...address,
      addressId: address._id,
      latitude: deliveryLocation.latitude,
      longitude: deliveryLocation.longitude,
      isDefault: address.isDefault ?? true
    } as SavedAddress & { addressId?: string };

    const response = await updateUserAddress(payload);
    if (!response.success || !response.data) {
      Alert.alert("Location Save Failed", response.message || "Could not save your exact delivery pin.");
      return undefined;
    }

    setUserProfile(response.data);
    return deliveryLocation;
  };

  const refreshSavedPinInBackground = async (deviceLocation: { latitude: number; longitude: number }) => {
    const address = getSelectedAddress();
    if (!address || typeof address === "string") return;

    try {
      const payload: SavedAddress = {
        ...address,
        addressId: address._id,
        latitude: deviceLocation.latitude,
        longitude: deviceLocation.longitude,
        isDefault: address.isDefault ?? true
      } as SavedAddress & { addressId?: string };

      const response = await updateUserAddress(payload);
      if (response.success && response.data) {
        setUserProfile(response.data);
      }
    } catch {
      // Non-blocking background refresh.
    }
  };

  const readDeviceLocationFast = async () => {
    // Last-known position returns instantly; a fresh GPS fix can take 10+ seconds.
    try {
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: LAST_KNOWN_MAX_AGE_MS
      });
      if (lastKnown) {
        return {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude
        };
      }
    } catch {
      // Ignore and fall through to a fresh fix.
    }

    const device = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });
    return {
      latitude: device.coords.latitude,
      longitude: device.coords.longitude
    };
  };

  const resolveDeliveryLocationForPricing = useCallback(async () => {
    const cached = locationCacheRef.current;
    if (cached && Date.now() - cached.at < LOCATION_CACHE_MS) {
      return cached.location;
    }

    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status === "granted") {
      try {
        const deviceLocation = await readDeviceLocationFast();

        const saved = getDeliveryLocation();
        if (saved) {
          const driftKm = haversineKmClient(saved, deviceLocation);
          if (driftKm > MAX_PIN_DRIFT_KM) {
            void refreshSavedPinInBackground(deviceLocation);
          }
        }

        locationCacheRef.current = { location: deviceLocation, at: Date.now() };
        return deviceLocation;
      } catch {
        // Fall back to saved pin when GPS read fails.
      }
    }

    const saved = getDeliveryLocation();
    if (saved) {
      return saved;
    }

    return captureAndSaveDeliveryLocation();
  }, [userProfile]);

  const loadDeliveryPricing = useCallback(async () => {
    if (groupedItems.length === 0) {
      setPricingQuote(null);
      setPricingError(null);
      return;
    }

    setLocationResolving(true);
    setPricingError(null);

    try {
      const deliveryLocation = await resolveDeliveryLocationForPricing();
      if (!deliveryLocation) {
        setPricingQuote(null);
        setPricingError("Allow location access to calculate delivery fee.");
        return;
      }

      await fetchPricingQuote(deliveryLocation);
    } finally {
      setLocationResolving(false);
    }
  }, [fetchPricingQuote, groupedItems.length, resolveDeliveryLocationForPricing]);

  useEffect(() => {
    void loadDeliveryPricing();
  }, [loadDeliveryPricing]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadUserProfile();
      void loadDeliveryPricing();
    });
    return unsubscribe;
  }, [navigation, loadUserProfile, loadDeliveryPricing]);

  const proceedToPayment = async () => {
    try {
      setLoading(true);

      if (items.length === 0) {
        Alert.alert("Cart Empty", "Please add items to cart first");
        return;
      }

      if (!getSelectedAddress()) {
        Alert.alert("Address Required", "Please add your delivery address in Profile before placing order.", [
          { text: "Cancel", style: "cancel" },
          { text: "Add Address", onPress: () => navigation.navigate("Profile") }
        ]);
        return;
      }

      const deliveryLocation = await resolveDeliveryLocationForPricing();
      if (!deliveryLocation) {
        return;
      }

      const activeQuote = await fetchPricingQuote(deliveryLocation, { showAlert: true });
      if (!activeQuote) {
        return;
      }

      const quotesByShopId = new Map(activeQuote.groups.map((group) => [group.partnerId, group]));
      const pricedGroupedItems = groupedItems.map((group) => {
        const quote = quotesByShopId.get(group.shopId);
        return {
          ...group,
          deliveryFee: quote?.deliveryFee || 0,
          foodGst: quote?.foodGst || 0,
          deliveryGst: quote?.deliveryGst || 0,
          platformFee: quote?.platformFee || 0,
          taxDiscount: quote?.taxDiscount || 0,
          deliveryDistanceKm: quote?.deliveryDistanceKm || 0
        };
      });

      navigation.navigate("Payment", {
        userProfile,
        orderSummary: {
          items,
          subtotal,
          deliveryFee: activeQuote.deliveryFee,
          foodGst: activeQuote.foodGst,
          deliveryGst: activeQuote.deliveryGst,
          platformFee: activeQuote.platformFee,
          taxDiscount: activeQuote.taxDiscount,
          deliveryDistanceKm: activeQuote.deliveryDistanceKm,
          total: activeQuote.payableTotal,
          address: formatAddress(),
          deliveryLocation,
          note,
          groupedShops: pricedGroupedItems
        }
      });
    } catch (error: any) {
      Alert.alert("Location Error", error.message || "Could not capture your exact delivery location.");
    } finally {
      setLoading(false);
    }
  };

  const hasAddressPin = Boolean(getDeliveryLocation());
  // Show the spinner only while we have no fee yet; silent refreshes keep the old fee visible.
  const isPricingPending = (pricingLoading || locationResolving) && !pricingQuote;
  const canCheckout =
    Boolean(getSelectedAddress()) &&
    Boolean(pricingQuote) &&
    !pricingError &&
    !loading &&
    items.length > 0;

  const handleRemoveItem = (item: CartItemRef) => {
      Alert.alert("Remove Item", "Remove this item from cart?", [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => removeItem(item) }
      ]);
  };

  const handleQuantityChange = (item: CartItemRef, change: number) => {
    const cartLine = items.find(
      (entry) =>
        entry.shopId === item.shopId &&
        (item.lineKey ? entry.lineKey === item.lineKey : (entry.menuItemId || entry.name) === (item.menuItemId || item.name))
    );
    if (!cartLine) return;

    const newQuantity = cartLine.quantity + change;
    if (newQuantity > 0) {
      updateQuantity(item, newQuantity);
    } else {
      handleRemoveItem(item);
    }
  };

  if (loadingProfile) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading cart...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Your Cart</Text>
        {items.length > 0 ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() =>
              Alert.alert("Clear Cart", "Remove all items from cart?", [
                { text: "Cancel", style: "cancel" },
                { text: "Clear", style: "destructive", onPress: clear }
              ])
            }
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <Text style={styles.emptySubText}>Add food from one or more restaurants to continue.</Text>
          <TouchableOpacity style={styles.browseButton} onPress={() => navigation.goBack()}>
            <Text style={styles.browseButtonText}>Browse Shops</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            ref={scrollRef}
            style={styles.itemsContainer}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 128 + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          >
            {groupedItems.map((group) => (
              <View key={group.shopId} style={styles.shopCard}>
                <View style={styles.shopCardHeader}>
                  <View>
                    <Text style={styles.shopName}>{group.shopName}</Text>
                    <Text style={styles.shopSubtext}>{group.items.length} item{group.items.length === 1 ? "" : "s"}</Text>
                  </View>
                  <Text style={styles.shopSubtotal}>{formatAmount(group.subtotal)}</Text>
                </View>

                {group.items.map((item) => (
                  <View key={`${item.shopId}-${item.lineKey || item.menuItemId || item.name}`} style={styles.itemCard}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {item.selectedExtras && item.selectedExtras.length > 0 ? (
                        <Text style={styles.itemMeta}>
                          {item.selectedExtras.map((extra) => extra.name).join(", ")}
                        </Text>
                      ) : null}
                      {item.cookingRequest ? (
                        <Text style={styles.itemMeta}>Note: {item.cookingRequest}</Text>
                      ) : null}
                      <Text style={styles.itemPrice}>{formatAmount(item.price)} each</Text>
                    </View>

                    <View style={styles.itemActions}>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() =>
                            handleQuantityChange(
                              {
                                shopId: item.shopId,
                                menuItemId: item.menuItemId,
                                name: item.name,
                                lineKey: item.lineKey
                              },
                              -1
                            )
                          }
                        >
                          <Text style={styles.quantityButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() =>
                            handleQuantityChange(
                              {
                                shopId: item.shopId,
                                menuItemId: item.menuItemId,
                                name: item.name,
                                lineKey: item.lineKey
                              },
                              1
                            )
                          }
                        >
                          <Text style={styles.quantityButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        onPress={() =>
                          handleRemoveItem({
                            shopId: item.shopId,
                            menuItemId: item.menuItemId,
                            name: item.name,
                            lineKey: item.lineKey
                          })
                        }
                      >
                        <Text style={styles.removeButtonText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ))}

            <View style={styles.sectionCard}>
              <View style={styles.deliveryHeader}>
                <Text style={styles.sectionTitle}>Delivery Address</Text>
                <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
                  <Text style={styles.linkText}>{getSelectedAddress() ? "Change" : "Add Address"}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.addressName}>{userProfile?.name || "Customer"}</Text>
              <Text style={styles.addressPhone}>{userProfile?.phone}</Text>
              <Text style={styles.addressText}>{formatAddress()}</Text>

              {getSelectedAddress() && hasAddressPin ? (
                <View style={styles.pinSavedRow}>
                  <Text style={styles.pinSavedDot}>●</Text>
                  <Text style={styles.pinSavedText}>Location access is set for accurate delivery.</Text>
                </View>
              ) : null}
            </View>

            <View
              style={styles.sectionCard}
              onLayout={(event) => {
                instructionsOffsetY.current = event.nativeEvent.layout.y;
              }}
            >
              <Text style={styles.sectionTitle}>Special Instructions</Text>
              <TextInput
                style={styles.instructionsInput}
                value={note}
                onChangeText={setNote}
                placeholder="Add delivery notes, gate number, less spicy, no onions..."
                placeholderTextColor="#98A2B3"
                multiline
                textAlignVertical="top"
                onFocus={() => {
                  // Keep the field in view — do not scrollToEnd (that jumps past the input to totals).
                  setTimeout(() => {
                    scrollRef.current?.scrollTo({
                      y: Math.max(0, instructionsOffsetY.current - 16),
                      animated: true
                    });
                  }, 80);
                }}
              />
              <Text style={styles.instructionsHint}>These instructions will be attached to your order.</Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items Total</Text>
                <Text style={styles.summaryValue}>{formatAmount(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {pricingQuote?.deliveryDistanceKm
                    ? `Delivery Fee (${pricingQuote.deliveryDistanceKm} km)`
                    : "Delivery Fee"}
                </Text>
                {isPricingPending ? (
                  <View style={styles.calculatingRow}>
                    <ActivityIndicator size="small" color="#FF6B35" />
                    <Text style={styles.summaryValueMuted}>Calculating...</Text>
                  </View>
                ) : pricingError ? (
                  <TouchableOpacity onPress={() => void loadDeliveryPricing()}>
                    <Text style={styles.pricingErrorText}>Tap to retry</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.summaryValue}>{formatAmount(deliveryFee)}</Text>
                )}
              </View>
              {pricingError ? (
                <Text style={styles.pricingErrorHint}>{pricingError}</Text>
              ) : null}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Food GST (5%)</Text>
                <View style={styles.waivedValueGroup}>
                  <Text style={styles.struckValue}>{formatAmount(foodGst)}</Text>
                  <Text style={styles.freeValue}>Rs 0</Text>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery GST (18%)</Text>
                <View style={styles.waivedValueGroup}>
                  <Text style={styles.struckValue}>{formatAmount(deliveryGst)}</Text>
                  <Text style={styles.freeValue}>Rs 0</Text>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Platform fee</Text>
                <View style={styles.waivedValueGroup}>
                  <Text style={styles.struckValue}>{formatAmount(platformFee)}</Text>
                  <Text style={styles.freeValue}>Rs 0</Text>
                </View>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>{formatAmount(total)}</Text>
              </View>
              <Text style={styles.offerNote}>You saved {formatAmount(taxDiscount)} with waived GST and platform fee.</Text>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
            <View>
              <Text style={styles.footerLabel}>Total</Text>
              <Text style={styles.footerTotal}>{formatAmount(total)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutButton, !canCheckout && styles.checkoutButtonDisabled]}
              onPress={proceedToPayment}
              disabled={!canCheckout}
            >
              <Text style={styles.checkoutButtonText}>
                {isPricingPending ? "Calculating fee..." : "Continue to Payment"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F3EE"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B5E55"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2C2018"
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FDECEC"
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C7362E"
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32
  },
  emptyText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 8
  },
  emptySubText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: "#7B6D63",
    marginBottom: 20
  },
  browseButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16
  },
  browseButtonText: {
    color: "#fff",
    fontWeight: "800"
  },
  itemsContainer: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 120
  },
  shopCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EFE5DA",
    padding: 14
  },
  shopCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  shopName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2C2018"
  },
  shopSubtext: {
    fontSize: 11,
    color: "#8B6A54",
    marginTop: 2
  },
  shopSubtotal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FF6B35"
  },
  itemCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F4EAE0"
  },
  itemInfo: {
    flex: 1,
    marginRight: 12
  },
  itemName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2C2018",
    marginBottom: 4
  },
  itemMeta: {
    fontSize: 11,
    lineHeight: 15,
    color: "#8B7E74",
    marginBottom: 4
  },
  itemPrice: {
    fontSize: 12,
    color: "#7B6D63"
  },
  itemActions: {
    alignItems: "flex-end"
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F6EEE6",
    alignItems: "center",
    justifyContent: "center"
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2C2018"
  },
  quantityText: {
    minWidth: 24,
    textAlign: "center",
    fontWeight: "700",
    color: "#2C2018"
  },
  removeButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#C7362E"
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EFE5DA",
    padding: 14
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 10
  },
  deliveryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  linkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF6B35"
  },
  addressName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2C2018",
    marginBottom: 4
  },
  addressPhone: {
    fontSize: 12,
    color: "#8B6A54",
    marginBottom: 6
  },
  addressText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6B5E55"
  },
  instructionsInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: "#D9D0C5",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1A120B",
    backgroundColor: "#FFFCF8"
  },
  instructionsHint: {
    fontSize: 11,
    color: "#8B6A54",
    marginTop: 8
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EFE5DA",
    padding: 14
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  summaryLabel: {
    fontSize: 13,
    color: "#7B6D63"
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2C2018"
  },
  summaryValueMuted: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8B6A54",
    marginLeft: 8
  },
  calculatingRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  pricingErrorText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C7362E"
  },
  pricingErrorHint: {
    marginTop: -4,
    marginBottom: 8,
    fontSize: 11,
    lineHeight: 16,
    color: "#C7362E"
  },
  waivedValueGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  struckValue: {
    fontSize: 12,
    color: "#9A8A7F",
    textDecorationLine: "line-through"
  },
  freeValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#216E39"
  },
  offerNote: {
    marginTop: 8,
    fontSize: 11,
    color: "#216E39",
    fontWeight: "700"
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F4EAE0"
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2C2018"
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FF6B35"
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#E8DDD2",
    backgroundColor: "rgba(247,243,238,0.98)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  footerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8B6A54"
  },
  footerTotal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2C2018",
    marginTop: 2
  },
  checkoutButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16
  },
  checkoutButtonDisabled: {
    backgroundColor: "#FFB08F"
  },
  checkoutButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
  },
  pinSavedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F4EAE0"
  },
  pinSavedDot: {
    color: "#2B9C4A",
    fontSize: 14,
    marginRight: 6
  },
  pinSavedText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#216E39",
    fontWeight: "600"
  }
});
