import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URLS } from "../api/client";
import { getDeliveryProfile, updateDeliveryProfile, type DeliveryProfile } from "../api/profile.api";
import { getDeliveryStats, getTodaysEarnings, type DeliveryStats } from "../api/delivery.api";
import { resolveDeliveryRoute } from "../utils/deliveryStatus";

const DRAFT_KEY = "delivery_registration_draft_v2";
const STEPS = ["Basic", "Vehicle", "Documents", "Bank"] as const;
const VEHICLE_TYPES: DeliveryProfile["vehicleType"][] = ["Bike", "Scooter", "Motorcycle", "Bicycle", "Cycle", "Car"];
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf"
]);

const getUploadMimeType = (filename: string, mimeType?: string | null) => {
  const normalizedMimeType = mimeType === "image/jpg" ? "image/jpeg" : mimeType?.toLowerCase();
  if (normalizedMimeType && ALLOWED_UPLOAD_MIME_TYPES.has(normalizedMimeType)) {
    return normalizedMimeType;
  }

  const extension = filename.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";
  if (extension === "pdf") return "application/pdf";
  return "image/jpeg";
};

const ensureUploadFileName = (filename: string, mimeType: string) => {
  if (/\.[A-Za-z0-9]+$/.test(filename)) {
    return filename;
  }

  if (mimeType === "application/pdf") return `${filename}.pdf`;
  if (mimeType === "image/png") return `${filename}.png`;
  if (mimeType === "image/webp") return `${filename}.webp`;
  if (mimeType === "image/heic") return `${filename}.heic`;
  if (mimeType === "image/heif") return `${filename}.heif`;
  return `${filename}.jpg`;
};

const createUploadFileName = (field: UploadField, mimeType: string, originalName?: string | null) => {
  const safeBase = `${field}-${Date.now()}`;
  const trimmedName = originalName?.trim();

  if (trimmedName && /\.[A-Za-z0-9]+$/.test(trimmedName)) {
    return trimmedName.replace(/[^A-Za-z0-9._-]/g, "_");
  }

  return ensureUploadFileName(safeBase, mimeType);
};

type UploadField =
  | "profilePhotoUrl"
  | "aadhaarFrontUrl"
  | "aadhaarBackUrl"
  | "panFrontUrl"
  | "selfiePhotoUrl"
  | "drivingLicenseFrontUrl"
  | "drivingLicenseBackUrl"
  | "vehicleRcFrontUrl"
  | "vehicleRcBackUrl"
  | "aadhaarUrl"
  | "panUrl"
  | "drivingLicenseUrl"
  | "vehicleRcUrl"
  | "insuranceUrl"
  | "cancelledChequeUrl"
  | "bankPassbookUrl"
  | "bankStatementUrl";

type Docs = NonNullable<DeliveryProfile["documents"]>;

type AddressForm = {
  flatNo: string;
  apartment: string;
  colony: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
};

type UploadAsset = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

type UploadApiResponse = {
  success?: boolean;
  message?: string;
  data?: {
    url?: string;
  };
};

const DOCUMENT_UPLOAD_FIELDS = new Set<UploadField>([
  "aadhaarFrontUrl",
  "aadhaarBackUrl",
  "panFrontUrl",
  "selfiePhotoUrl",
  "drivingLicenseFrontUrl",
  "drivingLicenseBackUrl",
  "vehicleRcFrontUrl",
  "vehicleRcBackUrl",
  "aadhaarUrl",
  "panUrl",
  "drivingLicenseUrl",
  "vehicleRcUrl",
  "insuranceUrl",
  "cancelledChequeUrl",
  "bankPassbookUrl",
  "bankStatementUrl"
]);
const FRONT_FIELD_ALIASES: Partial<Record<UploadField, keyof Docs>> = {
  aadhaarUrl: "aadhaarFrontUrl",
  drivingLicenseUrl: "drivingLicenseFrontUrl",
  vehicleRcUrl: "vehicleRcFrontUrl"
};

const normalizeDocuments = (input?: Partial<Docs> | null): Docs => {
  const next = { ...emptyDocs(), ...(input || {}) } as Docs;

  next.aadhaarFrontUrl = next.aadhaarFrontUrl || next.aadhaarUrl || "";
  next.aadhaarUrl = next.aadhaarUrl || next.aadhaarFrontUrl || "";
  next.panFrontUrl = next.panFrontUrl || next.panUrl || "";
  next.panUrl = next.panUrl || next.panFrontUrl || "";
  next.drivingLicenseFrontUrl = next.drivingLicenseFrontUrl || next.drivingLicenseUrl || "";
  next.drivingLicenseUrl = next.drivingLicenseUrl || next.drivingLicenseFrontUrl || "";
  next.vehicleRcFrontUrl = next.vehicleRcFrontUrl || next.vehicleRcUrl || "";
  next.vehicleRcUrl = next.vehicleRcUrl || next.vehicleRcFrontUrl || "";

  return next;
};

const emptyDocs = (): Docs => ({
  aadhaarNumber: "",
  aadhaarFrontUrl: "",
  aadhaarBackUrl: "",
  aadhaarUrl: "",
  panNumber: "",
  panFrontUrl: "",
  panUrl: "",
  selfiePhotoUrl: "",
  drivingLicenseFrontUrl: "",
  drivingLicenseBackUrl: "",
  drivingLicenseUrl: "",
  vehicleRcFrontUrl: "",
  vehicleRcBackUrl: "",
  vehicleRcUrl: "",
  insuranceUrl: "",
  bankDocumentType: "",
  bankAccountHolderName: "",
  cancelledChequeUrl: "",
  bankPassbookUrl: "",
  bankStatementUrl: "",
  bankAccountNumber: "",
  bankIfsc: "",
  submittedAt: "",
  isComplete: false
});

const emptyAddress = (): AddressForm => ({
  flatNo: "",
  apartment: "",
  colony: "",
  area: "",
  city: "",
  state: "",
  pincode: ""
});

const ADDRESS_LABELS: { key: keyof AddressForm; label: string }[] = [
  { key: "flatNo", label: "Flat No" },
  { key: "apartment", label: "Apartment" },
  { key: "colony", label: "Colony" },
  { key: "area", label: "Area" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "pincode", label: "Pincode" }
];

const buildAddressString = (form: AddressForm) => {
  const line1 = [form.flatNo.trim(), form.apartment.trim()].filter(Boolean).join(", ");
  const line2 = [form.colony.trim(), form.area.trim()].filter(Boolean).join(", ");
  const line3 = [form.city.trim(), form.state.trim(), form.pincode.trim()].filter(Boolean).join(", ");

  return [line1, line2, line3].filter(Boolean).join(", ");
};

const parseAddressString = (address?: string | null): AddressForm => {
  const next = emptyAddress();
  if (!address) return next;

  const labelledValueFound = ADDRESS_LABELS.some(({ label }) =>
    new RegExp(`${label}\\s*:`,"i").test(address)
  );

  if (labelledValueFound) {
    for (const { key, label } of ADDRESS_LABELS) {
      const match = address.match(new RegExp(`${label}\\s*:\\s*([^|\\n]+)`, "i"));
      if (match?.[1]) {
        next[key] = match[1].trim();
      }
    }
    return next;
  }

  const parts = address
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length >= 1) next.flatNo = parts[0] || "";
  if (parts.length >= 2) next.apartment = parts[1] || "";
  if (parts.length >= 3) next.colony = parts[2] || "";
  if (parts.length >= 4) next.area = parts[3] || "";
  if (parts.length >= 5) next.city = parts[4] || "";
  if (parts.length >= 6) next.state = parts[5] || "";
  if (parts.length >= 7) next.pincode = parts[6] || "";

  return next;
};

