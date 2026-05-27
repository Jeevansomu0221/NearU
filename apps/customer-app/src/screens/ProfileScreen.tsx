import React, { useEffect, useMemo, useState, useRef } from "react";
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
  Modal,
  Platform,
  Linking
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  getUserProfile,
  updateUserProfile,
  updateUserAddress,
  addAddress,
  setDefaultAddress,
  deleteAddress,
  deleteMyAccount,
  type SavedAddress,
  type UserProfile
} from "../api/user.api";
import { getMyOrders, type Order } from "../api/order.api";
import {
  createSupportTicket,
  getMySupportTickets,
  getSupportFAQs,
  sendSupportMessage,
  type FAQEntry,
  type SupportTicket
} from "../api/support.api";

const supportItems = [
  { icon: "headset", title: "Customer Support", detail: "Start a support chat connected to Vyaha admin." },
  { icon: "help-circle-outline", title: "FAQs", detail: "Delivery timings, cancellations, refunds, and account help." },
  { icon: "alert-circle-outline", title: "Report an Issue", detail: "Report payment, order, delivery, or account problems." }
] as const;

const formatCurrency = (value?: number) => `Rs ${Number(value || 0).toFixed(0)}`;
const PRIVACY_URL = "https://www.vyaha.com/privacy";
const TERMS_URL = "https://www.vyaha.com/terms";
type AddressFormMode = "edit" | "add";

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";

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

