import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { buildLegalUrl } from "../constants/legal";
import { getDeliveryProfile, updateDeliveryProfile, type DeliveryProfile } from "../api/profile.api";
import { deleteAccount } from "../api/auth.api";
import { getDeliveryStats, getTodaysEarnings, type DeliveryStats } from "../api/delivery.api";
import SupportModal from "../components/SupportModal";
import {
  getNotificationPermissionLabel,
  openNotificationSettings,
  registerForPushNotifications,
  unregisterPushNotifications
} from "../services/notifications";

const DRAFT_KEY = "delivery_registration_draft_v2";
const TERMS_URL = buildLegalUrl("delivery-policy");
const DELETE_ACCOUNT_URL = buildLegalUrl("delete-account");
const STEPS = ["Basic", "Vehicle", "Documents", "Bank"] as const;
const VEHICLE_TYPES: DeliveryProfile["vehicleType"][] = ["Bike", "Scooter", "EV", "Bicycle", "Car"];
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"
]);

const VEHICLE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Bike: "bicycle-outline",
  Scooter: "bicycle-outline",
  Motorcycle: "bicycle-outline",
  EV: "flash-outline",
  Bicycle: "bicycle-outline",
  Cycle: "bicycle-outline",
  Car: "car-outline"
};

const getUploadMimeType = (filename: string, mimeType?: string | null) => {
  const normalizedMimeType = mimeType === "image/jpg" ? "image/jpeg" : mimeType?.toLowerCase();
  if (normalizedMimeType && ALLOWED_UPLOAD_MIME_TYPES.has(normalizedMimeType)) return normalizedMimeType;
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
  if (/\.[A-Za-z0-9]+$/.test(filename)) return filename;
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
  if (trimmedName && /\.[A-Za-z0-9]+$/.test(trimmedName)) return trimmedName.replace(/[^A-Za-z0-9._-]/g, "_");
  return ensureUploadFileName(safeBase, mimeType);
};

type UploadField =
  | "profilePhotoUrl" | "aadhaarFrontUrl" | "aadhaarBackUrl" | "panFrontUrl"
  | "selfiePhotoUrl" | "drivingLicenseFrontUrl" | "drivingLicenseBackUrl"
  | "vehicleRcFrontUrl" | "vehicleRcBackUrl" | "aadhaarUrl" | "panUrl"
  | "drivingLicenseUrl" | "vehicleRcUrl" | "insuranceUrl"
  | "cancelledChequeUrl" | "bankPassbookUrl" | "bankStatementUrl";

type Docs = NonNullable<DeliveryProfile["documents"]>;
type ReuploadKey = keyof NonNullable<Docs["reuploadFlags"]>;

type AddressForm = {
  flatNo: string;
  apartment: string;
  colony: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
};

type UploadAsset = { uri: string; name: string; mimeType?: string | null };
type UploadApiResponse = { success?: boolean; message?: string; data?: { url?: string } };
type ActiveDocumentItem = { field: UploadField; title: string; subtitle: string; required: boolean; url?: string };

const DOCUMENT_UPLOAD_FIELDS = new Set<UploadField>([
  "aadhaarFrontUrl", "aadhaarBackUrl", "panFrontUrl", "selfiePhotoUrl",
  "drivingLicenseFrontUrl", "drivingLicenseBackUrl", "vehicleRcFrontUrl",
  "vehicleRcBackUrl", "aadhaarUrl", "panUrl", "drivingLicenseUrl",
  "vehicleRcUrl", "insuranceUrl", "cancelledChequeUrl", "bankPassbookUrl", "bankStatementUrl"
]);

const FRONT_FIELD_ALIASES: Partial<Record<UploadField, keyof Docs>> = {
  aadhaarUrl: "aadhaarFrontUrl", drivingLicenseUrl: "drivingLicenseFrontUrl", vehicleRcUrl: "vehicleRcFrontUrl"
};

const REUPLOAD_FIELD_KEYS: Partial<Record<UploadField, ReuploadKey>> = {
  profilePhotoUrl: "profilePhotoUrl", aadhaarUrl: "aadhaarFrontUrl", aadhaarFrontUrl: "aadhaarFrontUrl",
  aadhaarBackUrl: "aadhaarBackUrl", panUrl: "panFrontUrl", panFrontUrl: "panFrontUrl",
  selfiePhotoUrl: "selfiePhotoUrl", drivingLicenseUrl: "drivingLicenseFrontUrl",
  drivingLicenseFrontUrl: "drivingLicenseFrontUrl", drivingLicenseBackUrl: "drivingLicenseBackUrl",
  vehicleRcUrl: "vehicleRcFrontUrl", vehicleRcFrontUrl: "vehicleRcFrontUrl",
  vehicleRcBackUrl: "vehicleRcBackUrl", insuranceUrl: "insuranceUrl",
  cancelledChequeUrl: "bankProofUrl", bankPassbookUrl: "bankProofUrl", bankStatementUrl: "bankProofUrl"
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
  // Kept for future bank proof uploads; current registration does not ask for bank proof type.
  next.bankDocumentType = next.bankDocumentType || "";
  next.reuploadFlags = next.reuploadFlags || {};
  next.reuploadNotes = next.reuploadNotes || "";
  return next;
};

const emptyDocs = (): Docs => ({
  aadhaarNumber: "", aadhaarFrontUrl: "", aadhaarBackUrl: "", aadhaarUrl: "",
  panNumber: "", panFrontUrl: "", panUrl: "", selfiePhotoUrl: "",
  drivingLicenseFrontUrl: "", drivingLicenseBackUrl: "", drivingLicenseUrl: "",
  vehicleRcFrontUrl: "", vehicleRcBackUrl: "", vehicleRcUrl: "", insuranceUrl: "",
  // Kept for future bank proof uploads; current registration does not ask for bank proof type.
  bankDocumentType: "", bankAccountHolderName: "", cancelledChequeUrl: "",
  bankPassbookUrl: "", bankStatementUrl: "", bankAccountNumber: "", bankIfsc: "",
  submittedAt: "", isComplete: false, reuploadFlags: {}, reuploadNotes: ""
});

const emptyAddress = (): AddressForm => ({
  flatNo: "", apartment: "", colony: "", area: "", city: "", state: "", pincode: ""
});

const ADDRESS_LABELS: { key: keyof AddressForm; label: string }[] = [
  { key: "flatNo", label: "Flat No" }, { key: "apartment", label: "Apartment" },
  { key: "colony", label: "Colony" }, { key: "area", label: "Area" },
  { key: "city", label: "City" }, { key: "state", label: "State" }, { key: "pincode", label: "Pincode" }
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
      if (match?.[1]) next[key] = match[1].trim();
    }
    return next;
  }
  const parts = address.split(",").map((item) => item.trim()).filter(Boolean);
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
const normalizeVehicleType = (value?: DeliveryProfile["vehicleType"] | string | null): DeliveryProfile["vehicleType"] => {
  if (value === "Motorcycle") return "EV";
  if (value === "Cycle") return "Bicycle";
  return (value || "Bike") as DeliveryProfile["vehicleType"];
};

const vehicleTypeRequiresMotorDocuments = (value?: DeliveryProfile["vehicleType"] | string | null) =>
  !["cycle", "bicycle", "ev"].includes((value || "").trim().toLowerCase());

