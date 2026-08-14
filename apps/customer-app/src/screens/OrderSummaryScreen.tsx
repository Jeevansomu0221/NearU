// apps/customer-app/src/screens/OrderSummaryScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from "react-native";
import { useCart } from "../context/CartContext";
import { getUserProfile } from "../api/user.api";
import { getSelectedAddress as pickSavedAddress } from "../utils/address";
import AddressPickerModal from "../components/AddressPickerModal";

export default function OrderSummaryScreen({ route, navigation }: any) {
  const { shop } = route.params;
  const { items, getCartTotal } = useCart();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addressPickerVisible, setAddressPickerVisible] = useState(false);

  useEffect(() => {
    loadUserProfile();
    const unsubscribe = navigation.addListener("focus", () => {
      loadUserProfile();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserProfile = async () => {
    try {
      const response = await getUserProfile();
      if (response.success && response.data) {
        setUserProfile(response.data);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((sum: any, item: any) => sum + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const deliveryFee = 49;
    return subtotal + deliveryFee;
  };

  const getSelectedAddress = () => pickSavedAddress(userProfile);

  const formatAddress = () => {
    const selected = getSelectedAddress();
    if (!selected) {
      return "No address saved";
    }
    
    if (typeof selected === "string") {
      return selected;
    }

    const addr = selected;
    const parts = [
      addr.recipientName,
      [addr.houseFlatDoorNo, addr.buildingApartmentName].filter(Boolean).join(", ") || addr.street || addr.roadStreet,
      addr.streetRoadName,
      addr.areaLocality || addr.area,
      addr.landmark ? `Near ${addr.landmark}` : null,
      [addr.cityTownVillage || addr.city, addr.district ? `${addr.district} District` : null, addr.state].filter(Boolean).join(", ") +
        (addr.pincode ? ` - ${addr.pincode}` : ""),
      addr.country || "India"
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  const handleProceedToPayment = () => {
    if (!getSelectedAddress()) {
      Alert.alert(
        "Address Required",
        "Please add delivery address before proceeding",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Add Address", 
            onPress: () => navigation.navigate("Profile", { manageAddress: "add", returnAfterSave: true })
          }
        ]
      );
      return;
    }
    
    navigation.navigate("Payment", {
      shop,
      userProfile,
      orderSummary: {
        items,
        subtotal: calculateSubtotal(),
        deliveryFee: 49,
        total: calculateTotal(),
        address: formatAddress()
      }
    });
  };

  const handleBackToCart = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Order Summary</Text>
        <Text style={styles.subtitle}>Review your order before payment</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Restaurant Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Restaurant</Text>
          <Text style={styles.shopName}>{shop.shopName || shop.restaurantName}</Text>
          <Text style={styles.shopCategory}>{shop.category || "Restaurant"}</Text>
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <TouchableOpacity onPress={() => setAddressPickerVisible(true)}>
              <Text style={styles.changeText}>Change</Text>
            </TouchableOpacity>
          </View>
          
          {getSelectedAddress() ? (
            <>
              <Text style={styles.userName}>{userProfile.name}</Text>
              <Text style={styles.userPhone}>📱 {userProfile.phone}</Text>
              <Text style={styles.addressText}>{formatAddress()}</Text>
            </>
          ) : (
            <View style={styles.noAddressContainer}>
              <Text style={styles.noAddressText}>No address saved</Text>
              <TouchableOpacity 
                style={styles.addAddressButton}
                onPress={() => setAddressPickerVisible(true)}
              >
                <Text style={styles.addAddressButtonText}>Add Address</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {items.map((item: any, index: number) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>₹{item.price} × {item.quantity}</Text>
              </View>
              <Text style={styles.itemTotal}>₹{item.price * item.quantity}</Text>
            </View>
          ))}
        </View>

        {/* Price Breakdown */}
        <View style={styles.priceSection}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>₹{calculateSubtotal()}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Delivery Fee</Text>
            <Text style={styles.priceValue}>₹49</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Platform Fee</Text>
            <Text style={styles.priceValue}>₹0</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{calculateTotal()}</Text>
          </View>
          <Text style={styles.taxNote}>*Inclusive of all taxes</Text>
        </View>
      </ScrollView>

      {/* Footer with Buttons */}
      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total</Text>
          <Text style={styles.footerTotalValue}>₹{calculateTotal()}</Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToCart}
          >
            <Text style={styles.backButtonText}>Back to Cart</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.paymentButton,
              (!getSelectedAddress() || items.length === 0) && styles.paymentButtonDisabled
            ]}
            onPress={handleProceedToPayment}
            disabled={!getSelectedAddress() || items.length === 0}
          >
            <Text style={styles.paymentButtonText}>
              {!getSelectedAddress() ? "Add Address First" : "Proceed to Payment"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <AddressPickerModal
        visible={addressPickerVisible}
        profile={userProfile}
        onClose={() => setAddressPickerVisible(false)}
        onSelected={(profile) => {
          setUserProfile(profile);
          setAddressPickerVisible(false);
        }}
        onAddNew={() => {
          setAddressPickerVisible(false);
          navigation.navigate("Profile", { manageAddress: "add", returnAfterSave: true });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  changeText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  shopName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  shopCategory: {
    fontSize: 14,
    color: '#666',
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  noAddressContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noAddressText: {
    fontSize: 14,
    color: '#FF6B35',
    marginBottom: 12,
  },
  addAddressButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  addAddressButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  priceSection: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    margin: 16,
    borderRadius: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B35',
  },
  taxNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  footerTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  footerTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  footerTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentButton: {
    flex: 2,
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  paymentButtonDisabled: {
    backgroundColor: '#FFB08F',
  },
  paymentButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
