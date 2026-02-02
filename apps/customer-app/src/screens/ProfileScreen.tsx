// apps/customer-app/src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator
} from "react-native";
import { 
  getUserProfile, 
  updateUserProfile, 
  updateUserAddress,
  type UserProfile  // Import the type from user.api
} from "../api/user.api";
import { getMyOrders } from "../api/order.api";
import type { ApiResponse } from "../api/client"; // Import ApiResponse from client

interface Order {
  _id: string;
  status: string;
  grandTotal: number;
  createdAt: string;
  partnerId: {
    restaurantName: string;
  };
}

export default function ProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");

  const loadProfile = async () => {
  try {
    setLoading(true);
    const profileResponse = await getUserProfile();
    
    // No need for type casting - it's already typed
    if (profileResponse.success) {
      const userData = profileResponse.data!; // Using non-null assertion since we checked success
      setProfile(userData);
      
      // Set form values
      setName(userData.name || "");
      setEmail(userData.email || "");
      
      if (userData.address) {
        setStreet(userData.address.street || "");
        setCity(userData.address.city || "");
        setState(userData.address.state || "");
        setPincode(userData.address.pincode || "");
        setArea(userData.address.area || "");
        setLandmark(userData.address.landmark || "");
      } else {
        // Reset address fields if no address exists
        setStreet("");
        setCity("");
        setState("");
        setPincode("");
        setArea("");
        setLandmark("");
      }
      
      // Load orders
      const ordersResponse = await getMyOrders();
      if (ordersResponse.success) {
        setOrders(ordersResponse.data!.slice(0, 5)); // Last 5 orders
      }
    } else {
      Alert.alert("Error", profileResponse.message || "Failed to load profile");
    }
  } catch (error: any) {
    console.error("Error loading profile:", error);
    Alert.alert("Error", error.message || "Failed to load profile");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      console.log("=== STARTING PROFILE UPDATE ===");
      console.log("Profile data:", { name, email });
      console.log("Address data:", { street, city, state, pincode, area, landmark });
      
      // Validate required fields
      if (!name.trim()) {
        Alert.alert("Error", "Name is required");
        setSaving(false);
        return;
      }
      
      // Validate pincode if provided
      if (pincode && !/^\d{6}$/.test(pincode)) {
        Alert.alert("Error", "Pincode must be exactly 6 digits");
        setSaving(false);
        return;
      }
      
      // Update basic profile
      const profileResult = await updateUserProfile({
        name: name.trim(),
        email: email.trim() || undefined
      });
      
      console.log("Profile update response:", profileResult);
      
      // Update address
      const addressResult = await updateUserAddress({
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        area: area.trim(),
        landmark: landmark.trim() || undefined
      });
      
      console.log("Address update response:", addressResult);
      
      // Check if both updates were successful
      if (profileResult.success && addressResult.success) {
        Alert.alert("Success", "Profile updated successfully");
        setEditing(false);
        loadProfile(); // Reload updated data
      } else {
        Alert.alert(
          "Error", 
          profileResult.message || addressResult.message || "Failed to update profile"
        );
      }
    } catch (error: any) {
      console.error("=== PROFILE UPDATE ERROR ===");
      console.error("Error:", error);
      console.error("Error message:", error.message);
      console.error("Error response:", error.response?.data);
      
      // Show user-friendly error message
      let errorMessage = "Failed to update profile";
      if (error.message?.includes("Network Error")) {
        errorMessage = "Cannot connect to server. Please check your connection.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return '#4CAF50';
      case 'CONFIRMED': return '#2196F3';
      case 'PREPARING': return '#FF9800';
      case 'READY': return '#9C27B0';
      case 'CANCELLED': return '#F44336';
      default: return '#666';
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          onPress: () => {
            // Add your logout logic here
            // e.g., clear token, navigate to login
            navigation.navigate("Login");
          },
          style: "destructive"
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {profile?.name?.charAt(0).toUpperCase() || "U"}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{profile?.name || "User"}</Text>
          <Text style={styles.userPhone}>📱 {profile?.phone}</Text>
          {profile?.email && (
            <Text style={styles.userEmail}>📧 {profile.email}</Text>
          )}
        </View>
      </View>

      {/* Edit/Save Button */}
      <View style={styles.editContainer}>
        {editing ? (
          <View style={styles.editButtons}>
            <TouchableOpacity
              style={[styles.editButton, styles.cancelButton]}
              onPress={() => {
                setEditing(false);
                // Reset form to original values
                if (profile) {
                  setName(profile.name || "");
                  setEmail(profile.email || "");
                  if (profile.address) {
                    setStreet(profile.address.street || "");
                    setCity(profile.address.city || "");
                    setState(profile.address.state || "");
                    setPincode(profile.address.pincode || "");
                    setArea(profile.address.area || "");
                    setLandmark(profile.address.landmark || "");
                  }
                }
              }}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.editButton, styles.saveButton]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditing(true)}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name:</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              editable={!saving}
            />
          ) : (
            <Text style={styles.infoValue}>{profile?.name || "Not set"}</Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!saving}
            />
          ) : (
            <Text style={styles.infoValue}>{profile?.email || "Not set"}</Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone:</Text>
          <Text style={styles.infoValue}>{profile?.phone}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Member Since:</Text>
          <Text style={styles.infoValue}>
            {profile ? formatDate(profile.createdAt) : "N/A"}
          </Text>
        </View>
      </View>

      {/* Delivery Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        
        {editing ? (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Street/House No:</Text>
              <TextInput
                style={styles.input}
                value={street}
                onChangeText={setStreet}
                placeholder="Enter street address"
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Area/Locality:</Text>
              <TextInput
                style={styles.input}
                value={area}
                onChangeText={setArea}
                placeholder="Enter area/locality"
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Landmark (Optional):</Text>
              <TextInput
                style={styles.input}
                value={landmark}
                onChangeText={setLandmark}
                placeholder="Nearby landmark"
                editable={!saving}
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>City:</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  editable={!saving}
                />
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>State:</Text>
                <TextInput
                  style={styles.input}
                  value={state}
                  onChangeText={setState}
                  placeholder="State"
                  editable={!saving}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pincode:</Text>
              <TextInput
                style={styles.input}
                value={pincode}
                onChangeText={setPincode}
                placeholder="6-digit pincode"
                keyboardType="number-pad"
                maxLength={6}
                editable={!saving}
              />
            </View>
          </>
        ) : (
          <View style={styles.addressContainer}>
            {profile?.address && 
             (profile.address.street || 
              profile.address.city || 
              profile.address.pincode) ? (
              <>
                {profile.address.street ? (
                  <Text style={styles.addressText}>{profile.address.street}</Text>
                ) : null}
                {profile.address.area ? (
                  <Text style={styles.addressText}>{profile.address.area}</Text>
                ) : null}
                {profile.address.landmark ? (
                  <Text style={styles.addressText}>
                    Near {profile.address.landmark}
                  </Text>
                ) : null}
                {(profile.address.city || profile.address.state || profile.address.pincode) && (
                  <Text style={styles.addressText}>
                    {profile.address.city || ""}
                    {profile.address.city && profile.address.state ? ", " : ""}
                    {profile.address.state || ""}
                    {(profile.address.city || profile.address.state) && profile.address.pincode ? " - " : ""}
                    {profile.address.pincode || ""}
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.noAddressText}>
                No address saved. Please add your delivery address.
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          {orders.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate("Orders")}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {orders.length === 0 ? (
          <Text style={styles.noOrdersText}>No orders yet</Text>
        ) : (
          orders.map((order) => (
            <TouchableOpacity
              key={order._id}
              style={styles.orderCard}
              onPress={() => navigation.navigate("OrderStatus", { orderId: order._id })}
            >
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>Order #{order._id.slice(-6)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.statusText}>{order.status}</Text>
                </View>
              </View>
              
              <Text style={styles.orderRestaurant}>
                {order.partnerId?.restaurantName || "Restaurant"}
              </Text>
              
              <View style={styles.orderFooter}>
                <Text style={styles.orderDate}>
                  {formatDate(order.createdAt)}
                </Text>
                <Text style={styles.orderTotal}>
                  ₹{order.grandTotal}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Settings & Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings & Support</Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>📞 Customer Support</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>📖 Terms & Conditions</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>🔒 Privacy Policy</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>⭐ Rate Us</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuItem, styles.logoutItem]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
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
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
  },
  editContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  editButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  addressContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
  },
  addressText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
    lineHeight: 22,
  },
  noAddressText: {
    fontSize: 15,
    color: '#FF6B35',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  noOrdersText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  orderCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  orderRestaurant: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDate: {
    fontSize: 13,
    color: '#888',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
  },
  menuItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
  },
  logoutItem: {
    marginTop: 8,
    borderBottomWidth: 0,
  },
  logoutText: {
    fontSize: 16,
    color: '#F44336',
    fontWeight: '600',
  },
});