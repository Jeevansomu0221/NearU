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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart, type CartItem, type CartItemRef } from "../context/CartContext";
import { getUserProfile, updateUserAddress, type SavedAddress, type UserProfile } from "../api/user.api";
import { resolveAddressPin } from "../api/geocode.api";
import { quoteOrderPricing, type OrderPricingQuote } from "../api/order.api";
import { getSelectedAddress as pickSavedAddress, parseAddressCoordinates } from "../utils/address";
import AddressPickerModal from "../components/AddressPickerModal";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";

const formatAmount = (value = 0) => {
  const rounded = Number(value || 0).toFixed(2).replace(/\.?0+$/, "");
  return `Rs ${rounded || "0"}`;
};

export default function CartScreen({ route, navigation }: any) {
  const { items, clear, removeItem, updateQuantity } = useCart();
  const layout = useResponsiveLayout();
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [pricingQuote, setPricingQuote] = useState<OrderPricingQuote | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [locationResolving, setLocationResolving] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [addressPickerVisible, setAddressPickerVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const instructionsOffsetY = useRef(0);
  const hasProfileRef = useRef(false);

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
  const platformFee = pricingQuote?.platformFee ?? 0;
  const total =
    pricingQuote?.payableTotal ??
    subtotal + deliveryFee + foodGst + platformFee;

  const getSelectedAddress = (): SavedAddress | string | undefined => pickSavedAddress(userProfile);

  const openAddressPicker = () => {
    if (items.length > 0) {
      Alert.alert(
        "Address locked",
        "You can't change the delivery address while items are in your cart. Clear the cart, or change the address from Home (that will clear your cart)."
      );
      return;
    }
    setAddressPickerVisible(true);
  };

  const openAddAddress = () => {
    setAddressPickerVisible(false);
    navigation.navigate("Profile", { manageAddress: "add", returnAfterSave: true });
  };

  const handleAddressSelected = (profile: UserProfile) => {
    setUserProfile(profile);
    setAddressPickerVisible(false);
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

  const getDeliveryLocation = () => parseAddressCoordinates(getSelectedAddress());

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

  const geocodeAndSaveDeliveryLocation = async (options?: { alert?: boolean }) => {
    const address = getSelectedAddress();
    if (!address) {
      if (options?.alert) {
        Alert.alert("Address Required", "Please add your delivery address before placing the order.", [
          { text: "Cancel", style: "cancel" },
          { text: "Add Address", onPress: openAddAddress }
        ]);
      }
      return undefined;
    }

    if (typeof address === "string") {
      const pinResult = await resolveAddressPin({ street: address, country: "India" });
      if (!pinResult.success || !pinResult.data) {
        Alert.alert("Address not found", pinResult.message || "Please check the street, area, city, and pincode in Profile.");
        return undefined;
      }
      return { latitude: pinResult.data.latitude, longitude: pinResult.data.longitude };
    }

    const payload: SavedAddress = {
      ...address,
      addressId: address._id,
      isDefault: address.isDefault ?? true
    } as SavedAddress & { addressId?: string };

    const response = await updateUserAddress(payload);
    if (!response.success || !response.data) {
      Alert.alert("Location Save Failed", response.message || "Could not save your delivery map pin.");
      return undefined;
    }

    setUserProfile(response.data);
    const saved =
      response.data.addresses?.find((entry) => entry._id && entry._id === address._id) ||
      response.data.addresses?.find((entry) => entry.isDefault) ||
      response.data.address ||
      response.data.addresses?.[0];
    if (
      saved &&
      typeof saved.latitude === "number" &&
      typeof saved.longitude === "number" &&
      Number.isFinite(saved.latitude) &&
      Number.isFinite(saved.longitude)
    ) {
      return { latitude: saved.latitude, longitude: saved.longitude };
    }

    Alert.alert("Address not found", "Please check the street, area, city, and pincode in Profile.");
    return undefined;
  };

  const resolveDeliveryLocationForPricing = useCallback(
    async (options?: { alert?: boolean }) => {
      const saved = parseAddressCoordinates(pickSavedAddress(userProfile));
      if (saved) {
        return saved;
      }

      return geocodeAndSaveDeliveryLocation(options);
    },
    [userProfile]
  );

  const loadDeliveryPricing = useCallback(async () => {
    if (groupedItems.length === 0) {
      setPricingQuote(null);
      setPricingError(null);
      return;
    }

    if (loadingProfile) {
      return;
    }

    setLocationResolving(true);
    setPricingError(null);

    try {
      const deliveryLocation = await resolveDeliveryLocationForPricing();
      if (!deliveryLocation) {
        setPricingQuote(null);
        setPricingError(
          pickSavedAddress(userProfile)
            ? "Could not locate this address on the map. Edit it in Profile."
            : "Add a delivery address in Profile to calculate the fee."
        );
        return;
      }

      await fetchPricingQuote(deliveryLocation);
    } finally {
      setLocationResolving(false);
    }
  }, [fetchPricingQuote, groupedItems.length, loadingProfile, resolveDeliveryLocationForPricing, userProfile]);

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
        Alert.alert("Address Required", "Please add your delivery address before placing the order.", [
          { text: "Cancel", style: "cancel" },
          { text: "Add Address", onPress: openAddAddress }
        ]);
        return;
      }

      const deliveryLocation = await resolveDeliveryLocationForPricing({ alert: true });
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
      Alert.alert("Address Error", error.message || "Could not use your saved delivery address.");
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
        <Text style={styles.title} numberOfLines={1}>Your Cart</Text>
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
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 128 + insets.bottom, paddingHorizontal: layout.isTablet ? 8 : 0 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          >
            {groupedItems.map((group) => (
              <View key={group.shopId} style={styles.shopCard}>
                <View style={styles.shopCardHeader}>
                  <View style={styles.shopHeaderText}>
                    <Text style={styles.shopName} numberOfLines={2}>{group.shopName}</Text>
                    <Text style={styles.shopSubtext}>{group.items.length} item{group.items.length === 1 ? "" : "s"}</Text>
                  </View>
                  <Text style={styles.shopSubtotal}>{formatAmount(group.subtotal)}</Text>
                </View>

                {group.items.map((item) => (
                  <View key={`${item.shopId}-${item.lineKey || item.menuItemId || item.name}`} style={styles.itemCard}>
                    <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
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
                {items.length > 0 ? (
                  <Text style={styles.lockedAddressHint}>Locked</Text>
                ) : (
                  <TouchableOpacity onPress={getSelectedAddress() ? openAddressPicker : openAddAddress}>
                    <Text style={styles.linkText}>{getSelectedAddress() ? "Change" : "Add Address"}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.addressName}>{userProfile?.name || "Customer"}</Text>
              <Text style={styles.addressPhone}>{userProfile?.phone}</Text>
              <Text style={styles.addressText}>{formatAddress()}</Text>
              {items.length > 0 ? (
                <Text style={styles.addressLockNote}>
                  Address can’t be changed with items in cart. Change it from Home to clear the cart and browse nearby shops.
                </Text>
              ) : null}

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
                placeholder="Gate number, don't ring bell, leave at door..."
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
              <Text style={styles.instructionsHint}>Shown only to your delivery partner.</Text>
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
                <Text style={styles.summaryValue}>{formatAmount(foodGst)}</Text>
              </View>
              {platformFee > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Platform fee</Text>
                  <Text style={styles.summaryValue}>{formatAmount(platformFee)}</Text>
                </View>
              ) : null}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>{formatAmount(total)}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
            <View style={styles.footerTotalBlock}>
              <Text style={styles.footerLabel}>Total</Text>
              <Text style={styles.footerTotal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {formatAmount(total)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutButton, !canCheckout && styles.checkoutButtonDisabled]}
              onPress={proceedToPayment}
              disabled={!canCheckout}
            >
              <Text style={styles.checkoutButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {isPricingPending ? "Calculating fee..." : "Continue to Payment"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      <AddressPickerModal
        visible={addressPickerVisible}
        profile={userProfile}
        onClose={() => setAddressPickerVisible(false)}
        onSelected={handleAddressSelected}
        onAddNew={openAddAddress}
      />
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
    paddingBottom: 12,
    gap: 12
  },
  title: {
    flex: 1,
    minWidth: 0,
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
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10
  },
  shopHeaderText: {
    flex: 1,
    minWidth: 0
  },
  shopName: {
    flexShrink: 1,
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
    borderTopColor: "#F4EAE0",
    gap: 8
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
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
    alignItems: "flex-end",
    flexShrink: 0
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
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 10
  },
  deliveryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  linkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF6B35"
  },
  lockedAddressHint: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9A8F85"
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
  addressLockNote: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    color: "#8B6A54"
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
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8
  },
  summaryLabel: {
    flex: 1,
    minWidth: 0,
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
    alignItems: "center",
    gap: 12
  },
  footerTotalBlock: {
    flexShrink: 0,
    maxWidth: "38%"
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
    flex: 1,
    minWidth: 0,
    backgroundColor: "#FF6B35",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center"
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
