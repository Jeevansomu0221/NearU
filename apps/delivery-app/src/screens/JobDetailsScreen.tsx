import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform
} from "react-native";
import { 
  getJobDetails, 
  markAsPickedUp, 
  markAsDelivered,
  DeliveryOrder 
} from "../api/delivery.api";
import { Ionicons } from "@expo/vector-icons";
import * as Location from 'expo-location';

interface Props {
  route: any;
  navigation: any;
}

export default function JobDetailsScreen({ route, navigation }: Props) {
  const { orderId, job: initialJob } = route.params;
  const [job, setJob] = useState<DeliveryOrder | null>(initialJob || null);
  const [loading, setLoading] = useState(!initialJob);
  const [updating, setUpdating] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    if (!initialJob) {
      loadJobDetails();
    }
    
    // Get current location
    (async () => {
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
    })();
  }, []);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      const response = await getJobDetails(orderId);
      if (response.success && response.data) {
        setJob(response.data);
      } else {
        Alert.alert("Error", response.message || "Failed to load job details");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error loading job details:", error);
      Alert.alert("Error", "Failed to load job details");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleOpenMaps = (address: string) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(address)}`,
      android: `geo:0,0?q=${encodeURIComponent(address)}`,
    });
    if (url) {
      Linking.openURL(url);
    }
  };

  const handlePickUp = async () => {
    try {
      setUpdating(true);
      
      // Get current location
      let location;
      try {
        location = await Location.getCurrentPositionAsync({});
      } catch (error) {
        console.error("Error getting location:", error);
      }

      const response = await markAsPickedUp(
        orderId,
        location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        } : undefined
      );

      if (response.success) {
        Alert.alert(
          "Success!",
          "Order marked as picked up.\n\nPlease deliver to the customer now.",
          [
            {
              text: "OK",
              onPress: () => {
                setJob(response.data || null);
                navigation.navigate("MyJobs");
              }
            }
          ]
        );
      } else {
        Alert.alert("Error", response.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Error marking as picked up:", error);
      Alert.alert("Error", "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeliver = async () => {
  if (job?.paymentMethod === "CASH_ON_DELIVERY") {
    // For COD orders, show amount collection dialog
    Alert.prompt(
      "Collect Payment",
      `Please collect ₹${job.grandTotal} from the customer`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Collected",
          onPress: async (amount: string | undefined) => {
            const collectedAmount = amount ? parseFloat(amount) : job.grandTotal;
            await confirmDelivery(collectedAmount);
          }
        }
      ],
      "plain-text",
      job.grandTotal.toString()
    );
  } else {
    // For pre-paid orders, just confirm delivery
    await confirmDelivery();
  }
};

  const confirmDelivery = async (collectedAmount?: number) => {
    try {
      setUpdating(true);
      
      // Get current location
      let location;
      try {
        location = await Location.getCurrentPositionAsync({});
      } catch (error) {
        console.error("Error getting location:", error);
      }

      const response = await markAsDelivered(
        orderId,
        location ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        } : undefined,
        collectedAmount
      );

      if (response.success) {
        Alert.alert(
          "Delivery Complete!",
          `Order delivered successfully!\n\n` +
          `💰 Earned: ₹${job?.deliveryFee || 49}\n` +
          `🎉 Thank you for the delivery!`,
          [
            {
              text: "Done",
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Jobs" }],
                });
              }
            }
          ]
        );
      } else {
        Alert.alert("Error", response.message || "Failed to complete delivery");
      }
    } catch (error) {
      console.error("Error marking as delivered:", error);
      Alert.alert("Error", "Failed to complete delivery");
    } finally {
      setUpdating(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>
            Order #{job._id.slice(-6).toUpperCase()}
          </Text>
          <View style={[
            styles.statusBadge,
            job.status === "ASSIGNED" && styles.statusAssigned,
            job.status === "PICKED_UP" && styles.statusPickedUp,
          ]}>
            <Text style={styles.statusText}>
              {job.status.replace("_", " ")}
            </Text>
          </View>
        </View>
        <Text style={styles.orderTime}>
          {formatDate(job.createdAt)} • {formatTime(job.createdAt)}
        </Text>
      </View>

      {/* Pickup Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="restaurant" size={20} color="#2E7D32" />
          <Text style={styles.sectionTitle}>Pickup from Restaurant</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.restaurantName}>
            {job.partnerId?.restaurantName || job.partnerId?.shopName || "Restaurant"}
          </Text>
          <Text style={styles.addressText}>
            📍 {job.partnerId?.address || "Address not available"}
          </Text>
          {job.partnerId?.phone && (
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => handleCall(job.partnerId!.phone)}
            >
              <Ionicons name="call" size={16} color="#4CAF50" />
              <Text style={styles.contactButtonText}>
                Call Restaurant: {job.partnerId.phone}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => handleOpenMaps(job.partnerId?.address || "")}
          >
            <Ionicons name="navigate" size={16} color="#1976D2" />
            <Text style={styles.mapButtonText}>Open in Maps</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delivery Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="home" size={20} color="#1976D2" />
          <Text style={styles.sectionTitle}>Deliver to Customer</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.customerName}>
            👤 {job.customerId?.name || "Customer"}
          </Text>
          <Text style={styles.addressText}>
            📍 {job.deliveryAddress}
          </Text>
          {job.customerId?.phone && (
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => handleCall(job.customerId!.phone)}
            >
              <Ionicons name="call" size={16} color="#4CAF50" />
              <Text style={styles.contactButtonText}>
                Call Customer: {job.customerId.phone}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => handleOpenMaps(job.deliveryAddress)}
          >
            <Ionicons name="navigate" size={16} color="#1976D2" />
            <Text style={styles.mapButtonText}>Open in Maps</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Order Details */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="receipt" size={20} color="#FF9800" />
          <Text style={styles.sectionTitle}>Order Details</Text>
        </View>
        <View style={styles.orderDetailsCard}>
          {job.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.name}</Text>
              <View style={styles.itemDetails}>
                <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
              </View>
            </View>
          ))}
          
          <View style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Item Total</Text>
            <Text style={styles.totalValue}>₹{job.itemTotal}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Delivery Fee</Text>
            <Text style={styles.totalValue}>₹{job.deliveryFee}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total Amount</Text>
            <Text style={styles.grandTotalValue}>₹{job.grandTotal}</Text>
          </View>
          
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Method:</Text>
            <Text style={[
              styles.paymentValue,
              job.paymentMethod === "CASH_ON_DELIVERY" ? styles.codText : styles.paidText
            ]}>
              {job.paymentMethod === "CASH_ON_DELIVERY" ? "💰 Cash on Delivery" : "✅ Online Paid"}
            </Text>
          </View>
          
          {job.paymentMethod === "CASH_ON_DELIVERY" && (
            <View style={styles.amountCard}>
              <Ionicons name="cash" size={24} color="#4CAF50" />
              <Text style={styles.amountText}>
                Collect ₹{job.grandTotal} on delivery
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Customer Note */}
      {job.note && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color="#9C27B0" />
            <Text style={styles.sectionTitle}>Customer Note</Text>
          </View>
          <View style={styles.noteCard}>
            <Text style={styles.noteText}>{job.note}</Text>
          </View>
        </View>
      )}

      {/* Earnings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cash" size={20} color="#4CAF50" />
          <Text style={styles.sectionTitle}>Your Earnings</Text>
        </View>
        <View style={styles.earningsCard}>
          <View style={styles.earningRow}>
            <Text style={styles.earningLabel}>Delivery Fee</Text>
            <Text style={styles.earningValue}>₹{job.deliveryFee}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalEarningRow}>
            <Text style={styles.totalEarningLabel}>You'll Earn</Text>
            <Text style={styles.totalEarningValue}>₹{job.deliveryFee}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      {job.status === "ASSIGNED" && (
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handlePickUp}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Mark as Picked Up</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.actionHint}>
            Click this when you've collected the order from the restaurant
          </Text>
        </View>
      )}

      {job.status === "PICKED_UP" && (
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.deliverButton]}
            onPress={handleDeliver}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>
                  {job.paymentMethod === "CASH_ON_DELIVERY" 
                    ? "Collect Cash & Mark Delivered" 
                    : "Mark as Delivered"}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.actionHint}>
            {job.paymentMethod === "CASH_ON_DELIVERY"
              ? `Collect ₹${job.grandTotal} from customer before marking as delivered`
              : "Click after delivering to the customer"}
          </Text>
        </View>
      )}

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
  },
  statusAssigned: {
    backgroundColor: '#2196F3',
  },
  statusPickedUp: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  orderTime: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: '500',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapButtonText: {
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 8,
    fontWeight: '500',
  },
  orderDetailsCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    marginRight: 16,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  codText: {
    color: '#FF9800',
  },
  paidText: {
    color: '#4CAF50',
  },
  amountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginLeft: 12,
  },
  noteCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  earningsCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  earningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  earningLabel: {
    fontSize: 14,
    color: '#666',
  },
  earningValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalEarningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  totalEarningLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  totalEarningValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  actionSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deliverButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  spacer: {
    height: 40,
  },
});