const isPdfFile = (value?: string | null) => Boolean(value && /\.pdf($|\?)/i.test(value));
const GENERIC_UPLOAD_ERROR = "Something went wrong. Please try again.";

const uploadAssetToServer = async (asset: UploadAsset, field: UploadField) => {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error(GENERIC_UPLOAD_ERROR);
  }

  const rawFileName = asset.name || asset.uri.split("/").pop() || null;
  const mimeType = getUploadMimeType(rawFileName || field, asset.mimeType);
  const fileName = createUploadFileName(field, mimeType, rawFileName);
  const formData = new FormData();

  // @ts-ignore React Native FormData
  formData.append("image", {
    uri: asset.uri,
    type: mimeType,
    name: fileName
  });

  let lastErrorMessage = GENERIC_UPLOAD_ERROR;

  for (const baseUrl of API_BASE_URLS) {
    try {
      console.log(`Uploading file via fetch to ${baseUrl}/upload/image`, {
        field,
        uri: asset.uri,
        mimeType,
        fileName
      });

      const response = await fetch(`${baseUrl}/upload/image`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const responseData = await response.json() as UploadApiResponse;

      if (!response.ok || !responseData?.success || !responseData?.data?.url) {
        lastErrorMessage = GENERIC_UPLOAD_ERROR;
        continue;
      }

      return responseData.data.url;
    } catch (error: any) {
      lastErrorMessage = GENERIC_UPLOAD_ERROR;
      console.log(`Upload attempt failed for ${baseUrl}`, { message: lastErrorMessage });
    }
  }

  throw new Error(lastErrorMessage);
};

const statusTone: Record<DeliveryProfile["status"], { bg: string; fg: string; label: string }> = {
  PENDING: { bg: "#FFF4E8", fg: "#C2410C", label: "Pending Review" },
  VERIFIED: { bg: "#ECFDF3", fg: "#027A48", label: "Verified" },
  ACTIVE: { bg: "#E8FFF3", fg: "#087443", label: "Active" },
  REJECTED: { bg: "#FEF3F2", fg: "#B42318", label: "Rejected" },
  SUSPENDED: { bg: "#FDECEC", fg: "#B42318", label: "Suspended" },
  INACTIVE: { bg: "#F2F4F7", fg: "#475467", label: "Incomplete" }
};

