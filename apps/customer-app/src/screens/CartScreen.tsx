import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";
import { getUserProfile, type UserProfile } from "../api/user.api";

interface CartItem {
  _id?: string;
  name: string;
  price: number;
  quantity: number;
  shopId: string;
  shopName: string;
  menuItemId?: string;
}

export default function CartScreen({ route, navigation }: any) {
  const { items, clear, removeItem, updateQuantity } = useCart();
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [note, setNote] = useState("");
  const insets = useSafeAreaInsets();

  const loadUserProfile = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const response = await getUserProfile();
      if (response.success && response.data) {
        setUserProfile(response.data);
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

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadUserProfile);
    return unsubscribe;
  }, [navigation, loadUserProfile]);

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

  const deliveryFee = groupedItems.length * 49;
  const subtotal = items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);
  const total = subtotal + deliveryFee;

  const formatAddress = () => {
    if (!userProfile?.address) {
      return "No address saved. Please add delivery address in Profile.";
    }

    if (typeof userProfile.address === "string") {
      return userProfile.address;
    }

    const addr = userProfile.address;
    return [addr.street, addr.area, addr.landmark ? `Near ${addr.landmark}` : null, `${addr.city}, ${addr.state} - ${addr.pincode}`]
      .filter(Boolean)
      .join(", ");
  };

  const proceedToPayment = async () => {
    if (items.length === 0) {
      Alert.alert("Cart Empty", "Please add items to cart first");
      return;
    }

    if (!userProfile?.address) {
      Alert.alert("Address Required", "Please add your delivery address in Profile before placing order.", [
        { text: "Cancel", style: "cancel" },
        { text: "Add Address", onPress: () => navigation.navigate("Profile") }
      ]);
      return;
    }

    navigation.navigate("Payment", {
      userProfile,
      orderSummary: {
        items,
        subtotal,
        deliveryFee,
        total,
        address: formatAddress(),
        note,
        groupedShops: groupedItems
      }
    });
  };

  const handleRemoveItem = (item: CartItem) => {
      Alert.alert("Remove Item", "Remove this item from cart?", [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => removeItem(item) }
      ]);
  };

  const handleQuantityChange = (item: CartItem, change: number) => {
    const newQuantity = item.quantity + change;
    if (newQuantity > 0) {
      updateQuantity(item, newQuantity);
    } else {
      handleRemoveItem(item);
    }
  };

  if (loadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading cart...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
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
            style={styles.itemsContainer}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 128 + insets.bottom }]}
          >
            {groupedItems.map((group) => (
              <View key={group.shopId} style={styles.shopCard}>
                <View style={styles.shopCardHeader}>
                  <View>
                    <Text style={styles.shopName}>{group.shopName}</Text>
                    <Text style={styles.shopSubtext}>{group.items.length} item{group.items.length === 1 ? "" : "s"}</Text>
                  </View>
                  <Text style={styles.shopSubtotal}>Rs {group.subtotal}</Text>
                </View>

                {group.items.map((item) => (
                  <View key={`${item.shopId}-${item.menuItemId || item.name}`} style={styles.itemCard}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemPrice}>Rs {item.price} each</Text>
                    </View>

                    <View style={styles.itemActions}>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity style={styles.quantityButton} onPress={() => handleQuantityChange(item, -1)}>
                          <Text style={styles.quantityButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity style={styles.quantityButton} onPress={() => handleQuantityChange(item, 1)}>
                          <Text style={styles.quantityButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveItem(item)}>
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
                  <Text style={styles.linkText}>{userProfile?.address ? "Change" : "Add Address"}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.addressName}>{userProfile?.name || "Customer"}</Text>
              <Text style={styles.addressPhone}>{userProfile?.phone}</Text>
              <Text style={styles.addressText}>{formatAddress()}</Text>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Special Instructions</Text>
              <TextInput
                style={styles.instructionsInput}
                value={note}
                onChangeText={setNote}
                placeholder="Add delivery notes, gate number, less spicy, no onions..."
                placeholderTextColor="#98A2B3"
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.instructionsHint}>These instructions will be attached to your order.</Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items Total</Text>
                <Text style={styles.summaryValue}>Rs {subtotal}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee ({groupedItems.length} restaurant{groupedItems.length === 1 ? "" : "s"})</Text>
                <Text style={styles.summaryValue}>Rs {deliveryFee}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>Rs {total}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
            <View>
              <Text style={styles.footerLabel}>Total</Text>
              <Text style={styles.footerTotal}>Rs {total}</Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutButton, (!userProfile?.address || loading) && styles.checkoutButtonDisabled]}
              onPress={proceedToPayment}
              disabled={loading || !userProfile?.address}
            >
              <Text style={styles.checkoutButtonText}>Continue to Payment</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
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
  }
});
