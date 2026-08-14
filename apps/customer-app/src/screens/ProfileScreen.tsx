import React, { useEffect, useState, useRef } from "react";
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
  Linking,
  StatusBar
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getUserProfile,
  updateUserProfile,
  updateUserAddress,
  addAddress,
  setDefaultAddress,
  deleteAddress,
  getMyFavorites,
  deleteMyAccount,
  type FavoriteFoodItem,
  type SavedAddress,
  type UserProfile
} from "../api/user.api";
import { getMyOrders, type Order } from "../api/order.api";
import {
  getSupportFAQs,
  type FAQEntry
} from "../api/support.api";
import { buildLegalUrl } from "../constants/legal";
import { getPublicShopName } from "../utils/display";
import HighlightedOrderId from "../components/HighlightedOrderId";
import { formatPublicOrderId } from "../utils/publicOrderId";
import { unregisterPushNotifications } from "../services/notifications";
import AddressFormFields from "../components/AddressFormFields";
import AddressPinConfirmModal from "../components/AddressPinConfirmModal";
import { reverseGeocodeLocation, resolveAddressPin } from "../api/geocode.api";
import { getCurrentPositionWithTimeout, requestForegroundLocationPermission } from "../utils/location";
import * as Location from "expo-location";

const supportItems = [
  { icon: "headset", title: "Customer Support", detail: "Order related chat with Vyaha Support." },
  { icon: "help-circle-outline", title: "FAQs", detail: "Delivery timings, cancellations, refunds, and account help." },
  { icon: "alert-circle-outline", title: "Report an Issue", detail: "App bugs, UI issues, payments, feature requests, and platform problems." }
] as const;

const formatCurrency = (value?: number) => `Rs ${Number(value || 0).toFixed(0)}`;
const PRIVACY_URL = buildLegalUrl("privacy");
const TERMS_URL = buildLegalUrl("terms");
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
    case "REACHED_CUSTOMER":
      return "Rider Arrived";
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
    case "REACHED_CUSTOMER":
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

const digitsOnlyPhone = (value?: string | null) => String(value || "").replace(/\D/g, "").slice(-10);

const readCachedUserPhone = async () => {
  try {
    const raw = await AsyncStorage.getItem("user");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return digitsOnlyPhone(parsed?.phone);
  } catch {
    return "";
  }
};