export default function ProfileScreen({ navigation, route }: any) {
  const forceComplete = Boolean(route?.params?.forceComplete);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [uploadingFields, setUploadingFields] = useState<UploadField[]>([]);
  const [profile, setProfile] = useState<DeliveryProfile | null>(null);
  const [step, setStep] = useState(0);
  const [editingBank, setEditingBank] = useState(false);
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [todayEarnings, setTodayEarnings] = useState(0);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddress());
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [vehicleType, setVehicleType] = useState<DeliveryProfile["vehicleType"]>("Bike");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [documents, setDocuments] = useState<Docs>(emptyDocs());
  const formattedAddress = useMemo(() => buildAddressString(addressForm), [addressForm]);
  const requiresMotorDocuments = !["Cycle", "Bicycle"].includes(vehicleType);

  const updateAddressField = (key: keyof AddressForm, value: string) => {
    setAddressForm((current) => ({
      ...current,
      [key]: key === "pincode" ? value.replace(/\D/g, "").slice(0, 6) : value
    }));
  };

  const syncProfile = (data: DeliveryProfile) => {
    setProfile(data);
    setName(data.name || "");
    setEmail(data.email || "");
    setDateOfBirth(data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : "");
    setAddressForm(parseAddressString(data.address || ""));
    setEmergencyContactName(data.emergencyContactName || "");
    setEmergencyContactPhone(data.emergencyContactPhone || "");
    setVehicleType(data.vehicleType || "Bike");
    setVehicleNumber(data.vehicleNumber || "");
    setLicenseNumber(data.licenseNumber || "");
    setProfilePhotoUrl(data.profilePhotoUrl || "");
    setIsAvailable(typeof data.isAvailable === "boolean" ? data.isAvailable : true);
    setTermsAccepted(Boolean(data.termsAcceptedAt));
    setDocuments(normalizeDocuments(data.documents));
  };

  const loadDashboardStats = async () => {
    try {
      const [statsResponse, earningsResponse] = await Promise.all([
        getDeliveryStats(),
        getTodaysEarnings()
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      if (earningsResponse.success && earningsResponse.data) {
        setTodayEarnings(earningsResponse.data.earnings);
      }
    } catch (error) {
      console.log("Failed to load delivery dashboard stats", error);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getDeliveryProfile();
        if (response.success && response.data) {
          syncProfile(response.data);
          if (response.data.status === "ACTIVE") {
            loadDashboardStats().catch(() => {});
          }
          const draft = await AsyncStorage.getItem(DRAFT_KEY);
          if ((forceComplete || !response.data.isProfileComplete) && draft) {
            const parsed = JSON.parse(draft);
            setName(parsed.name || response.data.name || "");
            setEmail(parsed.email || response.data.email || "");
            setDateOfBirth(parsed.dateOfBirth || (response.data.dateOfBirth ? response.data.dateOfBirth.slice(0, 10) : ""));
            setAddressForm(parsed.addressForm || parseAddressString(parsed.address || response.data.address || ""));
            setEmergencyContactName(parsed.emergencyContactName || response.data.emergencyContactName || "");
            setEmergencyContactPhone(parsed.emergencyContactPhone || response.data.emergencyContactPhone || "");
            setVehicleType(parsed.vehicleType || response.data.vehicleType || "Bike");
            setVehicleNumber(parsed.vehicleNumber || response.data.vehicleNumber || "");
            setLicenseNumber(parsed.licenseNumber || response.data.licenseNumber || "");
            setProfilePhotoUrl(parsed.profilePhotoUrl || response.data.profilePhotoUrl || "");
            setIsAvailable(typeof parsed.isAvailable === "boolean" ? parsed.isAvailable : response.data.isAvailable);
            setTermsAccepted(typeof parsed.termsAccepted === "boolean" ? parsed.termsAccepted : Boolean(response.data.termsAcceptedAt));
            setDocuments(normalizeDocuments({ ...(response.data.documents || {}), ...(parsed.documents || {}) }));
            setStep(typeof parsed.step === "number" ? Math.min(Math.max(parsed.step, 0), 3) : 0);
          }
        } else {
          Alert.alert("Error", response.message || "Failed to load profile");
        }
      } catch (error: any) {
        Alert.alert("Error", error.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        name,
        email,
        dateOfBirth,
        address: formattedAddress,
        addressForm,
        emergencyContactName,
        emergencyContactPhone,
        vehicleType,
        vehicleNumber,
        licenseNumber,
        profilePhotoUrl,
        isAvailable,
        termsAccepted,
        documents,
        step
      })
    ).catch(() => {});
  }, [name, email, dateOfBirth, formattedAddress, addressForm, emergencyContactName, emergencyContactPhone, vehicleType, vehicleNumber, licenseNumber, profilePhotoUrl, isAvailable, termsAccepted, documents, step]);

  const isActiveDashboard = !forceComplete && profile?.status === "ACTIVE";

  const formatCurrency = (amount?: number | null) => `Rs ${(amount || 0).toLocaleString("en-IN")}`;

  const safeValue = (value?: string | null, fallback = "Not added") => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : fallback;
  };

  const isAdultDateOfBirth = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return false;
    const parsed = new Date(`${value.trim()}T00:00:00`);
    if (Number.isNaN(parsed.getTime()) || parsed > new Date()) return false;
    const today = new Date();
    let age = today.getFullYear() - parsed.getFullYear();
    const monthDelta = today.getMonth() - parsed.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < parsed.getDate())) {
      age -= 1;
    }
    return age >= 18;
  };

  const employeeId = profile?._id ? `DLV-${profile._id.slice(-6).toUpperCase()}` : "Assigned after verification";

  const verificationStatusLabel = profile?.status === "ACTIVE" ? "Approved" : statusTone[profile?.status || "INACTIVE"].label;

  const documentStatusItems = [
    { label: "Profile photo", ready: Boolean(profilePhotoUrl) },
    { label: "Selfie verification", ready: Boolean(documents.selfiePhotoUrl) },
    { label: "Driving license", ready: !requiresMotorDocuments || Boolean(documents.drivingLicenseFrontUrl && documents.drivingLicenseBackUrl) },
    { label: "Vehicle RC", ready: !requiresMotorDocuments || Boolean(documents.vehicleRcFrontUrl && documents.vehicleRcBackUrl) },
    { label: "Insurance", ready: !requiresMotorDocuments || Boolean(documents.insuranceUrl) },
    { label: "ID proof", ready: Boolean((documents.aadhaarFrontUrl && documents.aadhaarBackUrl) || documents.panFrontUrl) }
  ];

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(["token", "user"]);
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  const handleAvailabilityToggle = async () => {
    const nextValue = !isAvailable;
    setIsAvailable(nextValue);
    setAvailabilitySaving(true);
    try {
      const response = await updateDeliveryProfile({ isAvailable: nextValue });
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to update availability");
      }
      syncProfile(response.data);
    } catch (error: any) {
      setIsAvailable(!nextValue);
      Alert.alert("Error", error.message || "Failed to update availability");
    } finally {
      setAvailabilitySaving(false);
    }
  };

  const handleSaveBankDetails = async () => {
    if (!documents.bankAccountHolderName?.trim()) {
      Alert.alert("Missing details", "Account holder name is required.");
      return;
    }
    if (!documents.bankIfsc?.trim()) {
      Alert.alert("Missing details", "IFSC code is required.");
      return;
    }
    if (documents.bankAccountNumber?.trim() && !/^[0-9]+$/.test(documents.bankAccountNumber.trim())) {
      Alert.alert("Invalid details", "Bank account number must be numeric.");
      return;
    }

    setBankSaving(true);
    try {
      const response = await updateDeliveryProfile({
        documents: {
          ...documents,
          bankAccountHolderName: documents.bankAccountHolderName?.trim(),
          bankAccountNumber: documents.bankAccountNumber?.trim() || "",
          bankIfsc: documents.bankIfsc?.trim().toUpperCase()
        }
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to update payout details");
      }

      syncProfile(response.data);
      setEditingBank(false);
      Alert.alert("Saved", "Payout details updated successfully.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update payout details");
    } finally {
      setBankSaving(false);
    }
  };

  const renderInfoRow = (label: string, value: string) => (
    <View style={styles.infoRow} key={label}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  const renderShortcut = (icon: keyof typeof Ionicons.glyphMap, title: string, subtitle: string, onPress: () => void) => (
    <TouchableOpacity style={styles.shortcutCard} onPress={onPress} key={title}>
      <View style={styles.shortcutIcon}>
        <Ionicons name={icon} size={18} color="#C2410C" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.shortcutTitle}>{title}</Text>
        <Text style={styles.shortcutSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
    </TouchableOpacity>
  );

  const renderActiveProfile = () => (
    <View style={[styles.safeAreaScreen, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 36 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dashboardHero}>
        <View style={styles.dashboardHeaderRow}>
          <View style={styles.dashboardAvatarWrap}>
            {profilePhotoUrl ? (
              <Image source={{ uri: profilePhotoUrl }} style={styles.dashboardAvatar} />
            ) : (
              <View style={styles.dashboardAvatarFallback}>
                <Ionicons name="person" size={28} color="#C2410C" />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dashboardName}>{name || profile?.name || "Delivery Partner"}</Text>
            <Text style={styles.dashboardMeta}>{employeeId}</Text>
            <View style={[styles.liveBadge, isAvailable && styles.liveBadgeActive]}>
              <Text style={[styles.liveBadgeText, isAvailable && styles.liveBadgeTextActive]}>{isAvailable ? "Online for jobs" : "Offline right now"}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.dashboardSubtitle}>Your rider profile is active. Manage payout details, work status, verification documents, and support from one place.</Text>
      </View>

      <View style={[styles.statusCard, { backgroundColor: currentStatus.bg }]}>
        <Text style={[styles.statusLabel, { color: currentStatus.fg }]}>{currentStatus.label}</Text>
        <Text style={styles.statusText}>You can now access jobs while keeping profile, payout, and support details updated.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Basic Profile Details</Text>
        {renderInfoRow("Full name", safeValue(name || profile?.name))}
        {renderInfoRow("Phone number", safeValue(profile?.phone))}
        {renderInfoRow("Date of birth", safeValue(dateOfBirth))}
        {renderInfoRow("Partner / Employee ID", employeeId)}
        {renderInfoRow("Vehicle type", safeValue(vehicleType))}
        {renderInfoRow("Email", safeValue(email))}

        {renderInfoRow("Emergency contact", safeValue(emergencyContactName && emergencyContactPhone ? `${emergencyContactName} (${emergencyContactPhone})` : ""))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Documents and Verification</Text>
        {documentStatusItems.map((item) => (
          <View style={styles.docRow} key={item.label}>
            <Text style={styles.infoLabel}>{item.label}</Text>
            <View style={[styles.docBadge, item.ready ? styles.docBadgeReady : styles.docBadgePending]}>
              <Text style={[styles.docBadgeText, item.ready ? styles.docBadgeTextReady : styles.docBadgeTextPending]}>{item.ready ? "Uploaded" : "Missing"}</Text>
            </View>
          </View>
        ))}
        {renderInfoRow("Verification status", verificationStatusLabel)}
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statTile}>
          <Text style={styles.statTileLabel}>Daily earnings</Text>
          <Text style={styles.statTileValue}>{formatCurrency(todayEarnings)}</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statTileLabel}>Weekly earnings</Text>
          <Text style={styles.statTileValue}>{formatCurrency((stats?.todaysEarnings || todayEarnings) * 7)}</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statTileLabel}>Wallet balance</Text>
          <Text style={styles.statTileValue}>{formatCurrency(stats?.totalEarnings || profile?.totalEarnings)}</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statTileLabel}>Incentives and bonuses</Text>
          <Text style={styles.statTileValue}>{formatCurrency(Math.max(0, (stats?.todaysEarnings || 0) - todayEarnings))}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bank Account Details</Text>
        {editingBank ? (
          <>
            <Text style={styles.label}>Account Holder Name</Text>
            <TextInput style={styles.input} value={documents.bankAccountHolderName || ""} onChangeText={(value) => setDocuments((current) => ({ ...current, bankAccountHolderName: value }))} placeholder="Enter account holder name" placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
            <Text style={styles.label}>Bank Account Number (Optional for now)</Text>
        <TextInput style={styles.input} value={documents.bankAccountNumber || ""} onChangeText={(value) => setDocuments((current) => ({ ...current, bankAccountNumber: value.replace(/\D/g, "") }))} placeholder="Enter bank account number" placeholderTextColor="#98A2B3" keyboardType="number-pad" selectionColor="#FF6B35" />
            <Text style={styles.label}>IFSC Code</Text>
            <TextInput style={styles.input} value={documents.bankIfsc || ""} onChangeText={(value) => setDocuments((current) => ({ ...current, bankIfsc: value.toUpperCase() }))} placeholder="Enter IFSC code" placeholderTextColor="#98A2B3" autoCapitalize="characters" selectionColor="#FF6B35" />
            <Text style={styles.label}>UPI ID</Text>
            <View style={styles.readOnly}><Text style={styles.readOnlyText}>UPI update support will be added soon.</Text></View>
            <View style={styles.inlineActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setEditingBank(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButton, bankSaving && styles.disabled]} onPress={handleSaveBankDetails} disabled={bankSaving}>
                {bankSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryButtonText}>Save Payout</Text>}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {renderInfoRow("Account holder name", safeValue(documents.bankAccountHolderName))}
            {renderInfoRow("Bank account number", safeValue(documents.bankAccountNumber ? `••••${documents.bankAccountNumber.slice(-4)}` : ""))}
            {renderInfoRow("IFSC code", safeValue(documents.bankIfsc))}
            {renderInfoRow("UPI ID", "Add in next update")}
            <TouchableOpacity style={styles.primaryButton} onPress={() => setEditingBank(true)}>
              <Text style={styles.primaryButtonText}>Edit Payout Details</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Work Stats and Performance</Text>
        {renderInfoRow("Total deliveries completed", String(stats?.totalDeliveries || profile?.totalDeliveries || 0))}
        {renderInfoRow("Customer ratings", `${(profile?.rating || 0).toFixed(1)} / 5 (${profile?.ratingCount || 0} ratings)`)}
        {renderInfoRow("Acceptance rate", "Available soon")}
        {renderInfoRow("On-time delivery percentage", "Available soon")}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Availability and Duty Status</Text>
        <TouchableOpacity style={styles.availability} onPress={handleAvailabilityToggle} disabled={availabilitySaving}>
          <View style={{ flex: 1 }}>
            <Text style={styles.availabilityTitle}>Online / Offline toggle</Text>
            <Text style={styles.availabilityText}>Control whether you want to receive delivery opportunities right now.</Text>
          </View>
          <View style={[styles.badge, isAvailable && styles.badgeActive]}>
            {availabilitySaving ? <ActivityIndicator size="small" color={isAvailable ? "#fff" : "#475467"} /> : <Text style={[styles.badgeText, isAvailable && styles.badgeTextActive]}>{isAvailable ? "Online" : "Offline"}</Text>}
          </View>
        </TouchableOpacity>
        {renderInfoRow("Shift selection", "Open shift")}
        {renderInfoRow("Break mode", isAvailable ? "Off" : "Enabled while offline")}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Support and Help</Text>
        {renderShortcut("help-circle-outline", "Help center", "Get answers for payouts, jobs, and verification.", () => Alert.alert("Help center", "Help center will be connected in the next update."))}
        {renderShortcut("flag-outline", "Report an issue", "Tell us if something is broken or confusing.", () => Alert.alert("Report issue", "Issue reporting will be connected in the next update."))}
        {renderShortcut("call-outline", "Emergency support", "Fast support access for rider safety situations.", () => Alert.alert("Emergency support", "Emergency support contact will be added here."))}
        {renderShortcut("chatbubble-ellipses-outline", "Chat / call support", "Reach operations if you need quick help.", () => Alert.alert("Support", "Chat and call support will be connected soon."))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Settings</Text>
        {renderShortcut("notifications-outline", "Notification preferences", "Choose job and payout alerts.", () => Alert.alert("Notifications", "Notification preferences will be available soon."))}
        {renderShortcut("language-outline", "Language settings", "Change your preferred app language.", () => Alert.alert("Language", "Language settings will be available soon."))}
        {renderShortcut("options-outline", "App preferences", "Control app behavior and display options.", () => Alert.alert("Preferences", "App preferences will be available soon."))}
        {renderShortcut("gift-outline", "Referral program", "Invite other riders and earn rewards.", () => Alert.alert("Referral program", "Referral tracking will be added soon."))}
        {renderShortcut("trending-up-outline", "Incentive tracking", "See streaks, quests, and bonus targets.", () => Alert.alert("Incentive tracking", "Incentive tracking will be available soon."))}
        {renderShortcut("school-outline", "Training and onboarding", "Refresh rider onboarding and app usage guidance.", () => Alert.alert("Training", "Training modules will be added soon."))}
        {renderShortcut("shield-outline", "Safety guidelines", "Check rider safety practices and emergency tips.", () => Alert.alert("Safety guidelines", "Safety guidance will be available here soon."))}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  const mandatoryDocsComplete = useMemo(() => {
    const normalized = normalizeDocuments(documents);
    return Boolean(
      profilePhotoUrl &&
        normalized.aadhaarFrontUrl &&
        normalized.aadhaarBackUrl &&
        normalized.panFrontUrl &&
        normalized.selfiePhotoUrl &&
        (!requiresMotorDocuments ||
          (normalized.drivingLicenseFrontUrl &&
            normalized.drivingLicenseBackUrl &&
            normalized.vehicleRcFrontUrl &&
            normalized.vehicleRcBackUrl &&
            normalized.insuranceUrl))
    );
  }, [documents, profilePhotoUrl, requiresMotorDocuments]);

  const validateStep = (index: number) => {
    if (index === 0) {
      if (name.trim().length < 3) return "Please enter your full name.";
      if (!profilePhotoUrl) return "Profile photo is required.";
      if (!isAdultDateOfBirth(dateOfBirth)) return "Enter date of birth as YYYY-MM-DD. Delivery partners must be at least 18.";
      if (!addressForm.flatNo.trim()) return "Flat / house number is required.";
      if (!addressForm.apartment.trim()) return "Apartment / building name is required.";
      if (!addressForm.colony.trim()) return "Colony / society is required.";
      if (!addressForm.area.trim()) return "Area / locality is required.";
      if (!addressForm.city.trim()) return "City is required.";
      if (!addressForm.state.trim()) return "State is required.";
      if (!/^[0-9]{6}$/.test(addressForm.pincode.trim())) return "Pincode must be 6 digits.";
      if (emergencyContactName.trim().length < 3) return "Emergency contact name is required.";
      if (!/^[0-9]{10}$/.test(emergencyContactPhone.trim())) return "Emergency contact phone must be 10 digits.";
    }
    if (index === 1) {
      if (requiresMotorDocuments) {
        if (!vehicleNumber.trim()) return "Vehicle number is required.";
        if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,12}$/i.test(vehicleNumber.trim())) return "Vehicle number format looks invalid.";
        if (!licenseNumber.trim()) return "Driving license is required.";
        if (!/^[A-Z]{2}[0-9]{2}[0-9A-Z]{8,14}$/i.test(licenseNumber.trim())) return "Driving license format looks invalid.";
      }
    }
    if (index === 2) {
      const aadhaarNumber = documents.aadhaarNumber?.trim() || "";
      const panNumber = documents.panNumber?.trim().toUpperCase() || "";
      if (!/^[0-9]{12}$/.test(aadhaarNumber)) return "Aadhaar number must be 12 digits.";
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNumber)) return "PAN number must match AAAAA9999A format.";
      const normalized = normalizeDocuments(documents);
      if (!normalized.aadhaarFrontUrl || !normalized.aadhaarBackUrl || !normalized.panFrontUrl) {
        return "Aadhaar front/back and PAN front are mandatory.";
      }
      if (!normalized.selfiePhotoUrl) return "Selfie/photo verification is required.";
      if (requiresMotorDocuments && (!normalized.drivingLicenseFrontUrl || !normalized.drivingLicenseBackUrl || !normalized.vehicleRcFrontUrl || !normalized.vehicleRcBackUrl || !normalized.insuranceUrl)) {
        return "Driving license front/back, vehicle RC front/back, and insurance document are mandatory.";
      }
    }
    if (index === 3) {
      const hasAnyBankInput = Boolean(
        documents.bankAccountHolderName?.trim() ||
        documents.bankAccountNumber?.trim() ||
        documents.bankIfsc?.trim() ||
        documents.bankDocumentType ||
        documents.cancelledChequeUrl ||
        documents.bankPassbookUrl ||
        documents.bankStatementUrl
      );

      if (hasAnyBankInput) {
        if (!documents.bankAccountHolderName?.trim()) return "Account holder name is required if you add bank details.";
        if (documents.bankAccountNumber?.trim() && !/^[0-9]+$/.test(documents.bankAccountNumber.trim())) return "Bank account number must be numeric.";
        if (!documents.bankIfsc?.trim()) return "IFSC code is required if you add bank details.";
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(documents.bankIfsc.trim().toUpperCase())) return "IFSC code format is invalid.";
        if (!documents.bankDocumentType || (!documents.cancelledChequeUrl && !documents.bankPassbookUrl && !documents.bankStatementUrl)) {
          return "Upload one bank proof if you add bank details.";
        }
      }
      if (!termsAccepted) return "Please accept the delivery partner terms and conditions.";
    }
    return null;
  };

  const pickDocument = async (field: UploadField): Promise<UploadAsset | null> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
      multiple: false
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.name || `document-${Date.now()}`,
      mimeType: asset.mimeType
    };
  };

  const pickImage = async (field?: UploadField): Promise<UploadAsset | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Permission needed", "Please allow gallery access to upload images.");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: field === "profilePhotoUrl",
      aspect: field === "profilePhotoUrl" ? [1, 1] : undefined,
      quality: 0.6
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.fileName || asset.uri.split("/").pop() || `image-${Date.now()}.jpg`,
      mimeType: asset.mimeType
    };
  };

  const pickLiveSelfie = async (): Promise<UploadAsset | null> => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Camera permission needed", GENERIC_UPLOAD_ERROR);
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: false,
      quality: 0.8
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.fileName || asset.uri.split("/").pop() || `selfie-${Date.now()}.jpg`,
      mimeType: asset.mimeType
    };
  };

  const uploadFile = async (field: UploadField) => {
    if (uploadingFields.includes(field)) {
      return;
    }

    try {
      const shouldUseDocumentPicker = DOCUMENT_UPLOAD_FIELDS.has(field);
      const asset = field === "selfiePhotoUrl"
        ? await pickLiveSelfie()
        : shouldUseDocumentPicker
          ? await pickDocument(field)
          : await pickImage(field);
      if (!asset?.uri) return;

      setUploadingFields((current) => (current.includes(field) ? current : [...current, field]));
      const url = await uploadAssetToServer(asset, field);

      if (field === "profilePhotoUrl") {
        setProfilePhotoUrl(url);
      } else {
        setDocuments((current) => {
          const next = { ...current, [field]: url } as Docs;
          const aliasField = FRONT_FIELD_ALIASES[field];
          if (aliasField) {
            next[aliasField] = url as never;
          }
          return normalizeDocuments(next);
        });
      }
    } catch (error: any) {
      Alert.alert("Something went wrong", GENERIC_UPLOAD_ERROR);
    } finally {
      setUploadingFields((current) => current.filter((item) => item !== field));
    }
  };

  const handleSaveDraft = async () => {
    await AsyncStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ name, email, dateOfBirth, address: formattedAddress, addressForm, emergencyContactName, emergencyContactPhone, vehicleType, vehicleNumber, licenseNumber, profilePhotoUrl, isAvailable, termsAccepted, documents, step })
    );
    Alert.alert("Saved", "Your draft is saved on this device.");
  };

  const handleSubmit = async () => {
    for (let i = 0; i < STEPS.length; i += 1) {
      const error = validateStep(i);
      if (error) {
        setStep(i);
        Alert.alert("Missing details", error);
        return;
      }
    }

    try {
      setSaving(true);
      const normalizedDocuments = normalizeDocuments(documents);
      const response = await updateDeliveryProfile({
        name: name.trim(),
        email: email.trim() || undefined,
        dateOfBirth: dateOfBirth.trim(),
        address: formattedAddress,
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
        vehicleType,
        vehicleNumber: requiresMotorDocuments ? vehicleNumber.trim().toUpperCase() : undefined,
        licenseNumber: requiresMotorDocuments ? licenseNumber.trim().toUpperCase() : undefined,
        profilePhotoUrl,
        isAvailable,
        termsAccepted,
        status: "PENDING",
        documents: {
          ...normalizedDocuments,
          aadhaarNumber: normalizedDocuments.aadhaarNumber?.trim(),
          aadhaarFrontUrl: normalizedDocuments.aadhaarFrontUrl,
          panNumber: normalizedDocuments.panNumber?.trim().toUpperCase(),
          panFrontUrl: normalizedDocuments.panFrontUrl,
          selfiePhotoUrl: normalizedDocuments.selfiePhotoUrl,
          drivingLicenseFrontUrl: normalizedDocuments.drivingLicenseFrontUrl,
          vehicleRcFrontUrl: normalizedDocuments.vehicleRcFrontUrl,
          bankAccountHolderName: documents.bankAccountHolderName?.trim(),
          bankAccountNumber: documents.bankAccountNumber?.trim() || "",
          bankIfsc: documents.bankIfsc?.trim().toUpperCase()
        }
      });

      if (!response.success || !response.data) {
        Alert.alert("Error", response.message || "Failed to save profile");
        return;
      }

      syncProfile(response.data);
      await AsyncStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          name,
          email,
          dateOfBirth,
          address: formattedAddress,
          addressForm,
          emergencyContactName,
          emergencyContactPhone,
          vehicleType,
          vehicleNumber,
          licenseNumber,
          profilePhotoUrl,
          isAvailable,
          termsAccepted,
          documents,
          step
        })
      );
      Alert.alert("Submitted", "Your delivery profile is now pending admin verification.");
      navigation.reset({ index: 0, routes: [{ name: resolveDeliveryRoute(response.data) }] });
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const renderUpload = (field: UploadField, title: string, subtitle: string, required?: boolean) => {
    const url = field === "profilePhotoUrl" ? profilePhotoUrl : documents[field as keyof Docs];
    const showImagePreview = typeof url === "string" && url && !isPdfFile(url);
    const uploadModeText = field === "profilePhotoUrl" ? "Image only" : field === "selfiePhotoUrl" ? "Live camera" : "Image or PDF";
    return (
      <View style={styles.uploadCard} key={field}>
        <View style={styles.uploadHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.uploadTitle}>{title}{required ? " *" : ""}</Text>
            <Text style={styles.uploadSubtitle}>{subtitle}</Text>
          </View>
          <View style={styles.uploadBadge}>
            <Text style={styles.uploadBadgeText}>{uploadModeText}</Text>
          </View>
        </View>
        {showImagePreview ? (
          <Image source={{ uri: url }} style={styles.preview} />
        ) : typeof url === "string" && url ? (
          <View style={styles.fileBadge}>
            <Ionicons name={isPdfFile(url) ? "document-outline" : "checkmark-circle"} size={20} color="#027A48" />
            <Text style={styles.fileBadgeText}>{isPdfFile(url) ? "PDF uploaded successfully" : "File uploaded successfully"}</Text>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="document-text-outline" size={20} color="#98A2B3" />
            <Text style={styles.placeholderText}>No file uploaded yet</Text>
          </View>
        )}
        <TouchableOpacity style={styles.uploadButton} onPress={() => uploadFile(field)} disabled={uploadingFields.includes(field)}>
          {uploadingFields.includes(field) ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.uploadButtonText}>
              {field === "profilePhotoUrl"
                ? (url ? "Change Photo" : "Choose & Crop Photo")
                : field === "selfiePhotoUrl"
                  ? (url ? "Retake Selfie" : "Take Live Selfie")
                  : url ? "Replace File" : "Browse File"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Basic Details</Text>
          <Text style={styles.cardText}>Add the identity and address details the admin will verify.</Text>
          {renderUpload("profilePhotoUrl", "Profile Photo", "Required for easy identification", true)}
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter full name" placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.readOnly}><Text style={styles.readOnlyText}>{profile?.phone || "Verified with OTP"}</Text></View>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Enter email address" placeholderTextColor="#98A2B3" autoCapitalize="none" keyboardType="email-address" selectionColor="#FF6B35" />
          <Text style={styles.label}>Date of Birth</Text>
          <TextInput style={styles.input} value={dateOfBirth} onChangeText={(value) => setDateOfBirth(value.replace(/[^0-9-]/g, "").slice(0, 10))} placeholder="YYYY-MM-DD" placeholderTextColor="#98A2B3" keyboardType="numbers-and-punctuation" selectionColor="#FF6B35" />
          <Text style={styles.label}>Current Address</Text>
          <TextInput style={styles.input} value={addressForm.flatNo} onChangeText={(value) => updateAddressField("flatNo", value)} placeholder="Flat / house no." placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
          <TextInput style={[styles.input, styles.stackedInput]} value={addressForm.apartment} onChangeText={(value) => updateAddressField("apartment", value)} placeholder="Apartment / building name" placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
          <TextInput style={[styles.input, styles.stackedInput]} value={addressForm.colony} onChangeText={(value) => updateAddressField("colony", value)} placeholder="Colony / society" placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
          <TextInput style={[styles.input, styles.stackedInput]} value={addressForm.area} onChangeText={(value) => updateAddressField("area", value)} placeholder="Area / locality" placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
          <TextInput style={[styles.input, styles.stackedInput]} value={addressForm.city} onChangeText={(value) => updateAddressField("city", value)} placeholder="City" placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
          <TextInput style={[styles.input, styles.stackedInput]} value={addressForm.state} onChangeText={(value) => updateAddressField("state", value)} placeholder="State" placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
          <TextInput style={[styles.input, styles.stackedInput]} value={addressForm.pincode} onChangeText={(value) => updateAddressField("pincode", value)} placeholder="Pincode" placeholderTextColor="#98A2B3" keyboardType="number-pad" maxLength={6} selectionColor="#FF6B35" />
          <Text style={styles.label}>Emergency Contact Name</Text>
          <TextInput style={styles.input} value={emergencyContactName} onChangeText={setEmergencyContactName} placeholder="Name (Father)" placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
          <Text style={styles.label}>Emergency Contact Phone</Text>
          <TextInput style={styles.input} value={emergencyContactPhone} onChangeText={(value) => setEmergencyContactPhone(value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" placeholderTextColor="#98A2B3" keyboardType="number-pad" maxLength={10} selectionColor="#FF6B35" />
        </View>
      );
    }

    if (step === 1) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vehicle Details</Text>
          <Text style={styles.cardText}>We use this for operational checks and legal verification.</Text>
          <Text style={styles.label}>Vehicle Type</Text>
          <View style={styles.chips}>
            {VEHICLE_TYPES.map((item) => (
              <TouchableOpacity key={item} style={[styles.chip, vehicleType === item && styles.chipActive]} onPress={() => setVehicleType(item)}>
                <Text style={[styles.chipText, vehicleType === item && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Vehicle Number{requiresMotorDocuments ? "" : " (Optional)"}</Text>
          <TextInput style={styles.input} value={vehicleNumber} onChangeText={setVehicleNumber} placeholder={requiresMotorDocuments ? "TS09AB1234" : "Optional for bicycle"} placeholderTextColor="#98A2B3" autoCapitalize="characters" selectionColor="#FF6B35" />
          <Text style={styles.label}>Driving License Number{requiresMotorDocuments ? "" : " (Not required for bicycle)"}</Text>
          <TextInput style={styles.input} value={licenseNumber} onChangeText={setLicenseNumber} placeholder={requiresMotorDocuments ? "TS0120230012345" : "Not required"} placeholderTextColor="#98A2B3" autoCapitalize="characters" selectionColor="#FF6B35" editable={requiresMotorDocuments} />
          <TouchableOpacity style={styles.availability} onPress={() => setIsAvailable((current) => !current)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.availabilityTitle}>Account availability</Text>
              <Text style={styles.availabilityText}>Turn this on when you are ready to accept jobs.</Text>
            </View>
            <View style={[styles.badge, isAvailable && styles.badgeActive]}>
              <Text style={[styles.badgeText, isAvailable && styles.badgeTextActive]}>{isAvailable ? "Yes" : "No"}</Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 2) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Documents</Text>
          <Text style={styles.cardText}>Mandatory documents are required for legal compliance and rider safety.</Text>
          <Text style={styles.label}>Aadhaar Number</Text>
          <TextInput style={styles.input} value={documents.aadhaarNumber || ""} onChangeText={(value) => setDocuments((current) => ({ ...current, aadhaarNumber: value.replace(/\D/g, "").slice(0, 12) }))} placeholder="12-digit Aadhaar number" placeholderTextColor="#98A2B3" keyboardType="number-pad" selectionColor="#FF6B35" />
          <Text style={styles.label}>PAN Number</Text>
          <TextInput style={styles.input} value={documents.panNumber || ""} onChangeText={(value) => setDocuments((current) => ({ ...current, panNumber: value.toUpperCase().slice(0, 10) }))} placeholder="AAAAA9999A" placeholderTextColor="#98A2B3" autoCapitalize="characters" selectionColor="#FF6B35" />
          {renderUpload("aadhaarUrl", "Aadhaar - Upload Front Side", "Mandatory for KYC and identity verification", true)}
          {renderUpload("aadhaarBackUrl", "Aadhaar - Upload Back Side", "Mandatory for address/KYC verification", true)}
          {renderUpload("panFrontUrl", "PAN Card - Upload Front Side", "Mandatory identity proof", true)}
          {renderUpload("selfiePhotoUrl", "Live Selfie Verification", "Use the front camera to capture a live selfie for verification", true)}
          {renderUpload("drivingLicenseUrl", "Driving License - Upload Front Side", requiresMotorDocuments ? "Mandatory for motor vehicle delivery" : "Optional for bicycle riders", requiresMotorDocuments)}
          {renderUpload("drivingLicenseBackUrl", "Driving License - Upload Back Side", requiresMotorDocuments ? "Mandatory license back side" : "Optional for bicycle riders", requiresMotorDocuments)}
          {renderUpload("vehicleRcUrl", "Vehicle RC - Upload Front Side", requiresMotorDocuments ? "Mandatory vehicle ownership proof" : "Optional for bicycle riders", requiresMotorDocuments)}
          {renderUpload("vehicleRcBackUrl", "Vehicle RC - Upload Back Side", requiresMotorDocuments ? "Mandatory vehicle ownership proof" : "Optional for bicycle riders", requiresMotorDocuments)}
          {renderUpload("insuranceUrl", "Vehicle Insurance", requiresMotorDocuments ? "Mandatory single document" : "Optional for bicycle riders", requiresMotorDocuments)}
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bank Details</Text>
        <Text style={styles.cardText}>Add payout identity details. You can add or update them later from Profile.</Text>
        <Text style={styles.label}>Account Holder Name</Text>
        <TextInput style={styles.input} value={documents.bankAccountHolderName || ""} onChangeText={(value) => setDocuments((current) => ({ ...current, bankAccountHolderName: value }))} placeholder="Enter account holder name" placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
        <Text style={styles.label}>Bank Account Number</Text>
        <TextInput style={styles.input} value={documents.bankAccountNumber || ""} onChangeText={(value) => setDocuments((current) => ({ ...current, bankAccountNumber: value.replace(/\D/g, "") }))} placeholder="Enter account number" placeholderTextColor="#98A2B3" keyboardType="number-pad" selectionColor="#FF6B35" />
        <Text style={styles.label}>IFSC Code</Text>
        <TextInput style={styles.input} value={documents.bankIfsc || ""} onChangeText={(value) => setDocuments((current) => ({ ...current, bankIfsc: value.toUpperCase() }))} placeholder="Enter IFSC code" placeholderTextColor="#98A2B3" autoCapitalize="characters" selectionColor="#FF6B35" />
        <Text style={styles.cardText}>Upload any one: Cancelled Cheque (Recommended) / Passbook / Bank Statement. You can finish this later if needed.</Text>
        <View style={styles.chips}>
          {(["cheque", "passbook", "statement"] as const).map((type) => (
            <TouchableOpacity key={type} style={[styles.chip, documents.bankDocumentType === type && styles.chipActive]} onPress={() => setDocuments((current) => ({ ...current, bankDocumentType: type }))}>
              <Text style={[styles.chipText, documents.bankDocumentType === type && styles.chipTextActive]}>{type === "cheque" ? "Cheque" : type === "passbook" ? "Passbook" : "Statement"}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {documents.bankDocumentType === "passbook"
          ? renderUpload("bankPassbookUrl", "Bank Passbook First Page", "Accepted payout proof", true)
          : documents.bankDocumentType === "statement"
            ? renderUpload("bankStatementUrl", "Recent Bank Statement", "Accepted payout proof", true)
            : renderUpload("cancelledChequeUrl", "Cancelled Cheque", "Recommended payout proof", true)}
        <TouchableOpacity style={styles.termsRow} onPress={() => setTermsAccepted((current) => !current)}>
          <Ionicons name={termsAccepted ? "checkbox" : "square-outline"} size={22} color={termsAccepted ? "#FF6B35" : "#667085"} />
          <Text style={styles.termsText}>I agree to the delivery partner terms and conditions.</Text>
        </TouchableOpacity>
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Review checklist</Text>
          <Text style={styles.summaryItem}>{mandatoryDocsComplete ? "Mandatory documents look complete." : "Mandatory documents are still missing."}</Text>
          <Text style={styles.summaryItem}>{"Status flow: Pending -> Verified -> Active"}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return <View style={[styles.loading, { paddingTop: insets.top }]}><ActivityIndicator size="large" color="#FF6B35" /><Text style={styles.loadingText}>Loading profile...</Text></View>;
  }

  const currentStatus = statusTone[profile?.status || "INACTIVE"];

  if (isActiveDashboard) {
    return renderActiveProfile();
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 8}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: 2, paddingBottom: insets.bottom + 136 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroTag}><Ionicons name="bicycle-outline" size={16} color="#C2410C" /><Text style={styles.heroTagText}>Delivery Partner Registration</Text></View>
          <Text style={styles.heroTitle}>Complete your rider profile</Text>
          <Text style={styles.heroSubtitle}>Upload the mandatory KYC, vehicle, and payout documents so the admin team can verify your account.</Text>
        </View>

        <View style={[styles.statusCard, { backgroundColor: currentStatus.bg }]}>
          <Text style={[styles.statusLabel, { color: currentStatus.fg }]}>{currentStatus.label}</Text>
          <Text style={styles.statusText}>{mandatoryDocsComplete ? "Required documents look complete." : "Finish all mandatory sections before submitting."}</Text>
          {profile?.reviewComment ? <Text style={styles.statusText}>Admin note: {profile.reviewComment}</Text> : null}
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>Step {step + 1} of {STEPS.length}</Text>
            <Text style={styles.progressTextActive}>{STEPS[step]}</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} /></View>
          <View style={styles.dots}>{STEPS.map((label, index) => <TouchableOpacity key={label} style={[styles.dot, index === step && styles.dotActive]} onPress={() => setStep(index)}><Text style={[styles.dotText, index === step && styles.dotTextActive]}>{index + 1}</Text></TouchableOpacity>)}</View>
        </View>

        {renderStep()}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.footerRow}>
          {step > 0 ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep((current) => current - 1)}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.spacer} />
          )}
          <View style={styles.sideBySide}>
            <TouchableOpacity style={styles.saveDraft} onPress={handleSaveDraft}>
              <Text style={styles.saveDraftText}>Save Draft</Text>
            </TouchableOpacity>
            {step < STEPS.length - 1 ? (
              <TouchableOpacity style={styles.primaryButton} onPress={() => {
                const error = validateStep(step);
                if (error) {
                  Alert.alert("Missing details", error);
                  return;
                }
                setStep((current) => current + 1);
              }}>
                <Text style={styles.primaryButtonText}>Next Step</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.primaryButton, saving && styles.disabled]} onPress={handleSubmit} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryButtonText}>Submit for Review</Text>}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeAreaScreen: { flex: 1, backgroundColor: "#F8F5F0" },
  container: { flex: 1, backgroundColor: "#F8F5F0" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F5F0" },
  loadingText: { marginTop: 12, color: "#667085", fontSize: 15 },
  dashboardHero: { margin: 16, padding: 20, borderRadius: 28, backgroundColor: "#FFF1E8", borderWidth: 1, borderColor: "#FFD7C2" },
  dashboardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  dashboardAvatarWrap: { width: 76, height: 76, borderRadius: 24, overflow: "hidden" },
  dashboardAvatar: { width: "100%", height: "100%" },
  dashboardAvatarFallback: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFE5D9" },
  dashboardName: { fontSize: 23, fontWeight: "800", color: "#1D2939" },
  dashboardMeta: { marginTop: 4, fontSize: 13, fontWeight: "700", color: "#667085" },
  liveBadge: { alignSelf: "flex-start", marginTop: 10, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: "#fff" },
  liveBadgeActive: { backgroundColor: "#E8FFF3" },
  liveBadgeText: { fontSize: 12, fontWeight: "800", color: "#667085" },
  liveBadgeTextActive: { color: "#087443" },
  dashboardSubtitle: { marginTop: 16, fontSize: 14, lineHeight: 22, color: "#475467" },
  hero: { marginHorizontal: 16, marginTop: 8, marginBottom: 12, padding: 20, borderRadius: 26, backgroundColor: "#FFF4EE", borderWidth: 1, borderColor: "#FFD9C9" },
  heroTag: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "#fff" },
  heroTagText: { fontSize: 12, fontWeight: "700", color: "#C2410C" },
  heroTitle: { marginTop: 14, fontSize: 25, fontWeight: "800", color: "#1D2939" },
  heroSubtitle: { marginTop: 8, fontSize: 14, lineHeight: 21, color: "#475467" },
  statusCard: { marginHorizontal: 16, marginTop: 0, padding: 16, borderRadius: 20 },
  statusLabel: { fontSize: 15, fontWeight: "800" },
  statusText: { marginTop: 6, fontSize: 13, lineHeight: 19, color: "#475467" },
  progressCard: { marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 22, backgroundColor: "#fff", borderWidth: 1, borderColor: "#ECECEC" },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressText: { fontSize: 12, fontWeight: "700", color: "#667085" },
  progressTextActive: { fontSize: 13, fontWeight: "800", color: "#FF6B35" },
  progressTrack: { marginTop: 12, height: 8, borderRadius: 999, backgroundColor: "#F2F4F7", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#FF6B35" },
  dots: { marginTop: 14, flexDirection: "row", justifyContent: "space-between" },
  dot: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#F2F4F7" },
  dotActive: { backgroundColor: "#FF6B35" },
  dotText: { fontSize: 13, fontWeight: "800", color: "#667085" },
  dotTextActive: { color: "#fff" },

  card: { marginHorizontal: 16, marginTop: 12, padding: 18, borderRadius: 22, backgroundColor: "#fff", borderWidth: 1, borderColor: "#ECECEC" },
  cardTitle: { fontSize: 21, fontWeight: "800", color: "#1D2939" },
  cardText: { marginTop: 6, fontSize: 13, lineHeight: 20, color: "#667085" },
  infoRow: { marginTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F2F4F7" },
  infoLabel: { fontSize: 12, fontWeight: "700", color: "#667085", textTransform: "uppercase" },
  infoValue: { marginTop: 6, fontSize: 15, fontWeight: "700", color: "#101828" },
  docRow: { marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  docBadge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  docBadgeReady: { backgroundColor: "#ECFDF3" },
  docBadgePending: { backgroundColor: "#FEF3F2" },
  docBadgeText: { fontSize: 12, fontWeight: "800" },
  docBadgeTextReady: { color: "#027A48" },
  docBadgeTextPending: { color: "#B42318" },
  statsGrid: { marginHorizontal: 16, marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statTile: { width: "47%", padding: 18, borderRadius: 22, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#ECECEC" },
  statTileLabel: { fontSize: 12, fontWeight: "700", color: "#667085" },
  statTileValue: { marginTop: 12, fontSize: 20, fontWeight: "800", color: "#1D2939" },
  label: { marginTop: 16, marginBottom: 8, fontSize: 13, fontWeight: "700", color: "#344054" },
  input: { borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: "#101828", backgroundColor: "#fff" },
  area: { minHeight: 110 },
  stackedInput: { marginTop: 10 },
  readOnly: { borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 16, padding: 14, backgroundColor: "#F8FAFC" },
  readOnlyText: { fontSize: 15, fontWeight: "700", color: "#101828" },
  inlineActions: { marginTop: 18, flexDirection: "row", alignItems: "center", gap: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: "#F2F4F7" },
  chipActive: { backgroundColor: "#FFE8DE" },
  chipText: { fontSize: 13, fontWeight: "700", color: "#475467" },
  chipTextActive: { color: "#C2410C" },
  availability: { marginTop: 16, padding: 16, borderRadius: 18, backgroundColor: "#FFF7ED", flexDirection: "row", alignItems: "center", gap: 14 },
  availabilityTitle: { fontSize: 14, fontWeight: "700", color: "#1D2939" },
  availabilityText: { marginTop: 4, fontSize: 12, color: "#667085" },
  badge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "#fff" },
  badgeActive: { backgroundColor: "#FF6B35" },
  badgeText: { fontSize: 12, fontWeight: "800", color: "#475467" },
  badgeTextActive: { color: "#fff" },
  uploadCard: { marginTop: 14, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: "#ECECEC", backgroundColor: "#FCFCFD" },
  uploadHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  uploadTitle: { fontSize: 14, fontWeight: "800", color: "#1D2939" },
  uploadSubtitle: { marginTop: 4, fontSize: 12, lineHeight: 18, color: "#667085" },
  uploadBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#FFF1E8" },
  uploadBadgeText: { fontSize: 10, lineHeight: 12, fontWeight: "800", color: "#C2410C", textTransform: "uppercase" },
  placeholder: { marginTop: 12, height: 72, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: "#D0D5DD", alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  placeholderText: { marginTop: 6, fontSize: 12, color: "#98A2B3" },
  fileBadge: { marginTop: 12, padding: 14, borderRadius: 14, backgroundColor: "#ECFDF3", borderWidth: 1, borderColor: "#ABEFC6", flexDirection: "row", alignItems: "center", gap: 8 },
  fileBadgeText: { fontSize: 13, fontWeight: "700", color: "#027A48" },
  preview: { width: "100%", height: 120, borderRadius: 14, marginTop: 12, backgroundColor: "#F2F4F7" },
  uploadButton: { marginTop: 12, alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: "#FF6B35", minWidth: 110, alignItems: "center" },
  uploadButtonText: { fontSize: 13, fontWeight: "800", color: "#fff" },
  termsRow: { marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: "#FFF7ED", flexDirection: "row", alignItems: "center", gap: 10 },
  termsText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "700", color: "#344054" },
  addressHelperText: { marginTop: 12, fontSize: 12, lineHeight: 18, color: "#667085" },
  summary: { marginTop: 16, padding: 16, borderRadius: 18, backgroundColor: "#F8FAFC" },
  summaryTitle: { fontSize: 14, fontWeight: "800", color: "#1D2939" },
  summaryItem: { marginTop: 6, fontSize: 13, color: "#667085" },
  shortcutCard: { marginTop: 12, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  shortcutIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF4EE" },
  shortcutTitle: { fontSize: 14, fontWeight: "800", color: "#1D2939" },
  shortcutSubtitle: { marginTop: 4, fontSize: 12, lineHeight: 18, color: "#667085" },
  logoutButton: { marginTop: 18, borderRadius: 18, paddingVertical: 15, alignItems: "center", backgroundColor: "#101828" },
  logoutButtonText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: "rgba(248,245,240,0.97)", borderTopWidth: 1, borderTopColor: "#EAECF0" },
  saveDraft: { alignSelf: "center", paddingHorizontal: 14, paddingVertical: 8 },
  saveDraftText: { fontSize: 13, fontWeight: "700", color: "#667085" },
  footerRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 12 },
  secondaryButton: { paddingHorizontal: 20, paddingVertical: 15, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E4E7EC" },
  secondaryButtonText: { fontSize: 14, fontWeight: "800", color: "#344054" },
  spacer: { width: 90 },
  sideBySide: { flexDirection: 'row', flex: 1, justifyContent: 'space-between' },
  primaryButton: { flex: 1, minHeight: 54, borderRadius: 18, backgroundColor: "#FF6B35", alignItems: "center", justifyContent: "center" },
  primaryButtonText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  disabled: { opacity: 0.75 }
});