const getStatusLabel = (status: string) => {
  switch (status) {
    case "PENDING":
      return "Payment Pending";
    case "CONFIRMED":
      return "Order Placed";
    case "ACCEPTED":
      return "Restaurant Accepted";
    case "PREPARING":
      return "Preparing Food";
    case "READY":
      return "Ready for Pickup";
    case "ASSIGNED":
      return "Rider Assigned";
    case "PICKED_UP":
      return "On the Way";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
};

const getStatusTone = (status: string) => {
  switch (status) {
    case "DELIVERED":
      return { bg: "#DDF8E5", fg: "#216E39" };
    case "CONFIRMED":
    case "ACCEPTED":
      return { bg: "#DCEBFF", fg: "#175CD3" };
    case "PREPARING":
    case "PENDING":
      return { bg: "#FFF0D5", fg: "#B54708" };
    case "READY":
    case "ASSIGNED":
    case "PICKED_UP":
      return { bg: "#ECE9FE", fg: "#5925DC" };
    case "CANCELLED":
    case "REJECTED":
      return { bg: "#FEE4E2", fg: "#B42318" };
    default:
      return { bg: "#F2F4F7", fg: "#475467" };
  }
};

const buildAddressLines = (address?: SavedAddress | null, fallbackName?: string) => {
  if (!address) return [];

  return [
    address.recipientName || fallbackName,
    [address.houseFlatDoorNo, address.buildingApartmentName].filter(Boolean).join(", ") || address.street,
    address.streetRoadName,
    address.areaLocality || address.area,
    address.landmark ? `Near ${address.landmark}` : "",
    [
      address.cityTownVillage || address.city,
      address.district ? `${address.district} District` : "",
      address.state
    ]
      .filter(Boolean)
      .join(", ") + (address.pincode ? ` - ${address.pincode}` : ""),
    address.country || "India"
  ].filter(Boolean) as string[];
};

const isGeneratedCustomerName = (value?: string) => {
  const normalized = (value || "").trim().toLowerCase();
  return (
    normalized === "customer" ||
    normalized === "nearu customer" ||
    /^customer\s*\d{4}$/.test(normalized) ||
    /^customer\s+[0-9]+$/.test(normalized)
  );
};

export default function ProfileScreen({ navigation, route }: any) {
  const forceComplete = Boolean(route?.params?.forceComplete);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [addressesY, setAddressesY] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(forceComplete);
  const [saving, setSaving] = useState(false);
  const [registrationSuccessVisible, setRegistrationSuccessVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [addressFormMode, setAddressFormMode] = useState<AddressFormMode>("edit");
  const [editingAddressId, setEditingAddressId] = useState<string | undefined>(undefined);
  const [supportModal, setSupportModal] = useState<"chat" | "faq" | "report" | null>(null);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [faqs, setFaqs] = useState<FAQEntry[]>([]);
  const [supportSubject, setSupportSubject] = useState("Customer support");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSending, setSupportSending] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [addressLabel, setAddressLabel] = useState("Home");
  const [recipientName, setRecipientName] = useState("");
  const [houseFlatDoorNo, setHouseFlatDoorNo] = useState("");
  const [buildingApartmentName, setBuildingApartmentName] = useState("");
  const [streetRoadName, setStreetRoadName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [district, setDistrict] = useState("");
  const [country, setCountry] = useState("India");
  const [addressLatitude, setAddressLatitude] = useState<number | undefined>(undefined);
  const [addressLongitude, setAddressLongitude] = useState<number | undefined>(undefined);
  const [capturingAddressPin, setCapturingAddressPin] = useState(false);

  const hydrateAddressForm = (address?: SavedAddress | null, fallbackName = "") => {
    setAddressLabel(address?.label || "Home");
    setRecipientName(address?.recipientName || fallbackName);
    setHouseFlatDoorNo(address?.houseFlatDoorNo || "");
    setBuildingApartmentName(address?.buildingApartmentName || "");
    setStreetRoadName(address?.streetRoadName || address?.street || "");
    setStreet(address?.street || "");
    setCity(address?.cityTownVillage || address?.city || "");
    setState(address?.state || "");
    setPincode(address?.pincode || "");
    setArea(address?.areaLocality || address?.area || "");
    setLandmark(address?.landmark || "");
    setDistrict(address?.district || "");
    setCountry(address?.country || "India");
    setAddressLatitude(address?.latitude);
    setAddressLongitude(address?.longitude);
    setEditingAddressId(address?._id);
  };

  const getSavedAddressesFromProfile = (userData: UserProfile | null) => {
    if (!userData) return [];
    if (Array.isArray(userData.addresses) && userData.addresses.length > 0) {
      return userData.addresses;
    }
    return userData.address ? [{ ...userData.address, label: "Home", isDefault: true }] : [];
  };

  const hasValidAddressPin = (latitude?: number, longitude?: number) =>
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0);

  const hydrateForm = (userData: UserProfile) => {
    const cleanName = isGeneratedCustomerName(userData.name) ? "" : userData.name || "";
    const savedAddresses = getSavedAddressesFromProfile(userData);
    const defaultAddress = savedAddresses.find((entry) => entry.isDefault) || savedAddresses[0] || null;
    setProfile(userData);
    setName(cleanName);
    setEmail(userData.email || "");
    setAddressFormMode("edit");
    hydrateAddressForm(defaultAddress, cleanName);
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
          setOrders(ordersResponse.data);
        } else {
          setOrders([]);
        }
      }
    } catch (error: any) {
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

  const startAddAddress = () => {
    setAddressFormMode("add");
    setEditingAddressId(undefined);
    setAddressLabel("Home");
    hydrateAddressForm(null, name);
    setEditing(true);
  };

  const startEditAddress = (address: SavedAddress) => {
    setAddressFormMode("edit");
    hydrateAddressForm(address, name);
    setEditing(true);
  };

  const handleSetDefaultAddress = async (address: SavedAddress) => {
    if (!address._id) return;

    try {
      setSaving(true);
      const response = await setDefaultAddress(address._id);
      if (!response.success) {
        Alert.alert("Error", response.message || "Failed to set default address");
        return;
      }
      await loadProfile();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to set default address");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = (address: SavedAddress) => {
    if (!address._id) return;

    Alert.alert("Delete Address", `Remove ${address.label || "this address"} from saved addresses?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setSaving(true);
            const response = await deleteAddress(address._id!);
            if (!response.success) {
              Alert.alert("Error", response.message || "Failed to delete address");
              return;
            }
            await loadProfile();
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to delete address");
          } finally {
            setSaving(false);
          }
        }
      }
    ]);
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);

      if (!name.trim()) {
        Alert.alert("Error", "Name is required");
        return;
      }

      if (
        !recipientName.trim() ||
        !houseFlatDoorNo.trim() ||
        !streetRoadName.trim() ||
        !city.trim() ||
        !state.trim() ||
        !pincode.trim() ||
        !area.trim() ||
        !country.trim()
      ) {
        Alert.alert("Error", "Please complete your full delivery address");
        return;
      }

      if (!/^\d{6}$/.test(pincode.trim())) {
        Alert.alert("Error", "Pincode must be exactly 6 digits");
        return;
      }

      let nextAddressLatitude = addressLatitude;
      let nextAddressLongitude = addressLongitude;

      if (!hasValidAddressPin(nextAddressLatitude, nextAddressLongitude)) {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          Alert.alert(
            "Location Permission Needed",
            "Please allow location access so we can save your exact delivery GPS pin. We cannot use only pincode or text address for delivery directions."
          );
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        nextAddressLatitude = location.coords.latitude;
        nextAddressLongitude = location.coords.longitude;
        setAddressLatitude(nextAddressLatitude);
        setAddressLongitude(nextAddressLongitude);
      }

      const legacyStreet = [houseFlatDoorNo.trim(), buildingApartmentName.trim(), streetRoadName.trim()]
        .filter(Boolean)
        .join(", ");
      const addressPayload = {
        label: addressLabel.trim() || "Home",
        recipientName: recipientName.trim(),
        houseFlatDoorNo: houseFlatDoorNo.trim(),
        buildingApartmentName: buildingApartmentName.trim() || undefined,
        streetRoadName: streetRoadName.trim(),
        areaLocality: area.trim(),
        street: legacyStreet || street.trim(),
        city: city.trim(),
        cityTownVillage: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        area: area.trim(),
        landmark: landmark.trim() || undefined,
        district: district.trim() || undefined,
        country: country.trim(),
        latitude: nextAddressLatitude,
        longitude: nextAddressLongitude
      };

      const [profileResult, addressResult] = await Promise.all([
        updateUserProfile({
          name: name.trim(),
          email: email.trim() || undefined
        }),
        addressFormMode === "add"
          ? addAddress({
          ...addressPayload,
          isDefault: getSavedAddressesFromProfile(profile).length === 0
        })
          : updateUserAddress({
          ...addressPayload,
          addressId: editingAddressId,
          isDefault: getSavedAddressesFromProfile(profile).length === 0 ||
            getSavedAddressesFromProfile(profile).some((entry) => entry._id === editingAddressId && entry.isDefault)
        })
      ]);

      if (!profileResult.success || !addressResult.success) {
        Alert.alert("Error", profileResult.message || addressResult.message || "Failed to update profile");
        return;
      }

      await loadProfile();
      setEditing(false);

      if (forceComplete) {
        setRegistrationSuccessVisible(true);
      } else {
        Alert.alert("Profile Saved", "Your profile details have been updated.");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCaptureAddressPin = async () => {
    try {
      setCapturingAddressPin(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Location Permission", "Please allow location access while you are at this delivery address.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      setAddressLatitude(location.coords.latitude);
      setAddressLongitude(location.coords.longitude);
      Alert.alert("Location Pin Saved", "This saved address now has an exact GPS pin for delivery directions.");
    } catch (error: any) {
      Alert.alert("Location Error", error.message || "Could not capture your current location.");
    } finally {
      setCapturingAddressPin(false);
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

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will deactivate your login and remove or anonymize your profile details. Order records may be retained where required for payments, disputes, or legal compliance.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              const response = await deleteMyAccount();
              if (!response.success) {
                Alert.alert("Error", response.message || "Failed to delete account");
                return;
              }

              await AsyncStorage.multiRemove(["token", "refreshToken", "user"]);
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }]
              });
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete account");
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const handlePlaceholderAction = (title: string, message: string) => {
    Alert.alert(title, message);
  };

  const openSupportModal = async (mode: "chat" | "faq" | "report") => {
    setSupportModal(mode);
    if (mode === "report") {
      setSupportSubject((current) => current && current !== "Customer support" ? current : "Report an issue");
    } else if (mode === "chat") {
      setSupportSubject("Customer support");
    }

    try {
      if (mode === "faq") {
        const response = await getSupportFAQs();
        setFaqs(response.data || []);
      } else {
        const response = await getMySupportTickets();
        setSupportTickets(response.data || []);
      }
    } catch (error: any) {
      Alert.alert("Support", error.message || "Failed to load support details");
    }
  };

  const handleSendSupportRequest = async (category: "CUSTOMER_SUPPORT" | "REPORT_ISSUE") => {
    const message = supportMessage.trim();
    if (!message) {
      Alert.alert("Support", "Please write a message so the admin team has enough context.");
      return;
    }

    try {
      setSupportSending(true);
      const openTicket = category === "CUSTOMER_SUPPORT"
        ? supportTickets.find((ticket) => !["RESOLVED", "CLOSED"].includes(ticket.status))
        : undefined;
      const response = openTicket
        ? await sendSupportMessage(openTicket._id, message)
        : await createSupportTicket({
          subject: supportSubject.trim() || (category === "REPORT_ISSUE" ? "Report an issue" : "Customer support"),
          message,
          category,
          priority: category === "REPORT_ISSUE" ? "HIGH" : "NORMAL"
        });

      if (!response.success || !response.data) {
        Alert.alert("Support", response.message || "Failed to send support request");
        return;
      }

      setSupportMessage("");
      const ticketsResponse = await getMySupportTickets();
      setSupportTickets(ticketsResponse.data || []);
      Alert.alert("Support", "Your message has been sent to the Vyaha admin panel.");
    } catch (error: any) {
      Alert.alert("Support", error.message || "Failed to send support request");
    } finally {
      setSupportSending(false);
    }
  };

  const goHomeAfterRegistration = () => {
    setRegistrationSuccessVisible(false);
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }]
    });
  };

  const renderRegistrationSuccessModal = () => (
    <Modal visible={registrationSuccessVisible} transparent animationType="fade" onRequestClose={goHomeAfterRegistration}>
      <View style={styles.modalOverlay}>
        <View style={styles.successModal}>
          <View style={styles.successIconWrap}>
            <MaterialCommunityIcons name="check" size={30} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>Registration Complete</Text>
          <Text style={styles.successText}>Your Vyaha profile is ready. You can now explore nearby food shops and place your first order.</Text>
          <TouchableOpacity style={styles.successButton} onPress={goHomeAfterRegistration} activeOpacity={0.85}>
            <Text style={styles.successButtonText}>Start Exploring</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderSupportModal = () => {
    const activeTicket = supportTickets.find((ticket) => !["RESOLVED", "CLOSED"].includes(ticket.status)) || supportTickets[0];
    const isReport = supportModal === "report";

    return (
      <Modal visible={Boolean(supportModal)} transparent animationType="slide" onRequestClose={() => setSupportModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.supportModal}>
            <View style={styles.supportHeader}>
              <Text style={styles.supportTitle}>
                {supportModal === "faq" ? "FAQs" : isReport ? "Report an Issue" : "Customer Support"}
              </Text>
              <TouchableOpacity onPress={() => setSupportModal(null)}>
                <MaterialCommunityIcons name="close" size={22} color="#475467" />
              </TouchableOpacity>
            </View>

            {supportModal === "faq" ? (
              <ScrollView style={styles.supportScroll} showsVerticalScrollIndicator={false}>
                {(faqs.length > 0 ? faqs : [
                  {
                    question: "How do I get support?",
                    answer: "Open Customer Support or Report an Issue from this page. Your message goes directly to the Vyaha admin panel."
                  }
                ]).map((faq) => (
                  <View key={faq.question} style={styles.faqCard}>
                    <Text style={styles.faqQuestion}>{faq.question}</Text>
                    <Text style={styles.faqAnswer}>{faq.answer}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <>
                <Text style={styles.supportIntro}>
                  {isReport
                    ? "Tell us what went wrong. This creates a high-priority support ticket for the admin team."
                    : "Send a message to Vyaha support. Admin replies will appear in this conversation."}
                </Text>

                {activeTicket ? (
                  <ScrollView style={styles.chatHistory} showsVerticalScrollIndicator={false}>
                    <Text style={styles.ticketStatus}>Ticket: {activeTicket.subject} - {activeTicket.status}</Text>
                    {activeTicket.messages?.map((message, index) => (
                      <View
                        key={`${message.createdAt || index}-${index}`}
                        style={[
                          styles.chatBubble,
                          message.senderRole === "customer" ? styles.chatBubbleCustomer : styles.chatBubbleAdmin
                        ]}
                      >
                        <Text style={styles.chatSender}>{message.senderRole === "customer" ? "You" : "Vyaha Admin"}</Text>
                        <Text style={styles.chatText}>{message.message}</Text>
                      </View>
                    ))}
                  </ScrollView>
                ) : null}

                {isReport ? (
                  <TextInput
                    style={[styles.input, focusedField === "supportSubject" && styles.inputFocused]}
                    value={supportSubject}
                    onChangeText={setSupportSubject}
                    placeholder="Issue subject"
                    placeholderTextColor="#98A2B3"
                    onFocus={() => setFocusedField("supportSubject")}
                    onBlur={() => setFocusedField(null)}
                  />
                ) : null}
                <TextInput
                  style={[styles.supportInput, focusedField === "supportMessage" && styles.inputFocused]}
                  value={supportMessage}
                  onChangeText={setSupportMessage}
                  placeholder={isReport ? "Describe the issue, order ID, payment reference, or delivery problem..." : "Type your message..."}
                  placeholderTextColor="#98A2B3"
                  multiline
                  textAlignVertical="top"
                  onFocus={() => setFocusedField("supportMessage")}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity
                  style={styles.supportSendButton}
                  onPress={() => handleSendSupportRequest(isReport ? "REPORT_ISSUE" : "CUSTOMER_SUPPORT")}
                  disabled={supportSending}
                >
                  {supportSending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.supportSendText}>Send to Support</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const savedAddresses = getSavedAddressesFromProfile(profile);
  const defaultAddress = savedAddresses.find((entry) => entry.isDefault) || savedAddresses[0];
  const addressLines = buildAddressLines(defaultAddress, profile?.name);
  const memberSince = profile ? formatDate(profile.createdAt) : "N/A";
  const ongoingOrders = orders.filter((order) => !["DELIVERED", "CANCELLED", "REJECTED"].includes(order.status)).slice(0, 3);
  const recentOrders = orders.slice(0, 5);

  const favoriteRestaurants = useMemo(() => {
    const deduped = new Map<string, string>();
    orders.forEach((order) => {
      const partnerName =
        (order.partnerId as any)?.restaurantName ||
        (order.partnerId as any)?.shopName ||
        "Local Partner";
      deduped.set(partnerName, partnerName);
    });
    return Array.from(deduped.values()).slice(0, 4);
  }, [orders]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (forceComplete) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.registrationContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Details</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={[styles.input, focusedField === "name" && styles.inputFocused]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#98A2B3"
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <Text style={styles.value}>{profile?.phone}</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address (optional)</Text>
              <TextInput
                style={[styles.input, focusedField === "email" && styles.inputFocused]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email address"
                placeholderTextColor="#98A2B3"
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <Text style={styles.sectionHint}>
              This address needs an exact GPS pin. We will ask location permission when you complete registration.
            </Text>

            <TextInput
              style={[styles.input, focusedField === "addressLabel" && styles.inputFocused]}
              value={addressLabel}
              onChangeText={setAddressLabel}
              placeholder="Address label (Home, Work, Home 2)"
              placeholderTextColor="#98A2B3"
              onFocus={() => setFocusedField("addressLabel")}
              onBlur={() => setFocusedField(null)}
            />
            <TextInput
              style={[styles.input, focusedField === "recipientName" && styles.inputFocused]}
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="Recipient name"
              placeholderTextColor="#98A2B3"
              onFocus={() => setFocusedField("recipientName")}
              onBlur={() => setFocusedField(null)}
            />
            <TextInput
              style={[styles.input, focusedField === "houseFlatDoorNo" && styles.inputFocused]}
              value={houseFlatDoorNo}
              onChangeText={setHouseFlatDoorNo}
              placeholder="House / flat / door number"
              placeholderTextColor="#98A2B3"
              onFocus={() => setFocusedField("houseFlatDoorNo")}
              onBlur={() => setFocusedField(null)}
            />
            <TextInput
              style={[styles.input, focusedField === "buildingApartmentName" && styles.inputFocused]}
              value={buildingApartmentName}
              onChangeText={setBuildingApartmentName}
              placeholder="Building / apartment name (optional)"
              placeholderTextColor="#98A2B3"
              onFocus={() => setFocusedField("buildingApartmentName")}
              onBlur={() => setFocusedField(null)}
            />
            <TextInput
              style={[styles.input, focusedField === "streetRoadName" && styles.inputFocused]}
              value={streetRoadName}
              onChangeText={setStreetRoadName}
              placeholder="Street / colony"
              placeholderTextColor="#98A2B3"
              onFocus={() => setFocusedField("streetRoadName")}
              onBlur={() => setFocusedField(null)}
            />
            <TextInput
              style={[styles.input, focusedField === "area" && styles.inputFocused]}
              value={area}
              onChangeText={setArea}
              placeholder="Area / locality"
              placeholderTextColor="#98A2B3"
              onFocus={() => setFocusedField("area")}
              onBlur={() => setFocusedField(null)}
            />
            <TextInput
              style={[styles.input, focusedField === "landmark" && styles.inputFocused]}
              value={landmark}
              onChangeText={setLandmark}
              placeholder="Landmark (optional)"
              placeholderTextColor="#98A2B3"
              onFocus={() => setFocusedField("landmark")}
              onBlur={() => setFocusedField(null)}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput, focusedField === "city" && styles.inputFocused]}
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor="#98A2B3"
                onFocus={() => setFocusedField("city")}
                onBlur={() => setFocusedField(null)}
              />
              <TextInput
                style={[styles.input, styles.halfInput, focusedField === "state" && styles.inputFocused]}
                value={state}
                onChangeText={setState}
                placeholder="State"
                placeholderTextColor="#98A2B3"
                onFocus={() => setFocusedField("state")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput, focusedField === "pincode" && styles.inputFocused]}
                value={pincode}
                onChangeText={(value) => setPincode(value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Pincode"
                placeholderTextColor="#98A2B3"
                keyboardType="number-pad"
                onFocus={() => setFocusedField("pincode")}
                onBlur={() => setFocusedField(null)}
              />
              <TextInput
                style={[styles.input, styles.halfInput, focusedField === "country" && styles.inputFocused]}
                value={country}
                onChangeText={setCountry}
                placeholder="Country"
                placeholderTextColor="#98A2B3"
                onFocus={() => setFocusedField("country")}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footerBar}>
          <TouchableOpacity style={styles.footerButton} onPress={handleSaveProfile} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.footerButtonText}>Complete Registration</Text>}
          </TouchableOpacity>
        </View>
        {renderRegistrationSuccessModal()}
        {renderSupportModal()}
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={[styles.content, forceComplete && styles.contentWithFooter]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={[styles.heroCard, forceComplete && styles.heroCardCompact]}>
          <View style={styles.heroRow}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{profile?.name?.charAt(0).toUpperCase() || "U"}</Text>
            </View>
            <View style={styles.heroMeta}>
              <Text style={styles.heroName}>{isGeneratedCustomerName(profile?.name) ? "Your Profile" : profile?.name || "Your Profile"}</Text>
              <Text style={styles.heroSubtext}>{profile?.phone}</Text>
              <Text style={styles.heroSubtext}>{profile?.email || "Add your email for invoices and offers"}</Text>
              <View style={styles.memberSinceContainer}>
                <MaterialCommunityIcons name="calendar-check-outline" size={14} color="#7A6F65" />
                <Text style={styles.memberSinceText}>Member since {memberSince}</Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 10 }}>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() =>
                handlePlaceholderAction("Profile Photo", "Profile photo updates are currently handled by Vyaha support.")
              }
            >
              <MaterialCommunityIcons name="camera-outline" size={16} color="#FF6B35" />
              <Text style={styles.photoButtonText}>Profile photo</Text>
            </TouchableOpacity>
          </View>

          {!forceComplete && (
            <View style={styles.quickStats}>
              <View style={styles.quickStatCard}>
                <Text style={styles.quickStatValue}>{orders.length}</Text>
                <Text style={styles.quickStatLabel}>Total Orders</Text>
              </View>
              <View style={styles.quickStatCard}>
                <Text style={styles.quickStatValue}>{ongoingOrders.length}</Text>
                <Text style={styles.quickStatLabel}>Live Orders</Text>
              </View>
              <View style={styles.quickStatCard}>
                <Text style={styles.quickStatValue}>{favoriteRestaurants.length}</Text>
                <Text style={styles.quickStatLabel}>Favorites</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.shortcutRow}>
          <TouchableOpacity style={styles.shortcutCard} onPress={() => navigation.navigate("Orders")}>
            <View style={styles.shortcutIconWrap}>
              <MaterialCommunityIcons name="file-document-outline" size={20} color="#FF6B35" />
            </View>
            <Text style={styles.shortcutTitle}>My Orders</Text>
            <Text style={styles.shortcutDetail}>{ongoingOrders.length > 0 ? `${ongoingOrders.length} ongoing` : "View history"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => {
              scrollViewRef.current?.scrollTo({ y: addressesY, animated: true });
            }}
          >
            <View style={styles.shortcutIconWrap}>
              <MaterialCommunityIcons name="map-marker-radius-outline" size={20} color="#2B9C4A" />
            </View>
            <Text style={styles.shortcutTitle}>Addresses</Text>
            <Text style={styles.shortcutDetail}>{addressLines.length > 0 ? "Primary saved" : "Add now"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => handlePlaceholderAction("Payments", "Payments are handled securely during checkout. Saved payment methods are not stored in this release.")}
          >
            <View style={styles.shortcutIconWrap}>
              <MaterialCommunityIcons name="wallet-outline" size={20} color="#7C3AED" />
            </View>
            <Text style={styles.shortcutTitle}>Payments</Text>
            <Text style={styles.shortcutDetail}>Manage methods</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Basic Profile Info</Text>
            {editing && !forceComplete ? (
              <View style={styles.inlineActions}>
                <TouchableOpacity style={[styles.smallAction, styles.mutedAction]} onPress={resetForm} disabled={saving}>
                  <Text style={styles.mutedActionText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smallAction, styles.primaryAction]} onPress={handleSaveProfile} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryActionText}>Save</Text>}
                </TouchableOpacity>
              </View>
            ) : !editing ? (
              <TouchableOpacity style={[styles.smallAction, styles.primaryAction]} onPress={() => setEditing(true)}>
                <Text style={styles.primaryActionText}>Edit Profile</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.sectionHint}>Name, phone number, optional email, and delivery identity.</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Name</Text>
            {editing ? (
              <TextInput
                style={[styles.input, focusedField === "name" && styles.inputFocused]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#98A2B3"
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField(null)}
              />
            ) : (
              <Text style={styles.value}>{profile?.name || "Not set"}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <Text style={styles.value}>{profile?.phone || "Not set"}</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            {editing ? (
              <TextInput
                style={[styles.input, focusedField === "email" && styles.inputFocused]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email address"
                placeholderTextColor="#98A2B3"
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
              />
            ) : (
              <Text style={styles.value}>{profile?.email || "Not set"}</Text>
            )}
          </View>
        </View>

        <View
          style={styles.section}
          onLayout={(event) => {
            const { y } = event.nativeEvent.layout;
            setAddressesY(y);
          }}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Saved Addresses</Text>
            {!editing ? (
              <TouchableOpacity style={styles.inlineLink} onPress={startAddAddress}>
                <Text style={styles.inlineLinkText}>Add New</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.sectionHint}>Save Home, Work, Home 2, or any delivery location and mark one as default for checkout.</Text>

          {editing ? (
            <>
              <TextInput
                style={[styles.input, focusedField === "addressLabel" && styles.inputFocused]}
                value={addressLabel}
                onChangeText={setAddressLabel}
                placeholder="Address label (Home, Work, Home 2)"
                placeholderTextColor="#98A2B3"
                onFocus={() => setFocusedField("addressLabel")}
                onBlur={() => setFocusedField(null)}
              />
              <TextInput
                style={[styles.input, focusedField === "recipientName" && styles.inputFocused]}
                value={recipientName}
                onChangeText={setRecipientName}
                placeholder="Recipient name"
                placeholderTextColor="#98A2B3"
                onFocus={() => setFocusedField("recipientName")}
                onBlur={() => setFocusedField(null)}
              />
              <TextInput
                style={[styles.input, focusedField === "houseFlatDoorNo" && styles.inputFocused]}
                value={houseFlatDoorNo}
                onChangeText={setHouseFlatDoorNo}
                placeholder="House / flat / door number"
                placeholderTextColor="#98A2B3"
                onFocus={() => setFocusedField("houseFlatDoorNo")}
                onBlur={() => setFocusedField(null)}
              />
              <TextInput
                style={[styles.input, focusedField === "buildingApartmentName" && styles.inputFocused]}
                value={buildingApartmentName}
                onChangeText={setBuildingApartmentName}
                placeholder="Building / apartment name"
                placeholderTextColor="#98A2B3"
                onFocus={() => setFocusedField("buildingApartmentName")}
                onBlur={() => setFocusedField(null)}
              />
              <TextInput
                style={[styles.input, focusedField === "streetRoadName" && styles.inputFocused]}
                value={streetRoadName}
                onChangeText={setStreetRoadName}
                placeholder="Street / colony"
                placeholderTextColor="#98A2B3"
                onFocus={() => setFocusedField("streetRoadName")}
                onBlur={() => setFocusedField(null)}
              />
              <TextInput
                style={[styles.input, focusedField === "area" && styles.inputFocused]}
                value={area}
                onChangeText={setArea}
                placeholder="Area / locality"
                placeholderTextColor="#98A2B3"
                onFocus={() => setFocusedField("area")}
                onBlur={() => setFocusedField(null)}
              />
              <TextInput
                style={[styles.input, focusedField === "landmark" && styles.inputFocused]}
                value={landmark}
                onChangeText={setLandmark}
                placeholder="Landmark"
                placeholderTextColor="#98A2B3"
                onFocus={() => setFocusedField("landmark")}
                onBlur={() => setFocusedField(null)}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput, focusedField === "city" && styles.inputFocused]}
                  value={city}
                  onChangeText={setCity}
                  placeholder="City / town"
                  placeholderTextColor="#98A2B3"
                  onFocus={() => setFocusedField("city")}
                  onBlur={() => setFocusedField(null)}
                />
                <TextInput
                  style={[styles.input, styles.halfInput, focusedField === "state" && styles.inputFocused]}
                  value={state}
                  onChangeText={setState}
                  placeholder="State"
                  placeholderTextColor="#98A2B3"
                  onFocus={() => setFocusedField("state")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              <TextInput
                style={[styles.input, focusedField === "district" && styles.inputFocused]}
                value={district}
                onChangeText={setDistrict}
                placeholder="District"
                placeholderTextColor="#98A2B3"
                onFocus={() => setFocusedField("district")}
                onBlur={() => setFocusedField(null)}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput, focusedField === "pincode" && styles.inputFocused]}
                  value={pincode}
                  onChangeText={(value) => setPincode(value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Pincode"
                  placeholderTextColor="#98A2B3"
                  keyboardType="number-pad"
                  onFocus={() => setFocusedField("pincode")}
                  onBlur={() => setFocusedField(null)}
                />
                <TextInput
                  style={[styles.input, styles.halfInput, focusedField === "country" && styles.inputFocused]}
                  value={country}
                  onChangeText={setCountry}
                  placeholder="Country"
                  placeholderTextColor="#98A2B3"
                  onFocus={() => setFocusedField("country")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <View style={styles.pinCard}>
                <View style={styles.pinCopy}>
                  <Text style={styles.pinTitle}>Exact delivery pin</Text>
                  <Text style={styles.pinText}>
                    {hasValidAddressPin(addressLatitude, addressLongitude)
                      ? `Saved: ${Number(addressLatitude).toFixed(5)}, ${Number(addressLongitude).toFixed(5)}`
                      : "Stand at this address and save the GPS pin so delivery can use exact Google Maps directions."}
                  </Text>
                </View>
                <TouchableOpacity style={styles.pinButton} onPress={handleCaptureAddressPin} disabled={capturingAddressPin}>
                  {capturingAddressPin ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.pinButtonText}>Use Current Location</Text>
                  )}
                </TouchableOpacity>
              </View>

              {!forceComplete && (
                <TouchableOpacity style={styles.fullSaveButton} onPress={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.fullSaveButtonText}>{addressFormMode === "add" ? "Add Address" : "Save Address"}</Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          ) : savedAddresses.length > 0 ? (
            savedAddresses.map((savedAddress, index) => {
              const lines = buildAddressLines(savedAddress, profile?.name);
              return (
                <View key={savedAddress._id || `${savedAddress.label}-${index}`} style={styles.addressCard}>
                  <View style={styles.addressBadgeRow}>
                    <View style={styles.addressBadge}>
                      <Text style={styles.addressBadgeText}>{savedAddress.label || "Address"}</Text>
                    </View>
                    <Text style={styles.addressDefaultText}>{savedAddress.isDefault ? "Default address" : "Saved address"}</Text>
                  </View>
                  {lines.map((line) => (
                    <Text key={line} style={styles.addressLine}>
                      {line}
                    </Text>
                  ))}
                  <Text style={[styles.addressLine, styles.addressPinLine]}>
                    {hasValidAddressPin(savedAddress.latitude, savedAddress.longitude) ? "Exact map pin saved" : "Exact map pin not saved"}
                  </Text>
                  <View style={styles.addressActions}>
                    {!savedAddress.isDefault && savedAddress._id ? (
                      <TouchableOpacity onPress={() => handleSetDefaultAddress(savedAddress)} disabled={saving}>
                        <Text style={styles.addressActionText}>Use as default</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity onPress={() => startEditAddress(savedAddress)}>
                      <Text style={styles.addressActionText}>Edit</Text>
                    </TouchableOpacity>
                    {savedAddresses.length > 1 && savedAddress._id ? (
                      <TouchableOpacity onPress={() => handleDeleteAddress(savedAddress)} disabled={saving}>
                        <Text style={[styles.addressActionText, styles.addressDeleteText]}>Delete</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No address saved yet.</Text>
          )}
        </View>

        {!forceComplete && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Orders</Text>
              <Text style={styles.sectionHint}>Ongoing orders, past orders, reorder, invoice, and issue support.</Text>

              {ongoingOrders.length > 0 ? (
                <View style={styles.subSection}>
                  <Text style={styles.subSectionTitle}>Ongoing Orders</Text>
                  {ongoingOrders.map((order) => {
                    const tone = getStatusTone(order.status);
                    return (
                      <TouchableOpacity
                        key={order._id}
                        style={styles.orderCard}
                        onPress={() => navigation.navigate("OrderStatus", { orderId: order._id })}
                      >
                        <View style={styles.orderTopRow}>
                          <View>
                            <Text style={styles.orderId}>Order #{order._id.slice(-6)}</Text>
                            <Text style={styles.orderPartner}>
                              {(order.partnerId as any)?.restaurantName || (order.partnerId as any)?.shopName || "Restaurant"}
                            </Text>
                          </View>
                          <View style={[styles.orderStatusChip, { backgroundColor: tone.bg }]}>
                            <Text style={[styles.orderStatusText, { color: tone.fg }]}>{getStatusLabel(order.status)}</Text>
                          </View>
                        </View>
                        <View style={styles.orderBottomRow}>
                          <Text style={styles.orderMeta}>{formatDate(order.createdAt)}</Text>
                          <Text style={styles.orderTotal}>{formatCurrency(order.grandTotal)}</Text>
                        </View>
                        <View style={styles.orderActionRow}>
                          <TouchableOpacity onPress={() => navigation.navigate("OrderStatus", { orderId: order._id })}>
                            <Text style={styles.orderActionLink}>Live tracking</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => {
                              setSupportSubject(`Issue with order #${order._id.slice(-6)}`);
                              openSupportModal("report");
                            }}
                          >
                            <Text style={styles.orderActionLink}>Report issue</Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}

              <View style={styles.subSection}>
                <View style={styles.subSectionHeader}>
                  <Text style={styles.subSectionTitle}>Past Orders</Text>
                  {recentOrders.length > 0 ? (
                    <TouchableOpacity onPress={() => navigation.navigate("Orders")}>
                      <Text style={styles.inlineLinkText}>View all</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {recentOrders.length === 0 ? (
                  <Text style={styles.emptyText}>No orders yet.</Text>
                ) : (
                  recentOrders.map((order) => (
                    <View key={order._id} style={styles.orderHistoryRow}>
                      <View style={styles.orderHistoryMeta}>
                        <Text style={styles.orderHistoryTitle}>
                          {(order.partnerId as any)?.restaurantName || (order.partnerId as any)?.shopName || "Restaurant"}
                        </Text>
                        <Text style={styles.orderHistorySubtext}>
                          {formatDate(order.createdAt)} - {getStatusLabel(order.status)}
                        </Text>
                      </View>
                      <View style={styles.orderHistoryActions}>
                        <Text style={styles.orderHistoryAmount}>{formatCurrency(order.grandTotal)}</Text>
                        <View style={styles.orderMiniActions}>
                          <TouchableOpacity
                            onPress={() => navigation.navigate("ShopDetail", { shopId: (order.partnerId as any)?._id || (order.partnerId as any), shop: undefined })}
                          >
                            <Text style={styles.orderMiniLink}>Reorder</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handlePlaceholderAction("Invoice", "Invoice download can be linked once PDF export is added to orders.")}
                          >
                            <Text style={styles.orderMiniLink}>Invoice</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Help & Support</Text>
              {supportItems.map((item) => (
                <TouchableOpacity
                  key={item.title}
                  style={styles.listRow}
                  onPress={() =>
                    openSupportModal(item.title === "FAQs" ? "faq" : item.title === "Report an Issue" ? "report" : "chat")
                  }
                >
                  <View style={styles.listRowLeft}>
                    <MaterialCommunityIcons name={item.icon as any} size={20} color="#FF6B35" />
                    <View style={styles.listRowTextWrap}>
                      <Text style={styles.listRowTitle}>{item.title}</Text>
                      <Text style={styles.listRowDetail}>{item.detail}</Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#98A2B3" />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Actions</Text>
              <TouchableOpacity style={[styles.accountActionRow, styles.logoutRow]} onPress={handleLogout}>
                <MaterialCommunityIcons name="logout" size={20} color="#C7362E" />
                <Text style={styles.logoutRowText}>Logout</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.accountActionRow, styles.deleteRow]}
                onPress={handleDeleteAccount}
              >
                <MaterialCommunityIcons name="delete-outline" size={20} color="#B42318" />
                <Text style={styles.deleteRowText}>Delete Account</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.accountActionRow} onPress={() => Linking.openURL(PRIVACY_URL)}>
                <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#475467" />
                <Text style={styles.legalRowText}>Privacy Policy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.accountActionRow} onPress={() => Linking.openURL(TERMS_URL)}>
                <MaterialCommunityIcons name="file-document-outline" size={20} color="#475467" />
                <Text style={styles.legalRowText}>Terms of Service</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {forceComplete && editing && (
        <View style={styles.footerBar}>
          <TouchableOpacity style={styles.footerButton} onPress={handleSaveProfile} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.footerButtonText}>Complete Registration</Text>}
          </TouchableOpacity>
        </View>
      )}
      {renderRegistrationSuccessModal()}
      {renderSupportModal()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F2EC"
  },
  content: {
    paddingTop: 10,
    paddingBottom: 22
  },
  contentWithFooter: {
    paddingBottom: 180
  },
  registrationContent: {
    paddingTop: 16,
    paddingBottom: 190
  },
  registrationHeader: {
    marginHorizontal: 16,
    marginBottom: 2
  },
  registrationTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#241D17"
  },
  registrationSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#7A6F65"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F6F2EC"
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B5E55"
  },
  heroCard: {
    marginHorizontal: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFF7EF",
    borderWidth: 1,
    borderColor: "#F3D7BF"
  },
  heroCardCompact: {
    marginTop: 6
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  avatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  avatarText: {
    fontSize: 23,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  heroMeta: {
    flex: 1
  },
  heroName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 4
  },
  heroSubtext: {
    fontSize: 13,
    color: "#7A6F65",
    marginBottom: 2
  },
  heroInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    gap: 8
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE8D5",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1
  },
  heroPillText: {
    fontSize: 12,
    color: "#7A4B21",
    fontWeight: "700",
    marginLeft: 6
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1D4BF"
  },
  photoButtonText: {
    fontSize: 12,
    color: "#FF6B35",
    fontWeight: "700",
    marginLeft: 6
  },
  progressRow: {
    marginTop: 16
  },
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    backgroundColor: "#F3E3D5",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#FF6B35"
  },
  progressText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#7A6F65"
  },
  quickStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#F1E1D5"
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2C2018"
  },
  quickStatLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
    color: "#8B6A54"
  },
  shortcutRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 14,
    marginTop: 10
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECE3D9",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10
  },
  shortcutIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF4EB",
    alignItems: "center",
    justifyContent: "center"
  },
  shortcutTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "800",
    color: "#2C2018"
  },
  shortcutDetail: {
    marginTop: 4,
    fontSize: 11,
    color: "#7A6F65"
  },
  section: {
    marginHorizontal: 14,
    marginTop: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECE3D9"
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#241D17"
  },
  sectionHint: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 12,
    lineHeight: 18,
    color: "#7A6F65"
  },
  inlineActions: {
    flexDirection: "row",
    gap: 8
  },
  smallAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryAction: {
    backgroundColor: "#FF6B35"
  },
  mutedAction: {
    backgroundColor: "#F1F3F5"
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800"
  },
  mutedActionText: {
    color: "#475467",
    fontSize: 12,
    fontWeight: "800"
  },
  inlineLink: {
    paddingVertical: 4
  },
  inlineLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF6B35"
  },
  fieldGroup: {
    marginBottom: 10
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7A6F65",
    marginBottom: 8
  },
  value: {
    fontSize: 15,
    color: "#241D17"
  },
  input: {
    borderWidth: 1,
    borderColor: "#D9D0C5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A120B",
    backgroundColor: "#FFFFFF",
    marginBottom: 10
  },
  inputFocused: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFF8F4"
  },
  row: {
    flexDirection: "row",
    gap: 10
  },
  halfInput: {
    flex: 1
  },
  addressCard: {
    backgroundColor: "#FBF6EF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F3E4D4",
    marginBottom: 10
  },
  addressBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  addressBadge: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999
  },
  addressBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800"
  },
  addressDefaultText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8B6A54"
  },
  addressLine: {
    fontSize: 14,
    color: "#344054",
    marginBottom: 5
  },
  addressPinLine: {
    marginTop: 4,
    fontWeight: "800",
    color: "#2B9C4A"
  },
  pinCard: {
    backgroundColor: "#F0FFF4",
    borderWidth: 1,
    borderColor: "#BFE9CA",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12
  },
  pinCopy: {
    marginBottom: 10
  },
  pinTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#216E39",
    marginBottom: 4
  },
  pinText: {
    fontSize: 12,
    lineHeight: 17,
    color: "#3F6B4A"
  },
  pinButton: {
    backgroundColor: "#2B9C4A",
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  pinButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  addressActions: {
    flexDirection: "row",
    gap: 14,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0E0D3"
  },
  addressActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FF6B35"
  },
  addressDeleteText: {
    color: "#B42318"
  },
  fullSaveButton: {
    marginTop: 4,
    borderRadius: 16,
    backgroundColor: "#FF6B35",
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center"
  },
  fullSaveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800"
  },
  subSection: {
    marginBottom: 18
  },
  subSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#241D17",
    marginBottom: 10
  },
  orderCard: {
    backgroundColor: "#FBF7F1",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1E5D8",
    padding: 12,
    marginBottom: 8
  },
  orderTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8
  },
  orderId: {
    fontSize: 14,
    fontWeight: "800",
    color: "#241D17"
  },
  orderPartner: {
    fontSize: 13,
    color: "#7A6F65",
    marginTop: 4
  },
  orderStatusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: "800"
  },
  orderBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12
  },
  orderMeta: {
    fontSize: 12,
    color: "#7A6F65"
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FF6B35"
  },
  orderActionRow: {
    flexDirection: "row",
    gap: 18,
    marginTop: 12
  },
  orderActionLink: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF6B35"
  },
  orderHistoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F2ECE5"
  },
  orderHistoryMeta: {
    flex: 1,
    marginRight: 12
  },
  orderHistoryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#241D17"
  },
  orderHistorySubtext: {
    marginTop: 4,
    fontSize: 12,
    color: "#7A6F65"
  },
  orderHistoryActions: {
    alignItems: "flex-end"
  },
  orderHistoryAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FF6B35"
  },
  orderMiniActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6
  },
  orderMiniLink: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF6B35"
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F2ECE5"
  },
  listRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12
  },
  listRowTextWrap: {
    marginLeft: 12,
    flex: 1
  },
  listRowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#241D17"
  },
  listRowDetail: {
    marginTop: 3,
    fontSize: 12,
    color: "#7A6F65",
    lineHeight: 17
  },
  rowTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FF6B35"
  },
  favoriteBlock: {
    marginTop: 4,
    marginBottom: 14
  },
  favoriteTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#241D17",
    marginBottom: 10
  },
  favoriteChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FBF6EF",
    borderWidth: 1,
    borderColor: "#F0E0D3",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8
  },
  favoriteChipText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#241D17"
  },
  favoriteChipCount: {
    marginLeft: 8,
    fontSize: 12,
    color: "#8B6A54",
    fontWeight: "700"
  },
  offerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7EF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F3E4D4",
    padding: 14,
    marginBottom: 10
  },
  offerContent: {
    marginLeft: 12,
    flex: 1
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#241D17"
  },
  offerDetail: {
    marginTop: 4,
    fontSize: 12,
    color: "#7A6F65",
    lineHeight: 17
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F2ECE5"
  },
  toggleTextWrap: {
    flex: 1,
    marginRight: 16
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#241D17"
  },
  toggleDetail: {
    marginTop: 4,
    fontSize: 12,
    color: "#7A6F65"
  },
  accountActionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F2ECE5"
  },
  logoutRow: {
    marginTop: 4
  },
  deleteRow: {
    marginTop: 2
  },
  logoutRowText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "800",
    color: "#C7362E"
  },
  deleteRowText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "800",
    color: "#B42318"
  },
  legalRowText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: "700",
    color: "#475467"
  },
  emptyText: {
    fontSize: 14,
    color: "#98A2B3"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(31, 24, 19, 0.42)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24
  },
  successModal: {
    width: "100%",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F2D8C6"
  },
  supportModal: {
    width: "100%",
    maxHeight: "86%",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderWidth: 1,
    borderColor: "#F2D8C6"
  },
  supportHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#241D17"
  },
  supportIntro: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6B5E55",
    marginBottom: 12
  },
  supportScroll: {
    maxHeight: 440
  },
  faqCard: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F2ECE5"
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: "800",
    color: "#241D17"
  },
  faqAnswer: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: "#6B5E55"
  },
  chatHistory: {
    maxHeight: 250,
    marginBottom: 12
  },
  ticketStatus: {
    fontSize: 12,
    fontWeight: "800",
    color: "#8B6A54",
    marginBottom: 8
  },
  chatBubble: {
    padding: 10,
    borderRadius: 14,
    marginBottom: 8,
    maxWidth: "88%"
  },
  chatBubbleCustomer: {
    alignSelf: "flex-end",
    backgroundColor: "#FFF1E6"
  },
  chatBubbleAdmin: {
    alignSelf: "flex-start",
    backgroundColor: "#F2F4F7"
  },
  chatSender: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8B6A54",
    marginBottom: 3
  },
  chatText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#241D17"
  },
  supportInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: "#D9D0C5",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1A120B",
    backgroundColor: "#FFFFFF",
    marginBottom: 12
  },
  supportSendButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center"
  },
  supportSendText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900"
  },
  successIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#22A45D",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#241D17",
    textAlign: "center"
  },
  successText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B5E55",
    textAlign: "center"
  },
  successButton: {
    marginTop: 20,
    width: "100%",
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center"
  },
  successButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  },
  footerBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
    backgroundColor: "rgba(246, 242, 236, 0.98)",
    borderTopWidth: 1,
    borderTopColor: "#E7DED3"
  },
  footerButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 18,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center"
  },
  footerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  },
  memberSinceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6
  },
  memberSinceText: {
    fontSize: 12,
    color: "#7A6F65",
    marginLeft: 4,
    fontWeight: "600"
  }
});
