import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getUserProfile,
  updateUserProfile,
  updateUserAddress,
  type UserProfile
} from "../api/user.api";
import { getMyOrders } from "../api/order.api";

interface Order {
  _id: string;
  status: string;
  grandTotal: number;
  createdAt: string;
  partnerId: {
    restaurantName: string;
  };
}

export default function ProfileScreen({ navigation, route }: any) {
  const forceComplete = Boolean(route?.params?.forceComplete);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(forceComplete);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");

  const hydrateForm = (userData: UserProfile) => {
    setProfile(userData);
    setName(userData.name || "");
    setEmail(userData.email || "");
    setStreet(userData.address?.street || "");
    setCity(userData.address?.city || "");
    setState(userData.address?.state || "");
    setPincode(userData.address?.pincode || "");
    setArea(userData.address?.area || "");
    setLandmark(userData.address?.landmark || "");
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profileResponse = await getUserProfile();

      if (!profileResponse.success || !profileResponse.data) {
        Alert.alert("Error", profileResponse.message || "Failed to load profile");
        return;
      }

      hydrateForm(profileResponse.data);

      if (!forceComplete) {
        const ordersResponse = await getMyOrders();
        if (ordersResponse.success && ordersResponse.data) {
          setOrders(ordersResponse.data.slice(0, 5));
        }
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

  const resetForm = () => {
    if (profile) {
      hydrateForm(profile);
    }
    setEditing(forceComplete);
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);

      if (!name.trim()) {
        Alert.alert("Error", "Name is required");
        return;
      }

      if (!street.trim() || !city.trim() || !state.trim() || !pincode.trim() || !area.trim()) {
        Alert.alert("Error", "Please complete your full delivery address");
        return;
      }

      if (!/^\d{6}$/.test(pincode.trim())) {
        Alert.alert("Error", "Pincode must be exactly 6 digits");
        return;
      }

      const [profileResult, addressResult] = await Promise.all([
        updateUserProfile({
          name: name.trim(),
          email: email.trim() || undefined
        }),
        updateUserAddress({
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          area: area.trim(),
          landmark: landmark.trim() || undefined
        })
      ]);

      if (!profileResult.success || !addressResult.success) {
        Alert.alert(
          "Error",
          profileResult.message || addressResult.message || "Failed to update profile"
        );
        return;
      }

      Alert.alert(
        "Success",
        forceComplete ? "Registration completed successfully" : "Profile updated successfully"
      );

      await loadProfile();
      setEditing(false);

      if (forceComplete) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Home" }]
        });
      }
    } catch (error: any) {
      console.error("Profile update error:", error);
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          AsyncStorage.multiRemove(["token", "user"]).finally(() => {
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }]
            });
          });
        }
      }
    ]);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      return "Invalid date";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "#4CAF50";
      case "CONFIRMED":
        return "#2196F3";
      case "PREPARING":
        return "#FF9800";
      case "READY":
        return "#9C27B0";
      case "CANCELLED":
        return "#F44336";
      default:
        return "#666";
    }
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 12}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, forceComplete && styles.contentWithFooter]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        <View style={[styles.header, forceComplete && styles.headerCompact]}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{profile?.name?.charAt(0).toUpperCase() || "U"}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.userName}>{profile?.name || "User"}</Text>
            <Text style={styles.userMeta}>{profile?.phone}</Text>
            {profile?.email ? <Text style={styles.userMeta}>{profile.email}</Text> : null}
          </View>
        </View>

        <View style={styles.editContainer}>
          {editing ? (
            <View style={styles.editButtons}>
              {!forceComplete && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryButton]}
                  onPress={resetForm}
                  disabled={saving}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
              {!forceComplete && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={() => setEditing(true)}>
              <Text style={styles.primaryButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.section, forceComplete && styles.registrationSection]}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>

        <View style={styles.field}>
          <Text style={styles.label}>Full Name</Text>
          {editing ? (
            <TextInput
              style={[styles.input, focusedField === "name" && styles.inputFocused]}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor="#98A2B3"
              selectionColor="#FF6B35"
              cursorColor="#FF6B35"
              onFocus={() => setFocusedField("name")}
              onBlur={() => setFocusedField(null)}
            />
          ) : (
            <Text style={styles.value}>{profile?.name || "Not set"}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          {editing ? (
            <TextInput
              style={[styles.input, focusedField === "email" && styles.inputFocused]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#98A2B3"
              keyboardType="email-address"
              autoCapitalize="none"
              selectionColor="#FF6B35"
              cursorColor="#FF6B35"
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
            />
          ) : (
            <Text style={styles.value}>{profile?.email || "Not set"}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{profile?.phone}</Text>
        </View>

        <View style={[styles.field, styles.fieldLast]}>
          <Text style={styles.label}>Member Since</Text>
          <Text style={styles.value}>{profile ? formatDate(profile.createdAt) : "N/A"}</Text>
        </View>
        </View>

        <View style={[styles.section, forceComplete && styles.registrationSection]}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
          </View>

          {editing ? (
            <>
            <TextInput
              style={[styles.input, styles.largeInput, focusedField === "street" && styles.inputFocused]}
              value={street}
              onChangeText={setStreet}
              placeholder="Street / House No"
              placeholderTextColor="#98A2B3"
              selectionColor="#FF6B35"
              cursorColor="#FF6B35"
              onFocus={() => setFocusedField("street")}
              onBlur={() => setFocusedField(null)}
            />
            <TextInput
              style={[styles.input, focusedField === "area" && styles.inputFocused]}
              value={area}
              onChangeText={setArea}
              placeholder="Area / Locality"
              placeholderTextColor="#98A2B3"
              selectionColor="#FF6B35"
              cursorColor="#FF6B35"
              onFocus={() => setFocusedField("area")}
              onBlur={() => setFocusedField(null)}
            />
            <TextInput
              style={[styles.input, focusedField === "landmark" && styles.inputFocused]}
              value={landmark}
              onChangeText={setLandmark}
              placeholder="Landmark (optional)"
              placeholderTextColor="#98A2B3"
              selectionColor="#FF6B35"
              cursorColor="#FF6B35"
              onFocus={() => setFocusedField("landmark")}
              onBlur={() => setFocusedField(null)}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.half, focusedField === "city" && styles.inputFocused]}
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor="#98A2B3"
                selectionColor="#FF6B35"
                cursorColor="#FF6B35"
                onFocus={() => setFocusedField("city")}
                onBlur={() => setFocusedField(null)}
              />
              <TextInput
                style={[styles.input, styles.half, focusedField === "state" && styles.inputFocused]}
                value={state}
                onChangeText={setState}
                placeholder="State"
                placeholderTextColor="#98A2B3"
                selectionColor="#FF6B35"
                cursorColor="#FF6B35"
                onFocus={() => setFocusedField("state")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            <TextInput
              style={[styles.input, focusedField === "pincode" && styles.inputFocused]}
              value={pincode}
              onChangeText={(value) => setPincode(value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit pincode"
              placeholderTextColor="#98A2B3"
              keyboardType="number-pad"
              maxLength={6}
              selectionColor="#FF6B35"
              cursorColor="#FF6B35"
              onFocus={() => setFocusedField("pincode")}
              onBlur={() => setFocusedField(null)}
            />
            </>
          ) : (
            <View style={styles.addressCard}>
            {profile?.address?.street ? <Text style={styles.addressText}>{profile.address.street}</Text> : null}
            {profile?.address?.area ? <Text style={styles.addressText}>{profile.address.area}</Text> : null}
            {profile?.address?.landmark ? (
              <Text style={styles.addressText}>Near {profile.address.landmark}</Text>
            ) : null}
            {profile?.address?.city || profile?.address?.state || profile?.address?.pincode ? (
              <Text style={styles.addressText}>
                {[profile?.address?.city, profile?.address?.state].filter(Boolean).join(", ")}
                {profile?.address?.pincode ? ` - ${profile.address.pincode}` : ""}
              </Text>
            ) : (
              <Text style={styles.emptyText}>No address saved yet.</Text>
            )}
            </View>
          )}
        </View>

        {!forceComplete && (
          <>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Orders</Text>
              {orders.length > 0 ? (
                <TouchableOpacity onPress={() => navigation.navigate("Orders")}>
                  <Text style={styles.linkText}>View All</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {orders.length === 0 ? (
              <Text style={styles.emptyText}>No orders yet.</Text>
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
                  <Text style={styles.orderRestaurant}>{order.partnerId?.restaurantName || "Restaurant"}</Text>
                  <View style={styles.orderFooter}>
                    <Text style={styles.orderMeta}>{formatDate(order.createdAt)}</Text>
                    <Text style={styles.orderPrice}>Rs {order.grandTotal}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings & Support</Text>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>Customer Support</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>Terms & Conditions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
          </>
        )}
      </ScrollView>

      {forceComplete && editing && (
        <View style={styles.footerBar}>
          <TouchableOpacity
            style={[styles.footerButton, saving && styles.footerButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.footerButtonText}>Complete Registration</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F4EF"
  },
  content: {
    paddingBottom: 32
  },
  contentWithFooter: {
    paddingBottom: 120
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666"
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee"
  },
  headerCompact: {
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ECE7DE",
    marginTop: 8
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff"
  },
  headerInfo: {
    flex: 1
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4
  },
  userMeta: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2
  },
  editContainer: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  editButtons: {
    flexDirection: "row",
    gap: 10
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flex: 1
  },
  primaryButton: {
    backgroundColor: "#FF6B35"
  },
  secondaryButton: {
    backgroundColor: "#F1F3F5"
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
  },
  secondaryButtonText: {
    color: "#475467",
    fontSize: 16,
    fontWeight: "700"
  },
  fullWidth: {
    flex: 1
  },
  section: {
    backgroundColor: "#fff",
    padding: 18,
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ECE7DE",
    shadowColor: "#2C1810",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 2
  },
  registrationSection: {
    backgroundColor: "#FFFCF7"
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  sectionTitleRow: {
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#241D17",
    marginBottom: 0
  },
  field: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F4F7"
  },
  fieldLast: {
    borderBottomWidth: 0
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7A6F65",
    marginBottom: 8
  },
  value: {
    fontSize: 16,
    color: "#241D17"
  },
  input: {
    borderWidth: 1,
    borderColor: "#D9D0C5",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: "500",
    color: "#1A120B",
    backgroundColor: "#FFFFFF",
    marginBottom: 12
  },
  inputFocused: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFF8F4",
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3
  },
  largeInput: {
    minHeight: 56
  },
  row: {
    flexDirection: "row",
    gap: 10
  },
  half: {
    flex: 1
  },
  addressCard: {
    backgroundColor: "#FAF5ED",
    borderRadius: 16,
    padding: 14
  },
  addressText: {
    fontSize: 15,
    color: "#344054",
    marginBottom: 4
  },
  emptyText: {
    fontSize: 15,
    color: "#98A2B3"
  },
  linkText: {
    color: "#FF6B35",
    fontWeight: "700"
  },
  orderCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  orderId: {
    fontSize: 14,
    fontWeight: "700",
    color: "#101828"
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  statusText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "700"
  },
  orderRestaurant: {
    fontSize: 14,
    color: "#475467",
    marginBottom: 8
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  orderMeta: {
    fontSize: 13,
    color: "#667085"
  },
  orderPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF6B35"
  },
  menuItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F4F7"
  },
  menuText: {
    fontSize: 16,
    color: "#344054"
  },
  logoutItem: {
    borderBottomWidth: 0
  },
  logoutText: {
    fontSize: 16,
    color: "#F04438",
    fontWeight: "700"
  },
  footerBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
    backgroundColor: "rgba(246, 244, 239, 0.98)",
    borderTopWidth: 1,
    borderTopColor: "#E7DED3"
  },
  footerButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 18,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6
  },
  footerButtonDisabled: {
    opacity: 0.7
  },
  footerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700"
  }
});