const uploadAssetToServer = async (asset: UploadAsset, field: UploadField) => {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error(GENERIC_UPLOAD_ERROR);
  const rawFileName = asset.name || asset.uri.split("/").pop() || null;
  const mimeType = getUploadMimeType(rawFileName || field, asset.mimeType);
  const fileName = createUploadFileName(field, mimeType, rawFileName);
  const formData = new FormData();
  // @ts-ignore
  formData.append("image", { uri: asset.uri, type: mimeType, name: fileName });
  let lastErrorMessage = GENERIC_UPLOAD_ERROR;
  for (const baseUrl of API_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl}/upload/image`, {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        body: formData
      });
      const responseData = await response.json() as UploadApiResponse;
      if (!response.ok || !responseData?.success || !responseData?.data?.url) {
        lastErrorMessage = GENERIC_UPLOAD_ERROR;
        continue;
      }
      return responseData.data.url;
    } catch {
      lastErrorMessage = GENERIC_UPLOAD_ERROR;
    }
  }
  throw new Error(lastErrorMessage);
};

const statusTone: Record<DeliveryProfile["status"], { bg: string; fg: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PENDING: { bg: "#FFF4E8", fg: "#C2410C", label: "Pending Review", icon: "time-outline" },
  VERIFIED: { bg: "#ECFDF3", fg: "#027A48", label: "Verified", icon: "checkmark-circle-outline" },
  ACTIVE: { bg: "#E8FFF3", fg: "#087443", label: "Active", icon: "checkmark-circle-outline" },
  REJECTED: { bg: "#FEF3F2", fg: "#B42318", label: "Rejected", icon: "close-circle-outline" },
  SUSPENDED: { bg: "#FDECEC", fg: "#B42318", label: "Suspended", icon: "shield-outline" },
  INACTIVE: { bg: "#F2F4F7", fg: "#475467", label: "Incomplete", icon: "ellipse-outline" }
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
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [stepAnim] = useState(() => new Animated.Value(0));

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
  const [bankDetailsSkipped, setBankDetailsSkipped] = useState(false);
  const [documents, setDocuments] = useState<Docs>(emptyDocs());
  const formattedAddress = useMemo(() => buildAddressString(addressForm), [addressForm]);
  const requiresMotorDocuments = vehicleTypeRequiresMotorDocuments(vehicleType);

  const updateAddressField = (key: keyof AddressForm, value: string) => {
    setAddressForm((current) => ({
      ...current,
      [key]: key === "pincode" ? value.replace(/\D/g, "").slice(0, 6) : value
    }));
  };

  useEffect(() => {
    Animated.spring(stepAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 9 }).start();
  }, [step]);

  const syncProfile = (data: DeliveryProfile) => {
    setProfile(data);
    setName(data.name || "");
    setEmail(data.email || "");
    setDateOfBirth(data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : "");
    setAddressForm(parseAddressString(data.address || ""));
    setEmergencyContactName(data.emergencyContactName || "");
    setEmergencyContactPhone(data.emergencyContactPhone || "");
    setVehicleType(normalizeVehicleType(data.vehicleType));
    setVehicleNumber(data.vehicleNumber || "");
    setLicenseNumber(data.licenseNumber || "");
    setProfilePhotoUrl(data.profilePhotoUrl || "");
    setIsAvailable(typeof data.isAvailable === "boolean" ? data.isAvailable : true);
    setTermsAccepted(Boolean(data.termsAcceptedAt));
    setBankDetailsSkipped(false);
    setDocuments(normalizeDocuments(data.documents));
  };

  const loadDashboardStats = async () => {
    try {
      const [statsResponse, earningsResponse] = await Promise.all([
        getDeliveryStats(), getTodaysEarnings()
      ]);
      if (statsResponse.success && statsResponse.data) setStats(statsResponse.data);
      if (earningsResponse.success && earningsResponse.data) setTodayEarnings(earningsResponse.data.earnings);
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
          if (response.data.status === "ACTIVE") loadDashboardStats().catch(() => {});
          const draft = await AsyncStorage.getItem(DRAFT_KEY);
          if ((forceComplete || !response.data.isProfileComplete) && draft) {
            const parsed = JSON.parse(draft);
            setName(parsed.name || response.data.name || "");
            setEmail(parsed.email || response.data.email || "");
            setDateOfBirth(parsed.dateOfBirth || (response.data.dateOfBirth ? response.data.dateOfBirth.slice(0, 10) : ""));
            setAddressForm(parsed.addressForm || parseAddressString(parsed.address || response.data.address || ""));
            setEmergencyContactName(parsed.emergencyContactName || response.data.emergencyContactName || "");
            setEmergencyContactPhone(parsed.emergencyContactPhone || response.data.emergencyContactPhone || "");
            setVehicleType(normalizeVehicleType(parsed.vehicleType || response.data.vehicleType));
            setVehicleNumber(parsed.vehicleNumber || response.data.vehicleNumber || "");
            setLicenseNumber(parsed.licenseNumber || response.data.licenseNumber || "");
            setProfilePhotoUrl(parsed.profilePhotoUrl || response.data.profilePhotoUrl || "");
            setIsAvailable(typeof parsed.isAvailable === "boolean" ? parsed.isAvailable : response.data.isAvailable);
            setTermsAccepted(typeof parsed.termsAccepted === "boolean" ? parsed.termsAccepted : Boolean(response.data.termsAcceptedAt));
            setBankDetailsSkipped(Boolean(parsed.bankDetailsSkipped));
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
    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({
      name, email, dateOfBirth, address: formattedAddress, addressForm,
      emergencyContactName, emergencyContactPhone, vehicleType, vehicleNumber,
      licenseNumber, profilePhotoUrl, isAvailable, termsAccepted, bankDetailsSkipped, documents, step
    })).catch(() => {});
  }, [name, email, dateOfBirth, formattedAddress, addressForm, emergencyContactName, emergencyContactPhone, vehicleType, vehicleNumber, licenseNumber, profilePhotoUrl, isAvailable, termsAccepted, bankDetailsSkipped, documents, step]);

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
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < parsed.getDate())) age -= 1;
    return age >= 18;
  };

  const employeeId = profile?._id ? `DLV-${profile._id.slice(-6).toUpperCase()}` : "Assigned after verification";
  const verificationStatusLabel = profile?.status === "ACTIVE" ? "Approved" : statusTone[profile?.status || "INACTIVE"].label;

  const activeDocumentItems: ActiveDocumentItem[] = [
    { field: "aadhaarUrl", title: "Aadhaar front", subtitle: "Government ID proof", required: true, url: documents.aadhaarFrontUrl || documents.aadhaarUrl },
    { field: "selfiePhotoUrl", title: "Selfie verification", subtitle: "Live selfie for verification", required: true, url: documents.selfiePhotoUrl },
    ...(requiresMotorDocuments
      ? [
          { field: "drivingLicenseUrl" as UploadField, title: "Driving license front", subtitle: "Required for Bike, Scooter, and Car", required: true, url: documents.drivingLicenseFrontUrl || documents.drivingLicenseUrl },
          { field: "drivingLicenseBackUrl" as UploadField, title: "Driving license back", subtitle: "Required for Bike, Scooter, and Car", required: true, url: documents.drivingLicenseBackUrl }
        ]
      : [])
  ];

  const handleLogout = async () => {
    await unregisterPushNotifications().catch(() => {});
    await AsyncStorage.multiRemove(["token", "refreshToken", "user"]);
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  const handleDeleteAccount = () => {
    Alert.alert("Delete account", "This will deactivate your delivery login and anonymize profile, document, and address details where possible. Some payout, tax, or delivery records may be retained where required.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await deleteAccount();
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        } catch (error: any) {
          Alert.alert("Error", error.response?.data?.message || error.message || "Failed to delete account");
        }
      }}
    ]);
  };

  const handleNotificationPreferences = async () => {
    await registerForPushNotifications().catch(() => {});
    const permissionLabel = await getNotificationPermissionLabel();
    Alert.alert("Notifications", permissionLabel, [
      { text: "Cancel", style: "cancel" },
      { text: "Open Settings", onPress: openNotificationSettings }
    ]);
  };

  const handleAvailabilityToggle = async () => {
    const nextValue = !isAvailable;
    setIsAvailable(nextValue);
    setAvailabilitySaving(true);
    try {
      const response = await updateDeliveryProfile({ isAvailable: nextValue });
      if (!response.success || !response.data) throw new Error(response.message || "Failed to update availability");
      syncProfile(response.data);
    } catch (error: any) {
      setIsAvailable(!nextValue);
      Alert.alert("Error", error.message || "Failed to update availability");
    } finally {
      setAvailabilitySaving(false);
    }
  };

  const handleSaveBankDetails = async () => {
    if (!documents.bankAccountHolderName?.trim()) { Alert.alert("Missing details", "Account holder name is required."); return; }
    if (!documents.bankAccountNumber?.trim()) { Alert.alert("Missing details", "Bank account number is required."); return; }
    if (!documents.bankIfsc?.trim()) { Alert.alert("Missing details", "IFSC code is required."); return; }
    if (documents.bankAccountNumber?.trim() && !/^[0-9]+$/.test(documents.bankAccountNumber.trim())) { Alert.alert("Invalid details", "Bank account number must be numeric."); return; }
    setBankSaving(true);
    try {
      const response = await updateDeliveryProfile({
        documents: { ...documents, bankAccountHolderName: documents.bankAccountHolderName?.trim(), bankAccountNumber: documents.bankAccountNumber?.trim() || "", bankIfsc: documents.bankIfsc?.trim().toUpperCase() }
      });
      if (!response.success || !response.data) throw new Error(response.message || "Failed to update payout details");
      syncProfile(response.data);
      setEditingBank(false);
      Alert.alert("Saved", "Payout details updated successfully.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update payout details");
    } finally {
      setBankSaving(false);
    }
  };

  const mandatoryDocsComplete = useMemo(() => {
    const normalized = normalizeDocuments(documents);
    return Boolean(
      normalized.aadhaarFrontUrl && normalized.aadhaarNumber &&
      normalized.selfiePhotoUrl &&
      (!requiresMotorDocuments || (
        normalized.drivingLicenseFrontUrl && normalized.drivingLicenseBackUrl
      ))
    );
  }, [documents, requiresMotorDocuments]);

  const validateStep = (index: number) => {
    if (index === 0) {
      if (name.trim().length < 3) return "Please enter your full name.";
      if (!isAdultDateOfBirth(dateOfBirth)) return "Enter date of birth as YYYY-MM-DD. Delivery partners must be at least 18.";
      if (emergencyContactName.trim().length < 3) return "Emergency contact name is required.";
      if (!/^[0-9]{10}$/.test(emergencyContactPhone.trim())) return "Emergency contact phone must be 10 digits.";
    }
    if (index === 1) {
      if (requiresMotorDocuments) {
        if (!vehicleNumber.trim()) return "Vehicle number is required.";
        if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,12}$/i.test(vehicleNumber.trim())) return "Vehicle number format looks invalid.";
        if (!licenseNumber.trim()) return "Driving license number is required.";
        if (!/^[A-Z]{2}[0-9]{2}[0-9A-Z]{8,14}$/i.test(licenseNumber.trim())) return "Driving license number format looks invalid.";
      }
    }
    if (index === 2) {
      const aadhaarNumber = documents.aadhaarNumber?.trim() || "";
      if (!/^[0-9]{12}$/.test(aadhaarNumber)) return "Aadhaar number must be 12 digits.";
      const normalized = normalizeDocuments(documents);
      if (!normalized.aadhaarFrontUrl) return "Aadhaar front is mandatory.";
      if (!normalized.selfiePhotoUrl) return "Selfie/photo verification is required.";
      if (requiresMotorDocuments && (!normalized.drivingLicenseFrontUrl || !normalized.drivingLicenseBackUrl)) return "Driving license front and back are mandatory for this vehicle type.";
    }
    if (index === 3) {
      const hasAnyBankInput = !bankDetailsSkipped && Boolean(documents.bankAccountHolderName?.trim() || documents.bankAccountNumber?.trim() || documents.bankIfsc?.trim());
      if (hasAnyBankInput) {
        if (!documents.bankAccountHolderName?.trim()) return "Account holder name is required if you add bank details.";
        if (!documents.bankAccountNumber?.trim()) return "Bank account number is required if you add bank details.";
        if (!/^[0-9]+$/.test(documents.bankAccountNumber.trim())) return "Bank account number must be numeric.";
        if (!documents.bankIfsc?.trim()) return "IFSC code is required if you add bank details.";
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(documents.bankIfsc.trim().toUpperCase())) return "IFSC code format is invalid.";
      }
      if (!termsAccepted) return "Please accept the delivery partner terms and conditions.";
    }
    return null;
  };

  const pickDocument = async (field: UploadField): Promise<UploadAsset | null> => {
    const result = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets?.[0]?.uri) return null;
    const asset = result.assets[0];
    return { uri: asset.uri, name: asset.name || `document-${Date.now()}`, mimeType: asset.mimeType };
  };

  const pickImage = async (field?: UploadField): Promise<UploadAsset | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") { Alert.alert("Permission needed", "Please allow gallery access to upload images."); return null; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: field === "profilePhotoUrl", aspect: field === "profilePhotoUrl" ? [1, 1] : undefined, quality: 0.6 });
    if (result.canceled || !result.assets[0]?.uri) return null;
    const asset = result.assets[0];
    return { uri: asset.uri, name: asset.fileName || asset.uri.split("/").pop() || `image-${Date.now()}.jpg`, mimeType: asset.mimeType };
  };

  const pickLiveSelfie = async (): Promise<UploadAsset | null> => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") { Alert.alert("Camera permission needed", GENERIC_UPLOAD_ERROR); return null; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, cameraType: ImagePicker.CameraType.front, allowsEditing: false, quality: 0.8 });
    if (result.canceled || !result.assets[0]?.uri) return null;
    const asset = result.assets[0];
    return { uri: asset.uri, name: asset.fileName || asset.uri.split("/").pop() || `selfie-${Date.now()}.jpg`, mimeType: asset.mimeType };
  };

  const uploadFile = async (field: UploadField, options?: { persist?: boolean }) => {
    if (uploadingFields.includes(field)) return;
    try {
      const shouldUseDocumentPicker = DOCUMENT_UPLOAD_FIELDS.has(field);
      const asset = field === "selfiePhotoUrl" ? await pickLiveSelfie() : shouldUseDocumentPicker ? await pickDocument(field) : await pickImage(field);
      if (!asset?.uri) return;
      setUploadingFields((current) => (current.includes(field) ? current : [...current, field]));
      const url = await uploadAssetToServer(asset, field);
      const reuploadKey = REUPLOAD_FIELD_KEYS[field];
      const nextDocuments = normalizeDocuments(documents);
      let nextProfilePhotoUrl = profilePhotoUrl;
      if (field === "profilePhotoUrl") {
        nextProfilePhotoUrl = url;
        if (reuploadKey) nextDocuments.reuploadFlags = { ...(nextDocuments.reuploadFlags || {}), [reuploadKey]: false };
      } else {
        nextDocuments[field as keyof Docs] = url as never;
        const aliasField = FRONT_FIELD_ALIASES[field];
        if (aliasField) nextDocuments[aliasField] = url as never;
        if (reuploadKey) nextDocuments.reuploadFlags = { ...(nextDocuments.reuploadFlags || {}), [reuploadKey]: false };
      }
      const normalizedNextDocuments = normalizeDocuments(nextDocuments);
      if (options?.persist) {
        const response = await updateDeliveryProfile(field === "profilePhotoUrl" ? { profilePhotoUrl: nextProfilePhotoUrl, documents: normalizedNextDocuments } : { documents: normalizedNextDocuments });
        if (!response.success || !response.data) throw new Error(response.message || "Failed to save document");
        syncProfile(response.data);
        Alert.alert("Uploaded", "Document updated successfully.");
      } else {
        setProfilePhotoUrl(nextProfilePhotoUrl);
        setDocuments(normalizedNextDocuments);
      }
    } catch (error: any) {
      Alert.alert("Something went wrong", error.message || GENERIC_UPLOAD_ERROR);
    } finally {
      setUploadingFields((current) => current.filter((item) => item !== field));
    }
  };

  const handleSaveDraft = async () => {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ name, email, dateOfBirth, address: formattedAddress, addressForm, emergencyContactName, emergencyContactPhone, vehicleType, vehicleNumber, licenseNumber, profilePhotoUrl, isAvailable, termsAccepted, bankDetailsSkipped, documents, step }));
    Alert.alert("Saved", "Your draft is saved on this device.");
  };

  const handleSubmit = async () => {
    for (let i = 0; i < STEPS.length; i += 1) {
      const error = validateStep(i);
      if (error) { setStep(i); Alert.alert("Missing details", error); return; }
    }
    try {
      setSaving(true);
      const normalizedDocuments = normalizeDocuments(documents);
      const submittedAt = new Date().toISOString();
      const bankAccountHolderName = bankDetailsSkipped ? "" : documents.bankAccountHolderName?.trim();
      const bankAccountNumber = bankDetailsSkipped ? "" : documents.bankAccountNumber?.trim() || "";
      const bankIfsc = bankDetailsSkipped ? "" : documents.bankIfsc?.trim().toUpperCase();
      const response = await updateDeliveryProfile({
        name: name.trim(), email: email.trim() || undefined, dateOfBirth: dateOfBirth.trim(),
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(), vehicleType,
        vehicleNumber: requiresMotorDocuments ? vehicleNumber.trim().toUpperCase() : "",
        licenseNumber: requiresMotorDocuments ? licenseNumber.trim().toUpperCase() : "",
        profilePhotoUrl, isAvailable, termsAccepted, status: "PENDING",
        documents: {
          ...normalizedDocuments, aadhaarNumber: normalizedDocuments.aadhaarNumber?.trim(),
          aadhaarFrontUrl: normalizedDocuments.aadhaarFrontUrl,
          aadhaarBackUrl: "",
          panNumber: "",
          panFrontUrl: "",
          panUrl: "",
          selfiePhotoUrl: normalizedDocuments.selfiePhotoUrl,
          drivingLicenseFrontUrl: normalizedDocuments.drivingLicenseFrontUrl,
          drivingLicenseBackUrl: normalizedDocuments.drivingLicenseBackUrl,
          vehicleRcFrontUrl: "",
          vehicleRcBackUrl: "",
          vehicleRcUrl: "",
          insuranceUrl: "",
          bankDocumentType: "",
          cancelledChequeUrl: "",
          bankPassbookUrl: "",
          bankStatementUrl: "",
          bankAccountHolderName,
          bankAccountNumber,
          bankIfsc,
          submittedAt,
          isComplete: true
        }
      });
      if (!response.success || !response.data) { Alert.alert("Error", response.message || "Failed to save profile"); return; }
      await AsyncStorage.removeItem(DRAFT_KEY);
      navigation.reset({ index: 0, routes: [{ name: "ReviewStatus", params: { submitted: true } }] });
      Alert.alert("Submitted", "Your delivery profile is now pending admin verification.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // ─── RENDER HELPERS ─────────────────────────────────────────

  const renderInfoRow = (label: string, value: string) => (
    <View style={s.infoRow} key={label}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );

  const renderShortcut = (icon: keyof typeof Ionicons.glyphMap, title: string, subtitle: string, onPress: () => void) => (
    <TouchableOpacity style={s.shortcutCard} onPress={onPress} key={title} activeOpacity={0.7}>
      <View style={s.shortcutIcon}><Ionicons name={icon} size={20} color="#C2410C" /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.shortcutTitle}>{title}</Text>
        <Text style={s.shortcutSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#D0D5DD" />
    </TouchableOpacity>
  );

  // ─── ACTIVE DASHBOARD ────────────────────────────────────────

  const renderActiveProfile = () => {
    const tone = statusTone[profile?.status || "ACTIVE"];
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 36 }} showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View style={s.profileHeader}>
            <View style={s.avatarWrap}>
              {profilePhotoUrl ? (
                <Image source={{ uri: profilePhotoUrl }} style={s.avatar} />
              ) : (
                <View style={s.avatarFallback}><Ionicons name="person" size={32} color="#C2410C" /></View>
              )}
              <View style={s.avatarBadge}><Ionicons name={isAvailable ? "flash" : "flash-off"} size={10} color="#fff" /></View>
            </View>
            <Text style={s.profileName}>{name || profile?.name || "Delivery Partner"}</Text>
            <Text style={s.profileMeta}>{employeeId}</Text>
            <View style={[s.statusChip, { backgroundColor: tone.bg }]}>
              <Ionicons name={tone.icon} size={14} color={tone.fg} />
              <Text style={[s.statusChipText, { color: tone.fg }]}>{tone.label}</Text>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={s.statsGrid}>
            <View style={s.statCard}><Text style={s.statVal}>{formatCurrency(todayEarnings)}</Text><Text style={s.statLbl}>Today</Text></View>
            <View style={s.statCard}><Text style={s.statVal}>{formatCurrency(stats?.totalEarnings || profile?.totalEarnings)}</Text><Text style={s.statLbl}>Total earnings</Text></View>
            <View style={s.statCard}><Text style={s.statVal}>{stats?.totalDeliveries || profile?.totalDeliveries || 0}</Text><Text style={s.statLbl}>Deliveries</Text></View>
            <View style={s.statCard}><Text style={s.statVal}>{(profile?.rating || 0).toFixed(1)}</Text><Text style={s.statLbl}>Rating</Text></View>
            <View style={s.statCard}><Text style={s.statVal}>{formatCurrency(stats?.cashBalance || profile?.cashBalance || 0)}</Text><Text style={s.statLbl}>COD cash held</Text></View>
            <View style={s.statCard}><Text style={s.statVal}>{formatCurrency(stats?.pendingDepositAmount || profile?.pendingDepositAmount || 0)}</Text><Text style={s.statLbl}>Pending deposit</Text></View>
          </View>

          {/* Availability */}
          <View style={s.section}>
            <TouchableOpacity style={s.availCard} onPress={handleAvailabilityToggle} disabled={availabilitySaving} activeOpacity={0.8}>
              <View style={[s.availDot, isAvailable && s.availDotOn]} />
              <View style={{ flex: 1 }}>
                <Text style={s.availTitle}>{isAvailable ? "Online" : "Offline"}</Text>
                <Text style={s.availSub}>Tap to toggle availability for new jobs</Text>
              </View>
              {availabilitySaving ? <ActivityIndicator size="small" color="#FF6B35" /> : <View style={[s.availSwitch, isAvailable && s.availSwitchOn]}><View style={[s.availSwitchKnob, isAvailable && s.availSwitchKnobOn]} /></View>}
            </TouchableOpacity>
          </View>

          {/* Documents */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Documents & Verification</Text>
            <Text style={s.sectionSub}>Tap any document to view or re-upload.</Text>
            {activeDocumentItems.map((item) => renderActiveDocumentRow(item))}
            <View style={s.divider} />
            {renderInfoRow("Verification status", verificationStatusLabel)}
            {documents.reuploadNotes ? <View style={s.alertBox}><Ionicons name="alert-circle" size={16} color="#B42318" /><Text style={s.alertBoxText}>{documents.reuploadNotes}</Text></View> : null}
          </View>

          {/* Bank Details */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Bank Account Details</Text>
            {editingBank ? (
              <>
                <Text style={s.inputLabel}>Account Holder Name</Text>
                <TextInput style={s.input} value={documents.bankAccountHolderName || ""} onChangeText={(v) => setDocuments((c) => ({ ...c, bankAccountHolderName: v }))} placeholder="Enter account holder name" placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
                <Text style={s.inputLabel}>Account Number</Text>
                <TextInput style={s.input} value={documents.bankAccountNumber || ""} onChangeText={(v) => setDocuments((c) => ({ ...c, bankAccountNumber: v.replace(/\D/g, "") }))} placeholder="Enter account number" placeholderTextColor="#98A2B3" keyboardType="number-pad" selectionColor="#FF6B35" />
                <Text style={s.inputLabel}>IFSC Code</Text>
                <TextInput style={s.input} value={documents.bankIfsc || ""} onChangeText={(v) => setDocuments((c) => ({ ...c, bankIfsc: v.toUpperCase() }))} placeholder="Enter IFSC code" placeholderTextColor="#98A2B3" autoCapitalize="characters" selectionColor="#FF6B35" />
                <View style={s.btnRow}>
                  <TouchableOpacity style={s.btnOutline} onPress={() => setEditingBank(false)}><Text style={s.btnOutlineText}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.btnPrimary, bankSaving && s.btnDisabled]} onPress={handleSaveBankDetails} disabled={bankSaving}>
                    {bankSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryText}>Save</Text>}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {renderInfoRow("Account holder", safeValue(documents.bankAccountHolderName))}
                {renderInfoRow("Account number", safeValue(documents.bankAccountNumber ? `••••${documents.bankAccountNumber.slice(-4)}` : ""))}
                {renderInfoRow("IFSC", safeValue(documents.bankIfsc))}
                <TouchableOpacity style={[s.btnPrimary, { marginTop: 14 }]} onPress={() => setEditingBank(true)}><Text style={s.btnPrimaryText}>Edit Payout Details</Text></TouchableOpacity>
              </>
            )}
          </View>

          {/* Work Stats */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Performance</Text>
            {renderInfoRow("Total deliveries", String(stats?.totalDeliveries || profile?.totalDeliveries || 0))}
            {renderInfoRow("Rating", `${(profile?.rating || 0).toFixed(1)} / 5 (${profile?.ratingCount || 0} ratings)`)}
            {renderInfoRow("Acceptance rate", "Coming soon")}
          </View>

          {/* Support */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Support & Help</Text>
            {renderShortcut("help-circle-outline", "Help center", "FAQs, chat, and support tickets", () => setSupportModalVisible(true))}
            {renderShortcut("flag-outline", "Report an issue", "Tell us if something is broken", () => setSupportModalVisible(true))}
            {renderShortcut("chatbubble-ellipses-outline", "Chat with admin", "Send a message to the Vyaha team", () => setSupportModalVisible(true))}
          </View>

          {/* Settings */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Settings</Text>
            {renderShortcut("notifications-outline", "Notifications", "Manage job and payout alerts", handleNotificationPreferences)}
            {renderShortcut("document-text-outline", "Account deletion policy", "Read how account deletion works", () => Linking.openURL(DELETE_ACCOUNT_URL))}
          </View>

          {/* Logout / Delete */}
          <View style={[s.section, { borderBottomWidth: 0 }]}>
            <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}><Text style={s.logoutBtnText}>Logout</Text></TouchableOpacity>
            <TouchableOpacity style={s.deleteBtn} onPress={handleDeleteAccount}><Text style={s.deleteBtnText}>Delete Account</Text></TouchableOpacity>
          </View>
        </ScrollView>
        <SupportModal visible={supportModalVisible} onClose={() => setSupportModalVisible(false)} />
      </View>
    );
  };

  // ─── REGISTRATION WIZARD ─────────────────────────────────────

  const renderUpload = (field: UploadField, title: string, subtitle: string, required?: boolean) => {
    const url = field === "profilePhotoUrl" ? profilePhotoUrl : documents[field as keyof Docs];
    const reuploadKey = REUPLOAD_FIELD_KEYS[field];
    const reuploadRequested = reuploadKey ? Boolean(documents.reuploadFlags?.[reuploadKey]) : false;
    const showImagePreview = typeof url === "string" && url && !isPdfFile(url);
    const hasFile = Boolean(url);
    const isBusy = uploadingFields.includes(field);
    return (
      <TouchableOpacity style={[s.uploadCard, reuploadRequested && s.uploadCardAlert]} onPress={() => uploadFile(field)} disabled={isBusy} activeOpacity={0.8}>
        <View style={s.uploadTop}>
          <View style={s.uploadIconWrap}>
            <Ionicons name={hasFile ? "checkmark-circle" : "cloud-upload-outline"} size={24} color={hasFile ? "#039855" : "#98A2B3"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.uploadTitle}>{title}{required ? " *" : ""}</Text>
            <Text style={s.uploadSub}>{subtitle}</Text>
          </View>
          {isBusy ? <ActivityIndicator size="small" color="#FF6B35" /> : (
            <View style={[s.uploadStatus, hasFile && s.uploadStatusDone]}>
              <Text style={[s.uploadStatusText, hasFile && s.uploadStatusTextDone]}>{hasFile ? "Uploaded" : "Upload"}</Text>
            </View>
          )}
        </View>
        {reuploadRequested ? (
          <View style={s.reuploadNote}><Ionicons name="alert-circle" size={14} color="#B42318" /><Text style={s.reuploadNoteText}>{documents.reuploadNotes || "Admin requested a replacement"}</Text></View>
        ) : null}
        {showImagePreview ? <Image source={{ uri: url }} style={s.uploadPreview} /> : null}
      </TouchableOpacity>
    );
  };

  const renderActiveDocumentRow = (item: ActiveDocumentItem) => {
    const reuploadKey = REUPLOAD_FIELD_KEYS[item.field];
    const reuploadRequested = reuploadKey ? Boolean(documents.reuploadFlags?.[reuploadKey]) : false;
    const hasFile = Boolean(item.url);
    const isBusy = uploadingFields.includes(item.field);
    return (
      <View key={item.field} style={[s.docRow, reuploadRequested && s.docRowAlert]}>
        <View style={s.docRowLeft}>
          <View style={[s.docDot, hasFile ? s.docDotReady : reuploadRequested ? s.docDotAlert : s.docDotMissing]} />
          <View style={{ flex: 1 }}>
            <Text style={s.docRowTitle}>{item.title}</Text>
            <Text style={s.docRowSub}>{reuploadRequested ? "Re-upload required" : hasFile ? "Uploaded" : item.required ? "Missing — upload now" : "Optional"}</Text>
          </View>
        </View>
        <View style={s.docRowActions}>
          {hasFile ? <TouchableOpacity style={s.docViewBtn} onPress={() => Linking.openURL(item.url as string)}><Text style={s.docViewBtnText}>View</Text></TouchableOpacity> : null}
          <TouchableOpacity style={s.docUploadBtn} onPress={() => uploadFile(item.field, { persist: true })} disabled={isBusy}>
            {isBusy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.docUploadBtnText}>{hasFile ? "Replace" : "Upload"}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleVehicleTypeSelect = (nextType: DeliveryProfile["vehicleType"]) => {
    setVehicleType(nextType);
    if (!vehicleTypeRequiresMotorDocuments(nextType)) {
      setVehicleNumber("");
      setLicenseNumber("");
    }
  };

  const clearBankDetails = () => {
    setDocuments((current) => ({
      ...current,
      bankAccountHolderName: "",
      bankAccountNumber: "",
      bankIfsc: "",
      cancelledChequeUrl: "",
      bankPassbookUrl: "",
      bankStatementUrl: "",
      bankDocumentType: ""
    }));
  };

  const handleBankFieldChange = (patch: Partial<Docs>) => {
    setBankDetailsSkipped(false);
    setDocuments((current) => ({ ...current, ...patch }));
  };

  const handleToggleSkipBankDetails = () => {
    setBankDetailsSkipped((current) => {
      const nextSkipped = !current;
      if (nextSkipped) clearBankDetails();
      return nextSkipped;
    });
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <View>
            <Text style={s.inputLabel}>Full Name</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Enter your full name" placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />

            <Text style={s.inputLabel}>Email (optional)</Text>
            <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="email@example.com" placeholderTextColor="#98A2B3" autoCapitalize="none" keyboardType="email-address" selectionColor="#FF6B35" />

            <Text style={s.inputLabel}>Phone</Text>
            <View style={s.readField}><Text style={s.readFieldText}>{profile?.phone || "Verified with OTP"}</Text></View>

            <Text style={s.inputLabel}>Date of Birth</Text>
            <TextInput style={s.input} value={dateOfBirth} onChangeText={(v) => setDateOfBirth(v.replace(/[^0-9-]/g, "").slice(0, 10))} placeholder="YYYY-MM-DD" placeholderTextColor="#98A2B3" keyboardType="numbers-and-punctuation" selectionColor="#FF6B35" />

            <Text style={s.sectionTitleSm}>Emergency Contact</Text>
            <TextInput style={s.input} value={emergencyContactName} onChangeText={setEmergencyContactName} placeholder="Emergency contact name" placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
            <TextInput style={[s.input, { marginTop: 10 }]} value={emergencyContactPhone} onChangeText={(v) => setEmergencyContactPhone(v.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" placeholderTextColor="#98A2B3" keyboardType="number-pad" maxLength={10} selectionColor="#FF6B35" />
          </View>
        );

      case 1:
        return (
          <View>
            <Text style={s.inputLabel}>Vehicle Type</Text>
            <View style={s.vehicleGrid}>
              {VEHICLE_TYPES.map((vt) => (
                <TouchableOpacity key={vt} style={[s.vehicleCard, vehicleType === vt && s.vehicleCardActive]} onPress={() => handleVehicleTypeSelect(vt)}>
                  <Ionicons name={VEHICLE_ICONS[vt]} size={24} color={vehicleType === vt ? "#C2410C" : "#667085"} />
                  <Text style={[s.vehicleCardText, vehicleType === vt && s.vehicleCardTextActive]}>{vt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color="#667085" />
              <Text style={s.infoCardText}>EV and Bicycle/Cycle riders do not need to submit driving license or vehicle number.</Text>
            </View>
            {requiresMotorDocuments ? (
              <>
                <Text style={s.inputLabel}>Vehicle Number</Text>
                <TextInput style={s.input} value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="e.g. TS09AB1234" placeholderTextColor="#98A2B3" autoCapitalize="characters" selectionColor="#FF6B35" />
                <Text style={s.inputLabel}>Driving License Number</Text>
                <TextInput style={s.input} value={licenseNumber} onChangeText={setLicenseNumber} placeholder="e.g. TS0120230012345" placeholderTextColor="#98A2B3" autoCapitalize="characters" selectionColor="#FF6B35" />
              </>
            ) : null}
          </View>
        );

      case 2:
        return (
          <View>
            <Text style={s.inputLabel}>Aadhaar Number</Text>
            <TextInput style={s.input} value={documents.aadhaarNumber || ""} onChangeText={(v) => setDocuments((c) => ({ ...c, aadhaarNumber: v.replace(/\D/g, "").slice(0, 12) }))} placeholder="12-digit Aadhaar number" placeholderTextColor="#98A2B3" keyboardType="number-pad" selectionColor="#FF6B35" />
            {renderUpload("aadhaarUrl", "Aadhaar Front", "Government ID proof", true)}
            {renderUpload("selfiePhotoUrl", "Live Selfie", "Front camera selfie for verification", true)}
            {requiresMotorDocuments ? (
              <>
                {renderUpload("drivingLicenseUrl", "Driving License Front", "Required for motor vehicles", true)}
                {renderUpload("drivingLicenseBackUrl", "Driving License Back", "Required for motor vehicles", true)}
              </>
            ) : null}
          </View>
        );

      case 3:
        return (
          <View>
            <View style={s.infoCard}>
              <Ionicons name="cash-outline" size={20} color="#667085" />
              <Text style={s.infoCardText}>We use these bank details to transfer your delivery job payments. You can skip this now and add payout details later from your profile.</Text>
            </View>

            <TouchableOpacity style={[s.skipBankToggle, bankDetailsSkipped && s.skipBankToggleActive]} onPress={handleToggleSkipBankDetails} activeOpacity={0.8}>
              <View style={{ flex: 1 }}>
                <Text style={[s.skipBankTitle, bankDetailsSkipped && s.skipBankTitleActive]}>{bankDetailsSkipped ? "Bank details skipped" : "Skip bank details for now"}</Text>
                <Text style={s.skipBankSub}>You can add payout details later from your profile.</Text>
              </View>
              <View style={[s.skipBankSwitch, bankDetailsSkipped && s.skipBankSwitchOn]}>
                <View style={[s.skipBankKnob, bankDetailsSkipped && s.skipBankKnobOn]} />
              </View>
            </TouchableOpacity>

            {bankDetailsSkipped ? (
              <View style={s.skippedBankNotice}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#039855" />
                <Text style={s.skippedBankNoticeText}>Skipped. Bank details will not be required for submission.</Text>
              </View>
            ) : (
              <>
                <Text style={s.inputLabel}>Account Holder Name</Text>
                <TextInput style={s.input} value={documents.bankAccountHolderName || ""} onChangeText={(v) => handleBankFieldChange({ bankAccountHolderName: v })} placeholder="As on bank account" placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
                <Text style={s.inputLabel}>Account Number</Text>
                <TextInput style={s.input} value={documents.bankAccountNumber || ""} onChangeText={(v) => handleBankFieldChange({ bankAccountNumber: v.replace(/\D/g, "") })} placeholder="Enter account number" placeholderTextColor="#98A2B3" keyboardType="number-pad" selectionColor="#FF6B35" />
                <Text style={s.inputLabel}>IFSC Code</Text>
                <TextInput style={s.input} value={documents.bankIfsc || ""} onChangeText={(v) => handleBankFieldChange({ bankIfsc: v.toUpperCase() })} placeholder="e.g. HDFC0001234" placeholderTextColor="#98A2B3" autoCapitalize="characters" selectionColor="#FF6B35" />
              </>
            )}

            <TouchableOpacity style={s.termsRow} onPress={() => setTermsAccepted((c) => !c)}>
              <Ionicons name={termsAccepted ? "checkbox" : "square-outline"} size={22} color={termsAccepted ? "#FF6B35" : "#98A2B3"} />
              <Text style={s.termsText}>I agree to the delivery partner{" "}<Text style={s.termsLink} onPress={() => Linking.openURL(TERMS_URL)}>terms and conditions</Text>.</Text>
            </TouchableOpacity>

            <View style={s.checklist}>
              <Text style={s.checklistTitle}>Review checklist</Text>
              <Text style={[s.checklistItem, mandatoryDocsComplete && s.checklistDone]}>{mandatoryDocsComplete ? "All mandatory documents uploaded" : "Some mandatory documents are still missing"}</Text>
              <Text style={s.checklistItem}>Status: Pending → Verified → Active</Text>
            </View>
          </View>
        );
    }
  };

  if (loading) {
    return <View style={[s.center, { paddingTop: insets.top }]}><ActivityIndicator size="large" color="#FF6B35" /><Text style={{ marginTop: 12, color: "#667085", fontSize: 15 }}>Loading profile...</Text></View>;
  }

  const currentStatus = statusTone[profile?.status || "INACTIVE"];

  if (isActiveDashboard) return renderActiveProfile();

  // ─── REGISTRATION LAYOUT ────────────────────────────────────
  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 8}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 140 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.regHero}>
          <View style={s.regHeroIcon}><Ionicons name="bicycle" size={20} color="#C2410C" /></View>
          <Text style={s.regHeroTitle}>Become a Delivery Partner</Text>
          <Text style={s.regHeroSub}>Complete your profile to start earning. We'll verify and activate your account within 24-48 hours.</Text>
        </View>

        {/* Status card */}
        <View style={[s.statusCard, { backgroundColor: currentStatus.bg }]}>
          <Text style={[s.statusLabel, { color: currentStatus.fg }]}>{currentStatus.label}</Text>
          <Text style={s.statusDesc}>{mandatoryDocsComplete ? "All required documents submitted." : "Finish all mandatory sections before submitting."}</Text>
          {profile?.reviewComment ? <Text style={s.statusDesc}>Admin note: {profile.reviewComment}</Text> : null}
          {documents.reuploadNotes ? <Text style={s.statusDesc}>Re-upload requested: {documents.reuploadNotes}</Text> : null}
        </View>

        {/* Step Progress */}
        <View style={s.progressWrap}>
          <View style={s.progressBar}>
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                {i > 0 ? <View style={[s.progressConnector, i <= step && s.progressConnectorActive]} /> : null}
                <TouchableOpacity style={[s.progressDot, i < step && s.progressDotDone, i === step && s.progressDotActive]} onPress={() => setStep(i)}>
                  {i < step ? <Ionicons name="checkmark" size={16} color="#fff" /> : <Text style={[s.progressDotText, i === step && s.progressDotTextActive]}>{i + 1}</Text>}
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
          <Text style={s.progressLabel}>Step {step + 1} — {STEPS[step]}</Text>
        </View>

        {/* Step Content */}
        <Animated.View style={{ opacity: stepAnim, transform: [{ translateY: stepAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
          <View style={s.stepCard}>
            {renderStepContent()}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 14 }]}>
        <View style={s.footerRow}>
          {step > 0 ? (
            <TouchableOpacity style={s.footerBtnOutline} onPress={() => setStep((c) => c - 1)}>
              <Ionicons name="arrow-back" size={18} color="#344054" />
              <Text style={s.footerBtnOutlineText}>Back</Text>
            </TouchableOpacity>
          ) : <View style={{ width: 80 }} />}
          <TouchableOpacity style={s.footerDraft} onPress={handleSaveDraft}><Text style={s.footerDraftText}>Save Draft</Text></TouchableOpacity>
          {step < STEPS.length - 1 ? (
            <TouchableOpacity style={s.footerBtnPrimary} onPress={() => {
              const error = validateStep(step);
              if (error) { Alert.alert("Missing details", error); return; }
              setStep((c) => c + 1);
            }}>
              <Text style={s.footerBtnPrimaryText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[s.footerBtnPrimary, saving && s.btnDisabled]} onPress={handleSubmit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.footerBtnPrimaryText}>Submit</Text>}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F7FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F7FA" },

  // ── Active Dashboard ──
  profileHeader: { backgroundColor: "#FF6B35", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28, alignItems: "center" },
  avatarWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: "#fff", padding: 3, alignItems: "center", justifyContent: "center" },
  avatar: { width: "100%", height: "100%", borderRadius: 21 },
  avatarFallback: { flex: 1, borderRadius: 21, backgroundColor: "#FFF4EE", alignItems: "center", justifyContent: "center" },
  avatarBadge: { position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: "#039855", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FF6B35" },
  profileName: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 12 },
  profileMeta: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.8)", marginTop: 4 },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  statusChipText: { fontSize: 13, fontWeight: "700" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginHorizontal: 16, marginTop: -14 },
  statCard: { width: "48%", backgroundColor: "#fff", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#ECECEC" },
  statVal: { fontSize: 20, fontWeight: "800", color: "#1D2939" },
  statLbl: { fontSize: 12, fontWeight: "600", color: "#667085", marginTop: 4 },
  section: { marginHorizontal: 16, marginTop: 14, padding: 18, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#ECECEC" },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#1D2939" },
  sectionTitleSm: { fontSize: 15, fontWeight: "700", color: "#344054", marginTop: 16, marginBottom: 10 },
  sectionSub: { fontSize: 13, color: "#667085", marginTop: 4, marginBottom: 4 },
  divider: { height: 1, backgroundColor: "#F2F4F7", marginVertical: 12 },

  availCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 6 },
  availDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#D0D5DD" },
  availDotOn: { backgroundColor: "#039855" },
  availTitle: { fontSize: 15, fontWeight: "800", color: "#1D2939" },
  availSub: { fontSize: 12, color: "#667085", marginTop: 2 },
  availSwitch: { width: 44, height: 24, borderRadius: 12, backgroundColor: "#E4E7EC", justifyContent: "center", paddingHorizontal: 3 },
  availSwitchOn: { backgroundColor: "#039855" },
  availSwitchKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#fff" },
  availSwitchKnobOn: { alignSelf: "flex-end" },

  docRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F2F4F7" },
  docRowAlert: { backgroundColor: "#FFFBFA", marginHorizontal: -12, paddingHorizontal: 12, borderRadius: 12 },
  docRowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  docDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#D0D5DD" },
  docDotReady: { backgroundColor: "#039855" },
  docDotMissing: { backgroundColor: "#B42318" },
  docDotAlert: { backgroundColor: "#F79009" },
  docRowTitle: { fontSize: 14, fontWeight: "700", color: "#1D2939" },
  docRowSub: { fontSize: 12, color: "#98A2B3", marginTop: 2 },
  docRowActions: { flexDirection: "row", gap: 8 },
  docViewBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#E4E7EC" },
  docViewBtnText: { fontSize: 12, fontWeight: "700", color: "#475467" },
  docUploadBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: "#FF6B35" },
  docUploadBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },

  alertBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, backgroundColor: "#FEF3F2", marginTop: 12 },
  alertBoxText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#B42318" },

  // ── Info Rows ──
  infoRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F2F4F7" },
  infoLabel: { fontSize: 11, fontWeight: "700", color: "#98A2B3", textTransform: "uppercase" },
  infoValue: { marginTop: 4, fontSize: 15, fontWeight: "700", color: "#1D2939" },

  shortcutCard: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  shortcutIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#FFF4EE", alignItems: "center", justifyContent: "center" },
  shortcutTitle: { fontSize: 14, fontWeight: "700", color: "#1D2939" },
  shortcutSubtitle: { fontSize: 12, color: "#667085", marginTop: 2 },

  logoutBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center", backgroundColor: "#1D2939" },
  logoutBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  deleteBtn: { marginTop: 10, paddingVertical: 15, borderRadius: 14, alignItems: "center", backgroundColor: "#FEF3F2", borderWidth: 1, borderColor: "#FECDCA" },
  deleteBtnText: { fontSize: 15, fontWeight: "800", color: "#B42318" },

  // ── Registration ──
  regHero: { margin: 16, padding: 20, borderRadius: 24, backgroundColor: "#FFF4EE", borderWidth: 1, borderColor: "#FFD7C2", alignItems: "center" },
  regHeroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  regHeroTitle: { fontSize: 22, fontWeight: "800", color: "#1D2939", textAlign: "center" },
  regHeroSub: { marginTop: 8, fontSize: 13, lineHeight: 19, color: "#667085", textAlign: "center" },

  statusCard: { marginHorizontal: 16, padding: 14, borderRadius: 16 },
  statusLabel: { fontSize: 14, fontWeight: "800" },
  statusDesc: { marginTop: 6, fontSize: 13, lineHeight: 18, color: "#475467" },

  progressWrap: { marginHorizontal: 16, marginTop: 14, padding: 18, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#ECECEC" },
  progressBar: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  progressConnector: { width: 40, height: 3, backgroundColor: "#F2F4F7", marginHorizontal: -2 },
  progressConnectorActive: { backgroundColor: "#FF6B35" },
  progressDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F2F4F7", alignItems: "center", justifyContent: "center" },
  progressDotActive: { backgroundColor: "#FF6B35" },
  progressDotDone: { backgroundColor: "#039855" },
  progressDotText: { fontSize: 14, fontWeight: "800", color: "#98A2B3" },
  progressDotTextActive: { color: "#fff" },
  progressLabel: { textAlign: "center", marginTop: 12, fontSize: 13, fontWeight: "700", color: "#667085" },

  stepCard: { marginHorizontal: 16, marginTop: 14, padding: 18, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#ECECEC" },

  avatarUploadWrap: { flexDirection: "row", gap: 16, marginBottom: 16, padding: 14, borderRadius: 16, backgroundColor: "#F8FAFC" },
  avatarUpload: { width: 72, height: 72, borderRadius: 20, overflow: "hidden" },
  avatarUploadImg: { width: "100%", height: "100%" },
  avatarUploadPlaceholder: { flex: 1, borderRadius: 20, backgroundColor: "#fff", borderWidth: 2, borderColor: "#D0D5DD", alignItems: "center", justifyContent: "center" },
  avatarUploadHint: { fontSize: 10, color: "#98A2B3", marginTop: 4 },
  avatarLabel: { fontSize: 15, fontWeight: "800", color: "#1D2939" },
  avatarHint: { fontSize: 12, color: "#667085", marginTop: 2 },

  inputLabel: { fontSize: 13, fontWeight: "700", color: "#344054", marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: "#1D2939", backgroundColor: "#fff" },
  textArea: { minHeight: 40 },
  readField: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E4E7EC" },
  readFieldText: { fontSize: 15, fontWeight: "700", color: "#1D2939" },

  vehicleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  vehicleCard: { width: "30%", paddingVertical: 14, borderRadius: 14, backgroundColor: "#F8FAFC", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#ECECEC" },
  vehicleCardActive: { backgroundColor: "#FFF4EE", borderColor: "#FFD7C2" },
  vehicleCardText: { fontSize: 12, fontWeight: "700", color: "#667085" },
  vehicleCardTextActive: { color: "#C2410C" },

  infoCard: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, backgroundColor: "#F8FAFC", marginTop: 14 },
  infoCardText: { flex: 1, fontSize: 13, color: "#667085", lineHeight: 18 },

  chipRow: { flexDirection: "row", gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: "#F2F4F7" },
  chipActive: { backgroundColor: "#FFF4EE" },
  chipText: { fontSize: 13, fontWeight: "700", color: "#667085" },
  chipTextActive: { color: "#C2410C" },
  chipHint: { marginTop: 6, fontSize: 12, color: "#98A2B3" },
  skipBankToggle: { marginTop: 14, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#E4E7EC", backgroundColor: "#F8FAFC", flexDirection: "row", alignItems: "center", gap: 12 },
  skipBankToggleActive: { backgroundColor: "#ECFDF3", borderColor: "#ABEFC6" },
  skipBankTitle: { fontSize: 14, fontWeight: "800", color: "#475467" },
  skipBankTitleActive: { color: "#027A48" },
  skipBankSub: { marginTop: 3, fontSize: 12, color: "#667085" },
  skipBankSwitch: { width: 46, height: 26, borderRadius: 13, backgroundColor: "#E4E7EC", justifyContent: "center", paddingHorizontal: 3 },
  skipBankSwitchOn: { backgroundColor: "#039855" },
  skipBankKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
  skipBankKnobOn: { alignSelf: "flex-end" },
  skippedBankNotice: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: "#F6FEF9", borderWidth: 1, borderColor: "#D1FADF", flexDirection: "row", alignItems: "center", gap: 8 },
  skippedBankNoticeText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#027A48" },

  termsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16, padding: 14, borderRadius: 14, backgroundColor: "#FFF8F5" },
  termsText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "600", color: "#475467" },
  termsLink: { color: "#C2410C", fontWeight: "800", textDecorationLine: "underline" },

  checklist: { marginTop: 14, padding: 14, borderRadius: 14, backgroundColor: "#F8FAFC" },
  checklistTitle: { fontSize: 14, fontWeight: "800", color: "#1D2939" },
  checklistItem: { marginTop: 6, fontSize: 13, color: "#667085" },
  checklistDone: { color: "#039855" },

  uploadCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, padding: 14, borderRadius: 16, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#ECECEC", flexWrap: "wrap" as const },
  uploadCardAlert: { backgroundColor: "#FFFBFA", borderColor: "#FECDCA" },
  uploadTop: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 200 },
  uploadIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#ECECEC" },
  uploadTitle: { fontSize: 14, fontWeight: "700", color: "#1D2939" },
  uploadSub: { fontSize: 11, color: "#98A2B3", marginTop: 2 },
  uploadStatus: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#F2F4F7" },
  uploadStatusDone: { backgroundColor: "#ECFDF3" },
  uploadStatusText: { fontSize: 11, fontWeight: "700", color: "#667085" },
  uploadStatusTextDone: { color: "#039855" },
  uploadPreview: { width: "100%", height: 100, borderRadius: 12, marginTop: 10, backgroundColor: "#F2F4F7" },
  reuploadNote: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, padding: 8, borderRadius: 8, backgroundColor: "#FEF3F2", width: "100%" },
  reuploadNoteText: { fontSize: 12, fontWeight: "600", color: "#B42318", flex: 1 },

  btnRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  btnPrimary: { flex: 1, height: 48, borderRadius: 14, backgroundColor: "#FF6B35", alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  btnOutline: { flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E4E7EC", backgroundColor: "#fff" },
  btnOutlineText: { fontSize: 15, fontWeight: "800", color: "#475467" },
  btnDisabled: { opacity: 0.7 },

  // ── Footer ──
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: "rgba(255,255,255,0.97)", borderTopWidth: 1, borderTopColor: "#ECECEC" },
  footerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  footerBtnOutline: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, height: 48, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E4E7EC" },
  footerBtnOutlineText: { fontSize: 14, fontWeight: "800", color: "#475467" },
  footerDraft: { paddingHorizontal: 8, height: 48, justifyContent: "center" },
  footerDraftText: { fontSize: 13, fontWeight: "700", color: "#98A2B3" },
  footerBtnPrimary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 48, borderRadius: 14, backgroundColor: "#FF6B35" },
  footerBtnPrimaryText: { fontSize: 15, fontWeight: "800", color: "#fff" }
});