export default function ProfileScreen({ navigation, route }: any) {
  const forceComplete = Boolean(route?.params?.forceComplete);
  const manageAddress = route?.params?.manageAddress;
  const returnAfterSave = Boolean(route?.params?.returnAfterSave);
  const returnTo = route?.params?.returnTo as "Cart" | undefined;
  const insets = useSafeAreaInsets();
  const footerPaddingBottom = Math.max(insets.bottom, Platform.OS === "ios" ? 24 : 16);
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
  const [supportModal, setSupportModal] = useState<"faq" | null>(null);
  const [faqs, setFaqs] = useState<FAQEntry[]>([]);
  const [favoriteFoodItems, setFavoriteFoodItems] = useState<FavoriteFoodItem[]>([]);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteReasonCategory, setDeleteReasonCategory] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [accountDeletedVisible, setAccountDeletedVisible] = useState(false);
  const [pinConfirmVisible, setPinConfirmVisible] = useState(false);
  const [pendingAddressPayload, setPendingAddressPayload] = useState<SavedAddress | null>(null);
  const [pendingPin, setPendingPin] = useState<{
    latitude: number;
    longitude: number;
    formattedAddress: string;
  } | null>(null);

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
  const [locatingCurrentLocation, setLocatingCurrentLocation] = useState(false);
  const openedAddAddressRef = useRef(false);

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
    setProfile({
      ...userData,
      phone: digitsOnlyPhone(userData.phone) || userData.phone || ""
    });
    setName(cleanName);
    setEmail(userData.email || "");
    setAddressFormMode("edit");
    hydrateAddressForm(defaultAddress, cleanName);
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [profileResponse, cachedPhone] = await Promise.all([getUserProfile(), readCachedUserPhone()]);

      if (!profileResponse.success || !profileResponse.data) {
        Alert.alert("Error", profileResponse.message || "Failed to load profile");
        return;
      }

      hydrateForm({
        ...profileResponse.data,
        phone: digitsOnlyPhone(profileResponse.data.phone) || cachedPhone
      });

      if (!forceComplete && manageAddress !== "add") {
        const ordersResponse = await getMyOrders();
        if (ordersResponse.success && ordersResponse.data) {
          setOrders(ordersResponse.data);
        } else {
          setOrders([]);
        }

        const favoritesResponse = await getMyFavorites().catch(() => null);
        setFavoriteFoodItems(favoritesResponse?.data?.foodItems || []);
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

  useEffect(() => {
    if (manageAddress !== "add" || loading || !profile || openedAddAddressRef.current) return;
    openedAddAddressRef.current = true;
    startAddAddress();
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: Math.max(0, addressesY - 12), animated: true });
    }, 250);
  }, [addressesY, loading, manageAddress, profile]);

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

  const renderPhoneField = () => {
    const digits = digitsOnlyPhone(profile?.phone);
    return (
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Phone Number</Text>
        <View
          style={styles.phoneReadonly}
          accessibilityRole="text"
          accessibilityLabel={digits ? `Phone number +91 ${digits}` : "Phone number not set"}
        >
          <Text style={styles.phoneReadonlyPrefix}>+91</Text>
          <Text style={styles.phoneReadonlyValue}>{digits || "Not set"}</Text>
        </View>
      </View>
    );
  };

  const screenTitle = forceComplete
    ? "Basic details"
    : manageAddress === "add"
      ? "Add address"
      : "My Profile";

  const handleHeaderBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  };

  const renderScreenHeader = () => (
    <View style={styles.screenHeader}>
      {forceComplete ? null : (
        <TouchableOpacity
          style={styles.screenHeaderBack}
          onPress={handleHeaderBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="#2C2018" />
        </TouchableOpacity>
      )}
      <Text
        style={[styles.screenHeaderTitle, forceComplete && styles.screenHeaderTitleSolo]}
        numberOfLines={1}
      >
        {screenTitle}
      </Text>
    </View>
  );

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

  const buildAddressPayload = () => {
    const legacyStreet = [houseFlatDoorNo.trim(), buildingApartmentName.trim(), streetRoadName.trim()]
      .filter(Boolean)
      .join(", ");
    return {
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
      country: country.trim()
    };
  };

  const handleUseCurrentLocation = async () => {
    try {
      const granted = await requestForegroundLocationPermission();
      if (!granted) {
        Alert.alert("Allow location access", "Turn on location so we can fill your delivery address from where you are.", [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() }
        ]);
        return;
      }

      setLocatingCurrentLocation(true);
      const position = await getCurrentPositionWithTimeout({ accuracy: Location.Accuracy.High }, 12000);
      if (!position?.coords) {
        Alert.alert("Turn on location", "We could not read your current location. Please try again.");
        return;
      }

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const result = await reverseGeocodeLocation(latitude, longitude);
      const geo = result.data;
      if (!result.success || !geo) {
        Alert.alert("Address not found", result.message || "We found your pin, but could not read the address. Please fill the fields.");
        setAddressLatitude(latitude);
        setAddressLongitude(longitude);
        return;
      }

      const nextHouse = geo.houseFlatDoorNo?.trim() || "Near map pin";
      const nextStreet = geo.streetRoadName?.trim() || geo.formattedAddress || "";
      const nextArea = geo.area?.trim() || "";
      const nextCity = geo.city?.trim() || "";
      const nextState = geo.state?.trim() || "";
      const nextPincode = geo.pincode?.trim() || "";
      const nextCountry = geo.country?.trim() || "India";

      setHouseFlatDoorNo(nextHouse);
      setBuildingApartmentName(geo.buildingApartmentName || "");
      setStreetRoadName(nextStreet);
      setStreet([nextHouse, geo.buildingApartmentName, nextStreet].filter(Boolean).join(", "));
      setArea(nextArea);
      setCity(nextCity);
      setState(nextState);
      setPincode(nextPincode);
      setDistrict(geo.district || "");
      setCountry(nextCountry);
      setAddressLatitude(latitude);
      setAddressLongitude(longitude);

      const addressPayload = {
        label: addressLabel.trim() || "Home",
        recipientName: recipientName.trim() || name.trim(),
        houseFlatDoorNo: nextHouse,
        buildingApartmentName: geo.buildingApartmentName?.trim() || undefined,
        streetRoadName: nextStreet,
        areaLocality: nextArea,
        street: [nextHouse, geo.buildingApartmentName, nextStreet].filter(Boolean).join(", "),
        city: nextCity,
        cityTownVillage: nextCity,
        state: nextState,
        pincode: nextPincode,
        area: nextArea,
        landmark: landmark.trim() || undefined,
        district: geo.district?.trim() || undefined,
        country: nextCountry,
        latitude,
        longitude
      };

      setPendingAddressPayload(addressPayload);
      setPendingPin({ latitude, longitude, formattedAddress: geo.formattedAddress });
      setPinConfirmVisible(true);
    } catch (error: any) {
      Alert.alert("Could not use current location", error?.message || "Please try again.");
    } finally {
      setLocatingCurrentLocation(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
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

      setSaving(true);
      const addressPayload = buildAddressPayload();
      const pinResult = await resolveAddressPin({ ...addressPayload });
      if (!pinResult.success || !pinResult.data) {
        Alert.alert("Address not found", pinResult.message || "Check the street, area, city, and pincode.");
        return;
      }

      setPendingAddressPayload(addressPayload);
      setPendingPin(pinResult.data);
      setPinConfirmVisible(true);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to locate this address");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAddressPin = async (pin: { latitude: number; longitude: number }) => {
    if (!pendingAddressPayload) return;

    try {
      setSaving(true);
      const addressPayload = {
        ...pendingAddressPayload,
        latitude: pin.latitude,
        longitude: pin.longitude
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

      setPinConfirmVisible(false);
      setPendingAddressPayload(null);
      setPendingPin(null);
      setAddressLatitude(pin.latitude);
      setAddressLongitude(pin.longitude);
      await loadProfile();
      setEditing(false);

      if (forceComplete) {
        setRegistrationSuccessVisible(true);
      } else if (returnAfterSave) {
        if (returnTo) {
          navigation.navigate(returnTo);
        } else if (navigation.canGoBack()) {
          navigation.goBack();
        }
      } else {
        Alert.alert("Profile Saved", "Your delivery address and map pin have been saved.");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const addressFormProps = {
    focusedField,
    onFocusField: setFocusedField,
    addressLabel,
    setAddressLabel,
    recipientName,
    setRecipientName,
    houseFlatDoorNo,
    setHouseFlatDoorNo,
    buildingApartmentName,
    setBuildingApartmentName,
    streetRoadName,
    setStreetRoadName,
    area,
    setArea,
    landmark,
    setLandmark,
    city,
    setCity,
    state,
    setState,
    district,
    setDistrict,
    pincode,
    setPincode,
    country,
    setCountry,
    locatingCurrentLocation,
    onUseCurrentLocation: handleUseCurrentLocation
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          unregisterPushNotifications().finally(() => {
            AsyncStorage.multiRemove(["token", "refreshToken", "user"]).finally(() => {
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }]
              });
            });
          });
        }
      }
    ]);
  };

  const handleDeleteAccount = () => {
    // Block deletion if there are ongoing orders
    if (ongoingOrders.length > 0) {
      Alert.alert(
        "Cannot Delete Account",
        `You have ${ongoingOrders.length} ongoing order${ongoingOrders.length > 1 ? "s" : ""}. Please wait for your order${ongoingOrders.length > 1 ? "s" : ""} to be delivered or cancelled before deleting your account.`
      );
      return;
    }
    setDeleteReason("");
    setDeleteReasonCategory("");
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteReasonCategory) {
      Alert.alert("Select a reason", "Please select a reason for deleting your account.");
      return;
    }
    if (!deleteReason.trim() || deleteReason.trim().length < 5) {
      Alert.alert("Add a reason", "Please provide at least a short reason (5+ characters).");
      return;
    }

    try {
      setDeleting(true);
      await unregisterPushNotifications().catch(() => {});
      const response = await deleteMyAccount();
      if (!response.success) {
        Alert.alert("Error", response.message || "Failed to delete account");
        return;
      }
      await AsyncStorage.multiRemove(["token", "refreshToken", "user"]);
      setDeleteModalVisible(false);
      setAccountDeletedVisible(true);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  const handleGoToLoginAfterDeletion = () => {
    setAccountDeletedVisible(false);
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  const handlePlaceholderAction = (title: string, message: string) => {
    Alert.alert(title, message);
  };

  const openSupport = async (mode: "chat" | "faq" | "report", subject?: string) => {
    if (mode !== "faq") {
      navigation.navigate("SupportChat", { mode, subject });
      return;
    }

    setSupportModal("faq");
    try {
      const response = await getSupportFAQs();
      setFaqs(response.data || []);
    } catch (error: any) {
      Alert.alert("Support", error.message || "Failed to load support details");
    }
  };

  const goHomeAfterRegistration = () => {
    setRegistrationSuccessVisible(false);
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }]
    });
  };

  const renderAddressPinConfirmModal = () => (
    <AddressPinConfirmModal
      visible={pinConfirmVisible && Boolean(pendingPin)}
      addressLines={buildAddressLines(
        {
          ...(pendingAddressPayload || {}),
          label: String(pendingAddressPayload?.label || addressLabel)
        } as SavedAddress,
        name
      )}
      latitude={pendingPin?.latitude || 0}
      longitude={pendingPin?.longitude || 0}
      confirming={saving}
      onConfirm={handleConfirmAddressPin}
      onEdit={() => {
        setPinConfirmVisible(false);
        setPendingPin(null);
      }}
    />
  );

  const renderRegistrationSuccessModal = () => (
    <Modal visible={registrationSuccessVisible} transparent animationType="fade" onRequestClose={goHomeAfterRegistration}>
      <View style={styles.modalOverlay}>
        <View style={styles.successModal}>
          <View style={styles.successIconWrap}>
            <MaterialCommunityIcons name="check" size={30} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>Details saved</Text>
          <Text style={styles.successText}>Your profile is ready. You can now explore nearby shops and place your first order.</Text>
          <TouchableOpacity style={styles.successButton} onPress={goHomeAfterRegistration} activeOpacity={0.85}>
            <Text style={styles.successButtonText}>Start Exploring</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const DELETE_REASON_CATEGORIES = [
    "Switching to another service",
    "Privacy concerns",
    "Too many notifications",
    "Bad experience with orders",
    "App quality issues",
    "No longer needed",
    "Other"
  ];

  const renderDeleteAccountModal = () => (
    <Modal
      visible={deleteModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!deleting) setDeleteModalVisible(false);
      }}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ width: "100%" }}
        >
          <View style={styles.deleteModal}>
            <View style={styles.deleteModalHeader}>
              <Text style={styles.deleteModalTitle}>Delete Account</Text>
              <TouchableOpacity
                onPress={() => { if (!deleting) setDeleteModalVisible(false); }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="close" size={22} color="#475467" />
              </TouchableOpacity>
            </View>

            <Text style={styles.deleteModalSubtitle}>
              This will permanently remove your profile details and deactivate your login. Order records may be retained for compliance purposes.
            </Text>

            <Text style={styles.deleteReasonLabel}>Why are you deleting your account?</Text>
            <View style={styles.deleteChipGrid}>
              {DELETE_REASON_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.deleteChip,
                    deleteReasonCategory === cat && styles.deleteChipSelected
                  ]}
                  onPress={() => setDeleteReasonCategory(cat)}
                  disabled={deleting}
                >
                  <Text
                    style={[
                      styles.deleteChipText,
                      deleteReasonCategory === cat && styles.deleteChipTextSelected
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.deleteReasonInput, deleting && styles.inputDisabled]}
              placeholder="Tell us a bit more (required)"
              placeholderTextColor="#98A2B3"
              multiline
              numberOfLines={3}
              value={deleteReason}
              onChangeText={setDeleteReason}
              editable={!deleting}
            />

            <TouchableOpacity
              style={[styles.deleteConfirmBtn, deleting && styles.btnDisabled]}
              onPress={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.deleteConfirmBtnText}>Delete my account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteCancelBtn}
              onPress={() => { if (!deleting) setDeleteModalVisible(false); }}
              disabled={deleting}
            >
              <Text style={styles.deleteCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  const renderAccountDeletedModal = () => (
    <Modal
      visible={accountDeletedVisible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.accountDeletedModal}>
          <View style={styles.accountDeletedIconWrap}>
            <MaterialCommunityIcons name="check-circle-outline" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.accountDeletedTitle}>Account Deleted</Text>
          <Text style={styles.accountDeletedText}>
            Your account has been successfully deleted. All your profile details have been removed. Thank you for using Vyaha.
          </Text>
          <TouchableOpacity
            style={styles.accountDeletedBtn}
            onPress={handleGoToLoginAfterDeletion}
            activeOpacity={0.85}
          >
            <Text style={styles.accountDeletedBtnText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderSupportModal = () => {
    return (
      <Modal visible={Boolean(supportModal)} transparent animationType="slide" onRequestClose={() => setSupportModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.supportModal}>
            <View style={styles.supportHeader}>
              <Text style={styles.supportTitle}>FAQs</Text>
              <TouchableOpacity onPress={() => setSupportModal(null)}>
                <MaterialCommunityIcons name="close" size={22} color="#475467" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.supportScroll} showsVerticalScrollIndicator={false}>
              {(faqs.length > 0 ? faqs : [
                {
                  question: "How do I get support?",
                  answer: "Open Customer Support or Report an Issue from this page. Your conversation opens on a separate screen."
                }
              ]).map((faq) => (
                <View key={faq.question} style={styles.faqCard}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                </View>
              ))}
            </ScrollView>
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
  const recentOrders = orders.slice(0, 3);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#F6F2EC" />
        {renderScreenHeader()}
        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (forceComplete) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#F6F2EC" />
        {renderScreenHeader()}
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.registrationContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic details</Text>

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

            {renderPhoneField()}

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
            <Text style={styles.sectionHint}>We’ll show a map pin next so you can confirm the location.</Text>
            <AddressFormFields {...addressFormProps} />
          </View>
        </ScrollView>

        <View style={[styles.footerBar, { paddingBottom: footerPaddingBottom }]}>
          <TouchableOpacity style={styles.footerButton} onPress={handleSaveProfile} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.footerButtonText}>Save details</Text>}
          </TouchableOpacity>
        </View>
        {renderAddressPinConfirmModal()}
        {renderRegistrationSuccessModal()}
        {renderSupportModal()}
        {renderDeleteAccountModal()}
        {renderAccountDeletedModal()}
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F6F2EC" />
      {renderScreenHeader()}
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={[styles.content, forceComplete && styles.contentWithFooter]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={[styles.heroCard, forceComplete && styles.heroCardCompact]}>
          <View style={styles.heroGlow} />
          <View style={styles.heroGlowRight} />
          <Text style={styles.heroEyebrow}>Hey there</Text>
          <Text style={styles.heroName} numberOfLines={1}>
            {isGeneratedCustomerName(profile?.name) ? "Food lover" : profile?.name || "Your Profile"}
          </Text>

          <View style={styles.heroContactRow}>
            <MaterialCommunityIcons name="phone-outline" size={14} color="#C96C2F" />
            <Text style={styles.heroSubtext}>
              {digitsOnlyPhone(profile?.phone) ? `+91 ${digitsOnlyPhone(profile?.phone)}` : "Phone not set"}
            </Text>
          </View>
          <View style={styles.heroContactRow}>
            <MaterialCommunityIcons name="email-outline" size={14} color="#C96C2F" />
            <Text style={styles.heroSubtext} numberOfLines={1}>
              {profile?.email || "Add email for invoices and offers"}
            </Text>
          </View>
          <View style={styles.memberChip}>
            <MaterialCommunityIcons name="calendar-check-outline" size={13} color="#C96C2F" />
            <Text style={styles.memberSinceText}>Member since {memberSince}</Text>
          </View>

          {!forceComplete && (
            <View style={styles.quickStats}>
              <View style={styles.quickStatCard}>
                <Text style={[styles.quickStatValue, styles.quickStatValueOrders]}>{orders.length}</Text>
                <Text style={styles.quickStatLabel}>Orders</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStatCard}>
                <Text style={[styles.quickStatValue, styles.quickStatValueLive]}>{ongoingOrders.length}</Text>
                <Text style={styles.quickStatLabel}>Live</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStatCard}>
                <Text style={[styles.quickStatValue, styles.quickStatValueFav]}>{favoriteFoodItems.length}</Text>
                <Text style={styles.quickStatLabel}>Favorites</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.shortcutRow}>
          <TouchableOpacity style={styles.shortcutCard} onPress={() => navigation.navigate("Orders")} activeOpacity={0.88}>
            <View style={[styles.shortcutIconWrap, styles.shortcutIconOrders]}>
              <MaterialCommunityIcons name="receipt-text-outline" size={20} color="#FF6B35" />
            </View>
            <Text style={styles.shortcutTitle}>My Orders</Text>
            <Text style={styles.shortcutDetail}>
              {ongoingOrders.length > 0 ? `${ongoingOrders.length} ongoing` : "View history"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shortcutCard}
            onPress={() => {
              scrollViewRef.current?.scrollTo({ y: addressesY, animated: true });
            }}
            activeOpacity={0.88}
          >
            <View style={[styles.shortcutIconWrap, styles.shortcutIconAddress]}>
              <MaterialCommunityIcons name="map-marker-radius-outline" size={20} color="#2B9C4A" />
            </View>
            <Text style={styles.shortcutTitle}>Addresses</Text>
            <Text style={styles.shortcutDetail}>{addressLines.length > 0 ? "Primary saved" : "Add now"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Favorites</Text>
            <TouchableOpacity style={styles.inlineLink} onPress={() => navigation.navigate("Home")}>
              <Text style={styles.inlineLinkText}>Add More</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionHint}>Menu items saved with the heart icon appear here.</Text>
          {favoriteFoodItems.length === 0 ? (
            <Text style={styles.emptyText}>No favorite dishes yet.</Text>
          ) : (
            <View style={styles.favoriteBlock}>
              {favoriteFoodItems.map((item) => {
                const partnerId =
                  typeof item.partnerId === "string"
                    ? item.partnerId
                    : item.partner?._id || "";
                const restaurantName = getPublicShopName(
                  item.partner?.restaurantName || item.partner?.shopName || "Restaurant"
                );

                return (
                  <TouchableOpacity
                    key={item._id}
                    style={styles.favoriteChip}
                    onPress={() => {
                      if (!partnerId) return;
                      navigation.navigate("ShopDetail", {
                        shopId: partnerId,
                        shop: item.partner as any
                      });
                    }}
                    activeOpacity={0.88}
                  >
                    <View style={styles.favoriteHeart}>
                      <MaterialCommunityIcons name="heart" size={14} color="#E11D48" />
                    </View>
                    <View style={styles.favoriteChipCopy}>
                      <Text style={styles.favoriteChipText} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.favoriteChipMeta} numberOfLines={1}>
                        {restaurantName}
                        {typeof item.price === "number" ? ` · Rs ${item.price}` : ""}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.favoriteStatusPill,
                        item.isOrderable ? styles.favoriteStatusOpen : styles.favoriteStatusClosed
                      ]}
                    >
                      <Text
                        style={[
                          styles.favoriteAvailability,
                          item.isOrderable ? styles.favoriteAvailabilityOpen : styles.favoriteAvailabilityClosed
                        ]}
                      >
                        {item.availabilityLabel || (item.isOrderable ? "Available" : "Unavailable")}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
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

          {renderPhoneField()}

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
          <Text style={styles.sectionHint}>We’ll show a map pin next so you can confirm the location.</Text>

          {editing ? (
            <>
              <AddressFormFields {...addressFormProps} />

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
                            <HighlightedOrderId
                              orderId={order._id}
                              prefix="Order #"
                              style={styles.orderId}
                              highlightStyle={{ color: "#FF6B35", fontWeight: "800" }}
                            />
                            <Text style={styles.orderPartner}>
                              {getPublicShopName((order.partnerId as any)?.restaurantName || (order.partnerId as any)?.shopName || "Restaurant")}
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
                            onPress={() => openSupport("report", `Issue with order ${formatPublicOrderId(order._id)}`)}
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
                      <Text style={styles.inlineLinkText}>View All History</Text>
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
                          {getPublicShopName((order.partnerId as any)?.restaurantName || (order.partnerId as any)?.shopName || "Restaurant")}
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
              {supportItems.map((item, index) => (
                <TouchableOpacity
                  key={item.title}
                  style={[styles.listRow, index === 0 && styles.listRowFirst]}
                  onPress={() =>
                    openSupport(item.title === "FAQs" ? "faq" : item.title === "Report an Issue" ? "report" : "chat")
                  }
                >
                  <View style={styles.listRowLeft}>
                    <View style={styles.listRowIcon}>
                      <MaterialCommunityIcons name={item.icon as any} size={18} color="#FF6B35" />
                    </View>
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
              <TouchableOpacity style={[styles.accountActionRow, styles.listRowFirst, styles.logoutRow]} onPress={handleLogout}>
                <View style={[styles.listRowIcon, styles.accountIconDanger]}>
                  <MaterialCommunityIcons name="logout" size={18} color="#C7362E" />
                </View>
                <Text style={styles.logoutRowText}>Logout</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.accountActionRow, styles.deleteRow]}
                onPress={handleDeleteAccount}
              >
                <View style={[styles.listRowIcon, styles.accountIconDanger]}>
                  <MaterialCommunityIcons name="delete-outline" size={18} color="#B42318" />
                </View>
                <Text style={styles.deleteRowText}>Delete Account</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.accountActionRow} onPress={() => Linking.openURL(PRIVACY_URL)}>
                <View style={styles.listRowIcon}>
                  <MaterialCommunityIcons name="shield-lock-outline" size={18} color="#475467" />
                </View>
                <Text style={styles.legalRowText}>Privacy Policy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.accountActionRow} onPress={() => Linking.openURL(TERMS_URL)}>
                <View style={styles.listRowIcon}>
                  <MaterialCommunityIcons name="file-document-outline" size={18} color="#475467" />
                </View>
                <Text style={styles.legalRowText}>Terms of Service</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {forceComplete && editing && (
        <View style={[styles.footerBar, { paddingBottom: footerPaddingBottom }]}>
          <TouchableOpacity style={styles.footerButton} onPress={handleSaveProfile} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.footerButtonText}>Save details</Text>}
          </TouchableOpacity>
        </View>
      )}
      {renderAddressPinConfirmModal()}
      {renderRegistrationSuccessModal()}
      {renderSupportModal()}
      {renderDeleteAccountModal()}
      {renderAccountDeletedModal()}
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
    paddingBottom: 28
  },
  contentWithFooter: {
    paddingBottom: 180
  },
  registrationContent: {
    paddingTop: 10,
    paddingBottom: 160
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
  loadingBody: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B5E55"
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    minHeight: 48
  },
  screenHeaderBack: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  screenHeaderTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 24,
    fontWeight: "800",
    color: "#2C2018"
  },
  screenHeaderTitleSolo: {
    paddingHorizontal: 6
  },
  heroCard: {
    marginHorizontal: 14,
    padding: 16,
    borderRadius: 22,
    backgroundColor: "#FFF4EA",
    borderWidth: 1,
    borderColor: "#F3D7BF",
    overflow: "hidden"
  },
  heroCardCompact: {
    marginTop: 6
  },
  heroGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#FFD9C2",
    opacity: 0.55,
    top: -48,
    right: -28
  },
  heroGlowRight: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FFE7D4",
    opacity: 0.9,
    bottom: 48,
    right: 24
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C96C2F",
    letterSpacing: 0.2,
    marginBottom: 2
  },
  heroName: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "900",
    color: "#201914",
    marginBottom: 10
  },
  heroContactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 4
  },
  heroSubtext: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: "#6B5E55"
  },
  memberChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1DED0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  memberSinceText: {
    fontSize: 12,
    color: "#8B6A54",
    marginLeft: 4,
    fontWeight: "700"
  },
  quickStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1E1D5",
    paddingVertical: 10
  },
  quickStatCard: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 6
  },
  quickStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#F0E0D3"
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#2C2018"
  },
  quickStatValueOrders: {
    color: "#FF6B35"
  },
  quickStatValueLive: {
    color: "#2B9C4A"
  },
  quickStatValueFav: {
    color: "#E11D48"
  },
  quickStatLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    color: "#8B6A54"
  },
  shortcutRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 14,
    marginTop: 12
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECE3D9",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12
  },
  shortcutIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center"
  },
  shortcutIconOrders: {
    backgroundColor: "#FFF1E6"
  },
  shortcutIconAddress: {
    backgroundColor: "#EAF8EA"
  },
  shortcutTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "800",
    color: "#2C2018"
  },
  shortcutDetail: {
    marginTop: 3,
    fontSize: 12,
    color: "#7A6F65"
  },
  section: {
    marginHorizontal: 14,
    marginTop: 10,
    padding: 14,
    borderRadius: 18,
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
    fontSize: 15,
    fontWeight: "800",
    color: "#241D17"
  },
  sectionHint: {
    marginTop: 2,
    marginBottom: 8,
    fontSize: 12,
    lineHeight: 16,
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
    marginBottom: 8
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7A6F65",
    marginBottom: 4
  },
  value: {
    fontSize: 14,
    color: "#241D17",
    paddingVertical: 6
  },
  input: {
    borderWidth: 1,
    borderColor: "#E4DBD2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1A120B",
    backgroundColor: "#FFFFFF",
    minHeight: 38,
    marginBottom: 0
  },
  phoneReadonly: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E4DBD2",
    borderRadius: 8,
    paddingHorizontal: 10,
    minHeight: 38,
    backgroundColor: "#F7F2EC"
  },
  phoneReadonlyPrefix: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7A6F65",
    marginRight: 8,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: "#E4DBD2"
  },
  phoneReadonlyValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1A120B"
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
    backgroundColor: "#FFFCF8",
    borderRadius: 16,
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
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F2ECE5"
  },
  listRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12
  },
  listRowFirst: {
    borderTopWidth: 0,
    paddingTop: 6
  },
  listRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#FFF4EB",
    alignItems: "center",
    justifyContent: "center"
  },
  accountIconDanger: {
    backgroundColor: "#FDECEC"
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
    alignSelf: "stretch",
    backgroundColor: "#FFFCF8",
    borderWidth: 1,
    borderColor: "#F0E0D3",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8
  },
  favoriteHeart: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#FFE8EE",
    alignItems: "center",
    justifyContent: "center"
  },
  favoriteChipCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10
  },
  favoriteChipMeta: {
    marginTop: 2,
    fontSize: 11,
    color: "#8B7E74"
  },
  favoriteStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8
  },
  favoriteStatusOpen: {
    backgroundColor: "#EAF8EA"
  },
  favoriteStatusClosed: {
    backgroundColor: "#FDECEC"
  },
  favoriteAvailability: {
    fontSize: 10,
    fontWeight: "800"
  },
  favoriteAvailabilityOpen: {
    color: "#15803D"
  },
  favoriteAvailabilityClosed: {
    color: "#B42318"
  },
  favoriteChipText: {
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
    paddingVertical: 10,
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
    borderRadius: 12,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center"
  },
  footerButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700"
  },
  deleteModal: {
    width: "100%",
    maxHeight: "90%",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderWidth: 1,
    borderColor: "#F2D8C6"
  },
  deleteModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#241D17"
  },
  deleteModalSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: "#7A6F65",
    marginBottom: 16
  },
  deleteReasonLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#344054",
    marginBottom: 10
  },
  deleteChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14
  },
  deleteChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E0D5CC",
    backgroundColor: "#FAF6F2"
  },
  deleteChipSelected: {
    borderColor: "#B42318",
    backgroundColor: "#FEF3F2"
  },
  deleteChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475467"
  },
  deleteChipTextSelected: {
    color: "#B42318"
  },
  deleteReasonInput: {
    borderWidth: 1,
    borderColor: "#D9D0C5",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1A120B",
    backgroundColor: "#FFFFFF",
    marginBottom: 14,
    minHeight: 80,
    textAlignVertical: "top"
  },
  inputDisabled: {
    opacity: 0.5
  },
  deleteConfirmBtn: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#B42318",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10
  },
  deleteConfirmBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800"
  },
  deleteCancelBtn: {
    minHeight: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F3F5"
  },
  deleteCancelBtnText: {
    color: "#475467",
    fontSize: 15,
    fontWeight: "700"
  },
  btnDisabled: {
    opacity: 0.6
  },
  accountDeletedModal: {
    width: "100%",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F2D8C6"
  },
  accountDeletedIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#2B9C4A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  accountDeletedTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#241D17",
    textAlign: "center",
    marginBottom: 10
  },
  accountDeletedText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#6B5E55",
    textAlign: "center",
    marginBottom: 24
  },
  accountDeletedBtn: {
    width: "100%",
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center"
  },
  accountDeletedBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900"
  }
});
