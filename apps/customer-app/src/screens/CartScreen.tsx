// apps/customer-app/src/screens/CartScreen.tsx
import React, { useState } from "react";
import { 
  View, 
  Text, 
  Button, 
  Alert, 
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from "react-native";
import { useCart } from "../context/CartContext";
import { createShopOrder } from "../api/order.api";

// Define proper types
interface CartItem {
  _id?: string;
  name: string;
  price: number;
  quantity: number;
  shopId: string;
  shopName: string;
  menuItemId?: string;
}

interface OrderResponse {
  success: boolean;
  data: {
    _id: string;
    status: string;
    grandTotal: number;
  };
  message: string;
}

export default function CartScreen({ route, navigation }: any) {
  const { shop } = route.params;
  const { items, clear, removeItem, updateQuantity, getCartTotal } = useCart();
  const [loading, setLoading] = useState(false);

  const calculateSubtotal = () => {
    return items.reduce((sum: number, item: CartItem) => sum + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const deliveryFee = 49; // Fixed delivery fee
    return subtotal + deliveryFee;
  };

  const placeOrder = async () => {
    if (items.length === 0) {
      Alert.alert("Cart Empty", "Please add items to cart first");
      return;
    }

    try {
      setLoading(true);
      
      // Prepare order items for backend
      const orderItems = items.map((item: CartItem) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        menuItemId: item.menuItemId || item._id || "temp-id" // Send menuItemId for validation
      }));

      console.log("Placing order with items:", orderItems);
      console.log("Shop ID:", shop._id);

      const response = await createShopOrder(
        shop._id,
        "My Home Address, Hyderabad", // TODO: Get actual address from user profile
        orderItems,
        "" // Optional note
      );

      console.log("Order response:", response.data);

      const orderData = response.data as OrderResponse;
      
      if (orderData.success) {
        Alert.alert(
          "🎉 Order Placed!", 
          `Your order #${orderData.data._id.slice(-6)} has been placed successfully.\n\nTotal: ₹${orderData.data.grandTotal}\nStatus: ${orderData.data.status}`,
          [
            {
              text: "View Order Status",
              onPress: () => {
                clear();
                navigation.replace("OrderStatus", { 
                  orderId: orderData.data._id 
                });
              }
            },
            {
              text: "Continue Shopping",
              onPress: () => {
                clear();
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        Alert.alert("Order Failed", orderData.message || "Failed to place order");
      }
    } catch (error: any) {
      console.error("Order error:", error);
      
      let errorMessage = "Failed to place order. Please try again.";
      
      if (error.response) {
        // Server responded with error
        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 400) {
          errorMessage = "Invalid request. Please check your cart items.";
        } else if (error.response.status === 401) {
          errorMessage = "Please login again to place order.";
          navigation.navigate("Login");
        } else if (error.response.status === 404) {
          errorMessage = "Restaurant not found or closed.";
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = "Network error. Please check your internet connection.";
      }
      
      Alert.alert("Order Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = (itemName: string) => {
    Alert.alert(
      "Remove Item",
      "Are you sure you want to remove this item from cart?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", onPress: () => removeItem(itemName), style: "destructive" }
      ]
    );
  };

  const handleQuantityChange = (itemName: string, change: number) => {
    const item = items.find((i: CartItem) => i.name === itemName);
    if (item) {
      const newQuantity = item.quantity + change;
      if (newQuantity > 0) {
        updateQuantity(itemName, newQuantity);
      } else {
        handleRemoveItem(itemName);
      }
    }
  };

  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>🛒 Your cart is empty</Text>
      <Text style={styles.emptySubText}>
        Add delicious items from the menu to get started!
      </Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.browseButtonText}>Browse Menu</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCartItems = () => (
    <>
      <ScrollView style={styles.itemsContainer}>
        <View style={styles.shopInfo}>
          <Text style={styles.shopName}>{shop.shopName || shop.restaurantName}</Text>
          <Text style={styles.shopCategory}>{shop.category || "Restaurant"}</Text>
        </View>

        {items.map((item: CartItem, idx: number) => (
          <View key={`${item.name}-${idx}`} style={styles.itemCard}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>₹{item.price} each</Text>
            </View>
            
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(item.name, -1)}
                disabled={loading}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              
              <Text style={styles.quantityText}>{item.quantity}</Text>
              
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(item.name, 1)}
                disabled={loading}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.itemTotal}>
              <Text style={styles.itemTotalText}>₹{item.price * item.quantity}</Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveItem(item.name)}
                disabled={loading}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{calculateSubtotal()}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>₹49</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Platform Fee</Text>
            <Text style={styles.summaryValue}>₹0</Text>
          </View>
          
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total Amount</Text>
            <Text style={styles.grandTotalValue}>₹{calculateTotal()}</Text>
          </View>
          
          <View style={styles.taxNote}>
            <Text style={styles.taxNoteText}>
              *Inclusive of all taxes
            </Text>
          </View>
        </View>
        
        <View style={styles.deliveryInfo}>
          <Text style={styles.deliveryTitle}>Delivery Address</Text>
          <Text style={styles.deliveryAddress}>
            My Home Address, Hyderabad
          </Text>
          <TouchableOpacity>
            <Text style={styles.changeAddressText}>Change</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total</Text>
          <Text style={styles.footerTotalValue}>₹{calculateTotal()}</Text>
        </View>
        
        <TouchableOpacity
          style={[styles.placeOrderButton, loading && styles.placeOrderButtonDisabled]}
          onPress={placeOrder}
          disabled={loading || items.length === 0}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.placeOrderButtonText}>
              {items.length === 0 ? "Cart Empty" : `Place Order • ₹${calculateTotal()}`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Cart</Text>
        {items.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              Alert.alert(
                "Clear Cart",
                "Are you sure you want to clear all items?",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Clear", onPress: clear, style: "destructive" }
                ]
              );
            }}
            disabled={loading}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {items.length === 0 ? renderEmptyCart() : renderCartItems()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffebee',
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  browseButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  shopInfo: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    marginBottom: 8,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  shopCategory: {
    fontSize: 14,
    color: '#666',
  },
  itemsContainer: {
    flex: 1,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '500',
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  itemTotal: {
    alignItems: 'flex-end',
  },
  itemTotalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
    marginBottom: 4,
  },
  removeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ffebee',
    borderRadius: 4,
  },
  removeButtonText: {
    fontSize: 12,
    color: '#f44336',
    fontWeight: '500',
  },
  summaryContainer: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    margin: 16,
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B35',
  },
  taxNote: {
    marginTop: 8,
  },
  taxNoteText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  deliveryInfo: {
    padding: 16,
    backgroundColor: '#f0f7ff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  deliveryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  deliveryAddress: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  changeAddressText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
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
    marginBottom: 12,
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
  placeOrderButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  placeOrderButtonDisabled: {
    backgroundColor: '#FFB08F',
  },
  placeOrderButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});