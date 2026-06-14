import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Linking
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import api, { uploadMultipart } from "../api/client";
import { usePartnerTheme } from "../context/PartnerThemeContext";

type ReuploadFlags = {
  fssaiUrl?: boolean;
  panFrontUrl?: boolean;
  aadhaarFrontUrl?: boolean;
  aadhaarBackUrl?: boolean;
  bankProofUrl?: boolean;
  addressProofUrl?: boolean;
  gstUrl?: boolean;
  shopLicenseUrl?: boolean;
  ownerPanUrl?: boolean;
  menuProofUrl?: boolean;
};

type Documents = {
  fssaiNumber?: string;
  fssaiUrl?: string;
  gstRegistered?: boolean | string;
  gstNumber?: string;
  gstUrl?: string;
  shopLicenseUrl?: string;
  panNumber?: string;
  panFrontUrl?: string;
  ownerPanUrl?: string;
  aadhaarNumber?: string;
  aadhaarFrontUrl?: string;
  aadhaarBackUrl?: string;
  bankAccountHolderName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankDocumentType?: string;
  bankProofUrl?: string;
  addressProofUrl?: string;
  menuProofUrl?: string;
  restaurantPhotosUrls?: string[];
  reuploadFlags?: ReuploadFlags;
  reuploadNotes?: string;
  isComplete?: boolean;
};

type PartnerSettings = {
  autoAcceptOrders?: boolean;
  estimatedPrepTime?: number;
  deliveryMode?: "self" | "platform";
  deliveryRadiusKm?: number;
  minimumOrderAmount?: number;
  upiId?: string;
};

interface PartnerProfile {
  _id: string;
  ownerName: string;
  restaurantName: string;
  shopName?: string;
  email?: string;
  shopDescription?: string;
  category: string;
  shopImageUrl?: string;
  bannerImageUrl?: string;
  phone: string;
  address: {
    state: string;
    city: string;
    pincode: string;
    area: string;
    colony: string;
    roadStreet: string;
    nearbyPlaces: string[];
    googleMapsLink: string;
  };
  location?: { coordinates?: number[] };
  documents?: Documents;
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
  weeklyHolidays?: string[];
  rating: number;
  status: string;
  menuItemsCount: number;
  hasCompletedSetup: boolean;
  settings?: PartnerSettings;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

interface UploadResponse {
  success: boolean;
  data: { url: string };
  message: string;
}

type PickerAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  bakery: "Bakery",
  restaurant: "Restaurant",
  "cloud-kitchen": "Cloud Kitchen",
  "mini-restaurant": "Restaurant",
  grocery: "Grocery",
  "tiffin-center": "Tiffin center",
  "fast-food": "Fast food",
  sweets: "Sweets",
  "ice-creams": "Ice creams",
  juice: "Juice shop",
  other: "Other"
};

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS_12 = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTE_OPTIONS = ["00", "15", "30", "45"];
const PERIOD_OPTIONS = ["AM", "PM"] as const;

type TimeField = "openingTime" | "closingTime";
type TimePeriod = typeof PERIOD_OPTIONS[number];

type DocumentKey =
  | "fssaiUrl"
  | "panFrontUrl"
  | "aadhaarFrontUrl"
  | "aadhaarBackUrl"
  | "bankProofUrl"
  | "addressProofUrl"
  | "gstUrl"
  | "shopLicenseUrl"
  | "ownerPanUrl"
  | "menuProofUrl";

const DOCUMENT_UPLOADS: Array<{ key: DocumentKey; title: string; subtitle: string; mandatory?: boolean }> = [
  { key: "fssaiUrl", title: "FSSAI license", subtitle: "Submitted during registration", mandatory: true },
  { key: "panFrontUrl", title: "PAN card", subtitle: "Submitted during registration", mandatory: true },
  { key: "aadhaarFrontUrl", title: "Aadhaar front", subtitle: "Submitted during registration", mandatory: true },
  { key: "gstUrl", title: "GST certificate", subtitle: "Required only when GST registered" }
];

const REQUIRED_KYC_DETAILS: Array<{ key: keyof Documents; label: string }> = [
  { key: "fssaiNumber", label: "FSSAI number" },
  { key: "panNumber", label: "PAN number" },
  { key: "aadhaarNumber", label: "Aadhaar number" }
];

const getUploadMimeType = (filename: string) => {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";
  if (extension === "pdf") return "application/pdf";
  return "image/jpeg";
};

const getUploadFilename = (asset: PickerAsset, fallbackName: string) => {
  const fromUri = asset.uri.split(/[\\/]/).pop()?.split("?")[0];
  const baseName = (asset.fileName || fromUri || fallbackName).replace(/[^a-zA-Z0-9._-]/g, "_");
  if (/\.[a-z0-9]+$/i.test(baseName)) return baseName;
  const mimeExtension = asset.mimeType?.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  return `${baseName}.${mimeExtension}`;
};

const loadLocationModule = async () => {
  try {
    return await import("expo-location");
  } catch (error) {
    console.warn("expo-location is unavailable in this app build:", error);
    return null;
  }
};

const formatAddress = (address?: PartnerProfile["address"]) => {
  if (!address) return "";
  return [address.roadStreet, address.colony, address.area, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(", ");
};

const maskValue = (value?: string, visible = 4) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.length <= visible) return trimmed;
  return `${"*".repeat(Math.max(trimmed.length - visible, 4))}${trimmed.slice(-visible)}`;
};

const maskBankAccountNumber = (value?: string) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "Not added yet";
  return `Account ${maskValue(digits, 4)}`;
};

const parseTimeToTwelveHour = (value: string) => {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value || "");
  const hour24 = match ? Number(match[1]) : 8;
  const minute = match ? match[2] : "00";
  const period: TimePeriod = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 || 12;

  return { hour, minute, period };
};

const toTwentyFourHourTime = (hour: number, minute: string, period: TimePeriod) => {
  let hour24 = hour % 12;
  if (period === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${minute}`;
};

const formatTwelveHourTime = (value: string) => {
  const parsed = parseTimeToTwelveHour(value);
  return `${parsed.hour}:${parsed.minute} ${parsed.period}`;
};

const normalizeDocumentsFromApi = (input?: Documents | null): Documents => {
  const docs = (input || {}) as Record<string, any>;
  return {
    ...docs,
    panFrontUrl: docs.panFrontUrl || docs.ownerPanUrl || docs.panUrl || "",
    aadhaarFrontUrl: docs.aadhaarFrontUrl || docs.ownerIdProofUrl || docs.aadhaarUrl || "",
    bankProofUrl:
      docs.bankProofUrl || docs.cancelledChequeUrl || docs.bankPassbookUrl || docs.bankStatementUrl || "",
    bankDocumentType: docs.bankDocumentType || docs.bankProofType || "",
    reuploadFlags: (docs.reuploadFlags || {}) as ReuploadFlags,
    reuploadNotes: docs.reuploadNotes || ""
  };
};

const hasCompleteVerificationDocuments = (docs?: Documents | null) => {
  const documents = docs || {};
  const isGstRegistered =
    documents.gstRegistered === true || documents.gstRegistered === "true" || documents.gstRegistered === "yes";

  return Boolean(
    String(documents.fssaiNumber || "").trim() &&
      String(documents.fssaiUrl || "").trim() &&
      String(documents.panNumber || "").trim() &&
      String(documents.panFrontUrl || documents.ownerPanUrl || "").trim() &&
      String(documents.aadhaarNumber || "").trim() &&
      String(documents.aadhaarFrontUrl || "").trim() &&
      (!isGstRegistered || (String(documents.gstNumber || "").trim() && String(documents.gstUrl || "").trim()))
  );
};

const isProfileVerificationLocked = (profile?: PartnerProfile | null, docs?: Documents | null) =>
  profile?.status === "APPROVED" && hasCompleteVerificationDocuments(docs);

export default function ProfileScreen({ navigation }: any) {
  const { isDarkMode, theme } = usePartnerTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerBusy, setPickerBusy] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const [basics, setBasics] = useState({
    ownerName: "",
    email: "",
    shopDescription: ""
  });

  const [address, setAddress] = useState({
    roadStreet: "",
    colony: "",
    area: "",
    city: "",
    state: "",
    pincode: "",
    googleMapsLink: "",
    landmark: ""
  });
  const [capturedLocation, setCapturedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [capturingLocation, setCapturingLocation] = useState(false);

  const [images, setImages] = useState({
    shopImageUrl: "",
    bannerImageUrl: "",
    restaurantPhotosUrls: [] as string[]
  });

  const [hours, setHours] = useState({
    openingTime: "08:00",
    closingTime: "22:00",
    isOpen: true,
    weeklyHolidays: [] as string[]
  });
  const [activeTimeField, setActiveTimeField] = useState<TimeField>("openingTime");

  const [kyc, setKyc] = useState<Documents>({});
  const [kycEditingField, setKycEditingField] = useState<keyof Documents | null>(null);
  const [kycDraftValue, setKycDraftValue] = useState("");
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: "",
    accountNumber: "",
    ifsc: ""
  });
  const [bankChangeRequestReason, setBankChangeRequestReason] = useState("");
  const [bankChangeRequestSubmitting, setBankChangeRequestSubmitting] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const hydrateFromProfile = (data: PartnerProfile) => {
    setBasics({
      ownerName: data.ownerName || "",
      email: data.email || "",
      shopDescription: data.shopDescription || ""
    });
    setAddress({
      roadStreet: data.address?.roadStreet || "",
      colony: data.address?.colony || "",
      area: data.address?.area || "",
      city: data.address?.city || "",
      state: data.address?.state || "",
      pincode: data.address?.pincode || "",
      googleMapsLink: data.address?.googleMapsLink || "",
      landmark: data.address?.nearbyPlaces?.join(", ") || ""
    });
    setCapturedLocation(null);
    setImages({
      shopImageUrl: data.shopImageUrl || "",
      bannerImageUrl: data.bannerImageUrl || "",
      restaurantPhotosUrls: data.documents?.restaurantPhotosUrls || []
    });
    setHours({
      openingTime: data.openingTime || "08:00",
      closingTime: data.closingTime || "22:00",
      isOpen: data.isOpen !== false,
      weeklyHolidays: data.weeklyHolidays || []
    });
    const normalizedDocs = normalizeDocumentsFromApi(data.documents);
    setKyc(normalizedDocs);
    setBankDetails({
      accountHolderName: normalizedDocs.bankAccountHolderName || "",
      accountNumber: normalizedDocs.bankAccountNumber || "",
      ifsc: normalizedDocs.bankIfsc || ""
    });
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get("/partners/profile");
      const responseData = response.data as ApiResponse<PartnerProfile>;
      if (responseData.success && responseData.data) {
        setProfile(responseData.data);
        hydrateFromProfile(responseData.data);
      } else {
        throw new Error(responseData.message || "Failed to load profile");
      }
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || error.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const uploadAsset = async (asset: PickerAsset): Promise<string> => {
    const formData = new FormData();
    const filename = getUploadFilename(asset, "partner-upload.jpg");
    const type = asset.mimeType || getUploadMimeType(filename);
    // @ts-ignore React Native FormData file object
    formData.append("image", { uri: asset.uri, type, name: filename });

    const uploadData = await uploadMultipart<UploadResponse["data"]>("/upload/image", formData);
    if (!uploadData?.success || !uploadData?.data?.url) {
      throw new Error(uploadData?.message || "Upload failed");
    }
    return uploadData.data.url;
  };

  const pickAsset = async (): Promise<PickerAsset | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Permission needed", "Please grant gallery permission to upload.");
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7
    });
    if (result.canceled || !result.assets[0]?.uri) return null;
    return result.assets[0];
  };

  const uploadAndSave = async (slotKey: string, persist: (uploadedUrl: string) => Promise<void>) => {
    if (pickerBusy || saving || uploadingKey) return;
    try {
      setPickerBusy(true);
      const asset = await pickAsset();
      if (!asset) return;

      setUploadingKey(slotKey);
      const uploadedUrl = await uploadAsset(asset);
      await persist(uploadedUrl);
    } catch (error: any) {
      Alert.alert("Upload Failed", error.response?.data?.message || error.message || "Failed to upload image.");
    } finally {
      setUploadingKey(null);
      setPickerBusy(false);
    }
  };

  const saveUpdate = async (payload: Record<string, any>, successMessage?: string) => {
    setSaving(true);
    try {
      const response = await api.put("/partners/profile", payload);
      const responseData = response.data as ApiResponse<PartnerProfile>;
      if (!responseData.success || !responseData.data) {
        throw new Error(responseData.message || "Failed to update profile");
      }
      setProfile(responseData.data);
      hydrateFromProfile(responseData.data);
      if (successMessage) Alert.alert("Saved", successMessage);
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || error.message || "Failed to save changes");
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBasics = () => {
    const locked = isProfileVerificationLocked(profile, kyc);
    const payload: Record<string, any> = {
      shopDescription: basics.shopDescription.trim()
    };

    if (!locked) {
      payload.ownerName = basics.ownerName.trim();
      payload.email = basics.email.trim();
    }

    return saveUpdate(payload, locked ? "Shop description updated" : "Basic shop details updated");
  };

  const captureShopLocation = async () => {
    try {
      setCapturingLocation(true);
      const Location = await loadLocationModule();
      if (!Location) {
        Alert.alert(
          "App update required",
          "This Partner app build does not include location support yet. Install the latest build, or paste a Google Maps link with coordinates."
        );
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location permission needed",
          "Stand at your shop and allow location access so customers can find the correct nearby listing."
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      setCapturedLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
      Alert.alert("Shop location captured", "Tap Save address to apply this GPS pin.");
    } catch (error: any) {
      Alert.alert("Could not capture location", error?.message || "Please try again from inside the shop.");
    } finally {
      setCapturingLocation(false);
    }
  };

  const handleSaveAddress = async () => {
    if (isProfileVerificationLocked(profile, kyc)) {
      Alert.alert(
        "Verified address locked",
        "Your verified shop address can only be changed by sending a support request with the reason for change."
      );
      return;
    }

    if (!address.roadStreet || !address.colony || !address.area || !address.city || !address.state) {
      Alert.alert("Missing details", "Fill all address fields before saving.");
      return;
    }
    if (!/^\d{6}$/.test(address.pincode)) {
      Alert.alert("Pincode", "Pincode must be exactly 6 digits.");
      return;
    }
    const landmarks = address.landmark
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const payload: Record<string, any> = {
      address: {
        ...profile?.address,
        roadStreet: address.roadStreet.trim(),
        colony: address.colony.trim(),
        area: address.area.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        pincode: address.pincode.trim(),
        nearbyPlaces: landmarks,
        googleMapsLink: address.googleMapsLink.trim()
      }
    };

    if (capturedLocation) {
      payload.location = capturedLocation;
    }

    await saveUpdate(payload, "Address & location updated");
    setCapturedLocation(null);
  };

  const handleSaveHours = () => {
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(hours.openingTime) || !timeRegex.test(hours.closingTime)) {
      Alert.alert("Invalid time", "Use HH:MM format like 09:30.");
      return;
    }
    return saveUpdate(
      {
        openingTime: hours.openingTime,
        closingTime: hours.closingTime,
        weeklyHolidays: hours.weeklyHolidays
      },
      "Business hours updated"
    );
  };

  const handleSaveKyc = () => {
    if (isProfileVerificationLocked(profile, kyc)) {
      Alert.alert(
        "Verification locked",
        "Verified document details can only be changed through support after review."
      );
      return;
    }

    return saveUpdate({ documents: { ...kyc } }, "KYC details updated");
  };

  const handleSaveBankDetails = async () => {
    if (isProfileVerificationLocked(profile, kyc)) {
      Alert.alert(
        "Bank details locked",
        "For security, verified payout details can only be changed after support reviews your request and reason."
      );
      return;
    }

    const accountHolderName = bankDetails.accountHolderName.trim();
    const accountNumber = bankDetails.accountNumber.replace(/\D/g, "");
    const ifsc = bankDetails.ifsc.trim().toUpperCase();

    if (!accountHolderName || !accountNumber || !ifsc) {
      Alert.alert("Bank details", "Enter account holder name, account number, and IFSC before saving.");
      return;
    }
    if (!/^[0-9]{6,20}$/.test(accountNumber)) {
      Alert.alert("Account number", "Account number must be 6 to 20 digits.");
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      Alert.alert("IFSC", "Enter a valid 11-character IFSC code.");
      return;
    }

    const nextDocs: Documents = {
      ...kyc,
      bankAccountHolderName: accountHolderName,
      bankAccountNumber: accountNumber,
      bankIfsc: ifsc
    };
    setKyc(nextDocs);
    setBankDetails({ accountHolderName, accountNumber, ifsc });
    await saveUpdate({ documents: nextDocs }, "Bank details updated for manual payouts");
  };

  const submitBankChangeRequest = async () => {
    const reason = bankChangeRequestReason.trim();
    if (reason.length < 15) {
      Alert.alert("Reason required", "Please add a clear reason with at least 15 characters.");
      return;
    }

    try {
      setBankChangeRequestSubmitting(true);
      await api.post("/support/tickets", {
        subject: "Partner bank account change request",
        category: "PAYMENT",
        priority: "HIGH",
        message: [
          `Partner: ${profile?.restaurantName || "Unknown shop"}`,
          `Registered phone: ${profile?.phone || "Not available"}`,
          `Current payout account: ${maskBankAccountNumber(bankDetails.accountNumber)}`,
          `Current IFSC: ${bankDetails.ifsc || "Not added"}`,
          "",
          `Reason for change: ${reason}`
        ].join("\n")
      });
      setBankChangeRequestReason("");
      Alert.alert("Request sent", "Support will review your bank account change request before any payout details are updated.");
    } catch (error: any) {
      Alert.alert("Request failed", error.response?.data?.message || error.message || "Could not send request");
    } finally {
      setBankChangeRequestSubmitting(false);
    }
  };

  const startEditKycField = (field: keyof Documents) => {
    if (isProfileVerificationLocked(profile, kyc) && String(kyc[field] || "").trim()) {
      Alert.alert(
        "Verified detail locked",
        "This verified detail can only be changed through support after review."
      );
      return;
    }

    setKycEditingField(field);
    setKycDraftValue(((kyc[field] as string) || "").toString());
  };

  const cancelEditKycField = () => {
    setKycEditingField(null);
    setKycDraftValue("");
  };

  const sanitizeKycValue = (field: keyof Documents, raw: string): string => {
    if (field === "fssaiNumber") return raw.replace(/\D/g, "").slice(0, 14);
    if (field === "panNumber") return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    if (field === "aadhaarNumber") return raw.replace(/\D/g, "").slice(0, 12);
    if (field === "gstNumber") return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
    if (field === "bankAccountNumber") return raw.replace(/\D/g, "").slice(0, 20);
    if (field === "bankIfsc") return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
    if (field === "bankAccountHolderName") return raw;
    return raw;
  };

  const commitKycField = async (field: keyof Documents) => {
    const value = sanitizeKycValue(field, kycDraftValue).trim();
    if (!value) {
      Alert.alert("Required", "Please enter a value before saving.");
      return;
    }
    const nextDocs: Documents = { ...kyc, [field]: value };
    setKyc(nextDocs);
    setKycEditingField(null);
    setKycDraftValue("");
    await saveUpdate({ documents: nextDocs }, "Details updated");
  };

  const toggleWeeklyHoliday = (day: string) =>
    setHours((prev) => ({
      ...prev,
      weeklyHolidays: prev.weeklyHolidays.includes(day)
        ? prev.weeklyHolidays.filter((item) => item !== day)
        : [...prev.weeklyHolidays, day]
    }));

  const updateTimePart = (field: TimeField, next: Partial<ReturnType<typeof parseTimeToTwelveHour>>) => {
    setHours((prev) => {
      const current = parseTimeToTwelveHour(prev[field]);
      const nextTime = { ...current, ...next };
      return {
        ...prev,
        [field]: toTwentyFourHourTime(nextTime.hour, nextTime.minute, nextTime.period)
      };
    });
  };

  const coordinateText = useMemo(() => {
    if (capturedLocation) {
      return `${capturedLocation.latitude.toFixed(6)}, ${capturedLocation.longitude.toFixed(6)} (new pin, save to apply)`;
    }

    const [lng, lat] = profile?.location?.coordinates || [];
    if (typeof lat !== "number" || typeof lng !== "number" || (lat === 0 && lng === 0)) {
      return "No valid GPS pin saved yet";
    }
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }, [capturedLocation, profile?.location?.coordinates]);

  const profileCompletion = useMemo(() => {
    const isGstRegistered = kyc.gstRegistered === true || kyc.gstRegistered === "true" || kyc.gstRegistered === "yes";
    const missingDetails = REQUIRED_KYC_DETAILS
      .filter(({ key }) => !String(kyc[key] || "").trim())
      .map(({ label }) => label);
    if (isGstRegistered && !String(kyc.gstNumber || "").trim()) {
      missingDetails.push("GSTIN");
    }
    const missingDocuments = DOCUMENT_UPLOADS
      .filter((doc) => doc.mandatory && !String(kyc[doc.key] || "").trim())
      .map((doc) => doc.title);
    if (isGstRegistered && !String(kyc.gstUrl || "").trim()) {
      missingDocuments.push("GST certificate");
    }
    const missing = [...missingDetails, ...missingDocuments];

    return {
      isComplete: missing.length === 0,
      missing
    };
  }, [kyc]);

  if (loading && !profile) {
    return (
      <View style={[styles.loadingContainer, isDarkMode && styles.safeAreaScreenDark]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, isDarkMode && styles.mutedTextDark]}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.loadingContainer, isDarkMode && styles.safeAreaScreenDark]}>
        <Text style={[styles.loadingText, isDarkMode && styles.mutedTextDark]}>Profile not found</Text>
      </View>
    );
  }

  const verificationDetailsLocked = isProfileVerificationLocked(profile, kyc);
  const lockedDetailsCopy =
    "Verified registration, document, address, phone, and payout details are locked for account safety. Send a support request with the reason if anything must change.";

  const renderSectionHeader = (title: string, hint?: string) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>{title}</Text>
      {hint ? <Text style={[styles.sectionHint, isDarkMode && styles.mutedTextDark]}>{hint}</Text> : null}
    </View>
  );

  const renderImageSlot = (
    label: string,
    url: string,
    onUpload: () => void,
    aspect: "logo" | "banner" = "logo",
    slotKey?: string
  ) => {
    const isBusy = uploadingKey === slotKey;
    return (
      <View style={styles.imageSlot}>
        <View style={styles.imageSlotHeader}>
          <Text style={styles.imageSlotLabel}>{label}</Text>
          <TouchableOpacity onPress={onUpload} disabled={pickerBusy || saving || isBusy}>
            <Text style={styles.linkText}>{isBusy ? "Uploading..." : url ? "Replace" : "Upload"}</Text>
          </TouchableOpacity>
        </View>
        {url ? (
          <Image source={{ uri: url }} style={aspect === "banner" ? styles.bannerPreview : styles.logoPreview} />
        ) : (
          <TouchableOpacity
            style={aspect === "banner" ? styles.bannerPlaceholder : styles.logoPlaceholder}
            onPress={onUpload}
            disabled={pickerBusy || saving || isBusy}
          >
            {isBusy ? (
              <ActivityIndicator color="#60A5FA" />
            ) : (
              <>
                <Ionicons name="image-outline" size={22} color="#60A5FA" />
                <Text style={styles.placeholderHint}>Tap to upload</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderKycField = (
    field: keyof Documents,
    label: string,
    options: { mask?: boolean; keyboardType?: "default" | "number-pad" | "email-address"; placeholder?: string; maxLength?: number } = {}
  ) => {
    const raw = (kyc[field] as string) || "";
    const hasValue = raw.trim().length > 0;
    const isEditing = kycEditingField === field;
    const display = options.mask ? maskValue(raw, 4) : raw;
    const showVerified = hasValue;
    const locked = verificationDetailsLocked && hasValue;

    return (
      <View style={styles.kycField} key={field as string}>
        <View style={styles.kycFieldHeader}>
          <Text style={styles.kycFieldLabel}>{label}</Text>
          {showVerified ? (
            <View style={[styles.docBadge, styles.docBadgeVerified]}>
              <Ionicons name="checkmark-circle" size={12} color="#0E8A4A" style={{ marginRight: 4 }} />
              <Text style={[styles.docBadgeText, styles.docBadgeVerifiedText]}>Verified</Text>
            </View>
          ) : (
            <View style={[styles.docBadge, styles.docBadgeMissing]}>
              <Text style={[styles.docBadgeText, styles.docBadgeMissingText]}>Incomplete</Text>
            </View>
          )}
        </View>

        {isEditing ? (
          <>
            <TextInput
              style={styles.kycEditInput}
              value={kycDraftValue}
              onChangeText={(text) => setKycDraftValue(sanitizeKycValue(field, text))}
              placeholder={options.placeholder || label}
              placeholderTextColor="#98A2B3"
              keyboardType={options.keyboardType || "default"}
              maxLength={options.maxLength}
              autoCapitalize={field === "panNumber" || field === "bankIfsc" ? "characters" : "sentences"}
            />
            <View style={styles.kycEditButtonRow}>
              <TouchableOpacity style={styles.kycCancelButton} onPress={cancelEditKycField} disabled={saving}>
                <Text style={styles.kycCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.kycSaveButton} onPress={() => commitKycField(field)} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.kycSaveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={hasValue ? styles.kycFieldValue : styles.kycFieldValueEmpty}>
              {hasValue ? display : "Not provided yet - add this to complete profile"}
            </Text>
            <View style={styles.kycFieldActions}>
              {locked ? (
                <Text style={styles.fieldLockText}>Locked after verification</Text>
              ) : (
                <TouchableOpacity
                  style={styles.docActionGhost}
                  onPress={() => startEditKycField(field)}
                  disabled={saving}
                >
                  <Text style={styles.docActionGhostText}>{hasValue ? "Change" : "Add"}</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
    );
  };

  const renderDocumentRow = (doc: { key: DocumentKey; title: string; subtitle: string; mandatory?: boolean }) => {
    const url = kyc[doc.key] as string | undefined;
    const isBusy = uploadingKey === `doc:${doc.key}`;
    const reuploadRequested = Boolean(kyc.reuploadFlags?.[doc.key]);
    const hasFile = Boolean(url);
    const locked = verificationDetailsLocked && hasFile && !reuploadRequested;

    let badgeStyle: any = styles.docBadgeVerified;
    let badgeTextStyle: any = styles.docBadgeVerifiedText;
    let badgeLabel = "Verified";
    let statusLine = locked ? "Verified and locked after approval" : "Submitted during registration";
    let actionLabel = "Change";
    let actionStyle: any = styles.docActionGhost;
    let actionTextStyle: any = styles.docActionGhostText;

    if (reuploadRequested) {
      badgeStyle = styles.docBadgeReupload;
      badgeTextStyle = styles.docBadgeReuploadText;
      badgeLabel = "Re-upload required";
      statusLine = "Admin asked you to re-upload this document";
      actionLabel = hasFile ? "Re-upload" : "Upload";
      actionStyle = styles.docActionPrimary;
      actionTextStyle = styles.docActionPrimaryText;
    } else if (!hasFile) {
      if (doc.mandatory) {
        badgeStyle = styles.docBadgeMissing;
        badgeTextStyle = styles.docBadgeMissingText;
        badgeLabel = "Incomplete";
        statusLine = "Please upload to complete profile";
        actionLabel = "Upload";
        actionStyle = styles.docActionPrimary;
        actionTextStyle = styles.docActionPrimaryText;
      } else {
        badgeStyle = styles.docBadgeOptional;
        badgeTextStyle = styles.docBadgeOptionalText;
        badgeLabel = "Optional";
        statusLine = doc.subtitle;
        actionLabel = "Add";
      }
    }

    return (
      <View style={[styles.documentRow, reuploadRequested && styles.documentRowAlert]} key={doc.key}>
        <View style={styles.documentCopy}>
          <View style={styles.documentTitleRow}>
            <Text style={styles.documentTitle}>{doc.title}</Text>
            <View style={[styles.docBadge, badgeStyle]}>
              {badgeLabel === "Verified" ? (
                <Ionicons name="checkmark-circle" size={12} color="#0E8A4A" style={{ marginRight: 4 }} />
              ) : null}
              <Text style={[styles.docBadgeText, badgeTextStyle]}>{badgeLabel}</Text>
            </View>
          </View>
          <Text style={styles.documentStatus} numberOfLines={2}>
            {isBusy ? "Uploading..." : statusLine}
          </Text>
        </View>
        {hasFile ? (
          <TouchableOpacity style={styles.documentLinkButton} onPress={() => Linking.openURL(url as string)}>
            <Text style={styles.documentLinkText}>View</Text>
          </TouchableOpacity>
        ) : null}
        {locked ? (
          <Text style={styles.fieldLockText}>Locked</Text>
        ) : (
          <TouchableOpacity
            style={actionStyle}
            onPress={() =>
              uploadAndSave(`doc:${doc.key}`, async (uploadedUrl) => {
                const nextDocs: Documents = {
                  ...kyc,
                  [doc.key]: uploadedUrl,
                  reuploadFlags: { ...(kyc.reuploadFlags || {}), [doc.key]: false }
                };
                setKyc(nextDocs);
                await saveUpdate({ documents: nextDocs });
              })
            }
            disabled={pickerBusy || saving || Boolean(uploadingKey)}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color={reuploadRequested ? "#FFFFFF" : "#60A5FA"} />
            ) : (
              <Text style={actionTextStyle}>{actionLabel}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderTimeCard = (field: TimeField, label: string) => {
    const selected = activeTimeField === field;
    return (
      <TouchableOpacity
        style={[styles.timeCard, selected && styles.timeCardSelected]}
        onPress={() => setActiveTimeField(field)}
      >
        <Text style={[styles.timeCardLabel, selected && styles.timeCardLabelSelected]}>{label}</Text>
        <Text style={[styles.timeCardValue, selected && styles.timeCardValueSelected]}>
          {formatTwelveHourTime(hours[field])}
        </Text>
        <Text style={[styles.timeCardHint, selected && styles.timeCardHintSelected]}>
          Tap to select
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTimePicker = () => {
    const current = parseTimeToTwelveHour(hours[activeTimeField]);
    const activeLabel = activeTimeField === "openingTime" ? "Opening time" : "Closing time";

    return (
      <View style={styles.timePickerPanel}>
        <View style={styles.timePickerHeader}>
          <Text style={styles.timePickerTitle}>{activeLabel}</Text>
          <Text style={styles.timePickerValue}>{formatTwelveHourTime(hours[activeTimeField])}</Text>
        </View>

        <Text style={styles.timePickerLabel}>Hour</Text>
        <View style={styles.timeOptionRow}>
          {HOURS_12.map((hour) => {
            const selected = current.hour === hour;
            return (
              <TouchableOpacity
                key={hour}
                style={[styles.timeOptionChip, selected && styles.timeOptionChipSelected]}
                onPress={() => updateTimePart(activeTimeField, { hour })}
              >
                <Text style={[styles.timeOptionText, selected && styles.timeOptionTextSelected]}>{hour}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.timePickerLabel}>Minutes</Text>
        <View style={styles.timeOptionRow}>
          {MINUTE_OPTIONS.map((minute) => {
            const selected = current.minute === minute;
            return (
              <TouchableOpacity
                key={minute}
                style={[styles.timeOptionChip, selected && styles.timeOptionChipSelected]}
                onPress={() => updateTimePart(activeTimeField, { minute })}
              >
                <Text style={[styles.timeOptionText, selected && styles.timeOptionTextSelected]}>{minute}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.timePickerLabel}>AM / PM</Text>
        <View style={styles.periodRow}>
          {PERIOD_OPTIONS.map((period) => {
            const selected = current.period === period;
            return (
              <TouchableOpacity
                key={period}
                style={[styles.periodChip, selected && styles.timeOptionChipSelected]}
                onPress={() => updateTimePart(activeTimeField, { period })}
              >
                <Text style={[styles.periodText, selected && styles.timeOptionTextSelected]}>{period}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const isGstRegistered = kyc.gstRegistered === true || kyc.gstRegistered === "true" || kyc.gstRegistered === "yes";

  return (
    <View style={[styles.safeAreaScreen, isDarkMode && styles.safeAreaScreenDark]}>
      <ScrollView
        style={[styles.container, isDarkMode && styles.safeAreaScreenDark]}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: insets.bottom + 36 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.heroAvatarWrap}>
              {images.shopImageUrl ? (
                <Image source={{ uri: images.shopImageUrl }} style={styles.heroAvatar} />
              ) : (
                <View style={[styles.heroAvatar, styles.heroAvatarPlaceholder]}>
                  <Ionicons name="storefront" size={26} color="#60A5FA" />
                </View>
              )}
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>Partner Profile</Text>
              <Text style={styles.heroTitle} numberOfLines={1}>
                {profile.restaurantName}
              </Text>
              <Text style={styles.heroSubtitle}>
                {CATEGORY_LABELS[profile.category] || profile.category} • {profile.status}
              </Text>
            </View>
          </View>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{profile.menuItemsCount || 0}</Text>
              <Text style={styles.heroStatLabel}>Menu items</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{hours.isOpen ? "Open" : "Closed"}</Text>
              <Text style={styles.heroStatLabel}>Shop status</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{profile.settings?.deliveryRadiusKm ?? 3}km</Text>
              <Text style={styles.heroStatLabel}>Delivery</Text>
            </View>
          </View>
        </View>

      {!profileCompletion.isComplete ? (
        <View style={styles.completionBanner}>
          <Ionicons name="alert-circle" size={18} color="#8A5A00" />
          <View style={styles.completionBannerCopy}>
            <Text style={styles.completionBannerTitle}>Profile incomplete</Text>
            <Text style={styles.completionBannerText}>
              Add {profileCompletion.missing.slice(0, 3).join(", ")}
              {profileCompletion.missing.length > 3 ? ` and ${profileCompletion.missing.length - 3} more item${profileCompletion.missing.length - 3 === 1 ? "" : "s"}` : ""}.
            </Text>
          </View>
        </View>
      ) : null}

      {/* Basic Shop Details */}
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        {renderSectionHeader(
          "Basic Shop Details",
          verificationDetailsLocked ? "Verified identity and contact details are locked after approval." : "Shop name and phone stay fixed after registration."
        )}
        {verificationDetailsLocked ? (
          <View style={styles.lockedNotice}>
            <Ionicons name="lock-closed-outline" size={18} color="#1D4E89" />
            <View style={styles.lockedNoticeCopy}>
              <Text style={styles.lockedNoticeTitle}>Verified details protected</Text>
              <Text style={styles.lockedNoticeText}>{lockedDetailsCopy}</Text>
            </View>
          </View>
        ) : null}
        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyLabel}>Shop name</Text>
          <Text style={styles.readOnlyValue}>{profile.restaurantName}</Text>
        </View>
        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyLabel}>Phone number</Text>
          <Text style={styles.readOnlyValue}>{profile.phone}</Text>
        </View>
        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyLabel}>Category</Text>
          <Text style={styles.readOnlyValue}>{CATEGORY_LABELS[profile.category] || profile.category}</Text>
        </View>

        {verificationDetailsLocked ? (
          <>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyLabel}>Owner name</Text>
              <Text style={styles.readOnlyValue}>{basics.ownerName || "Not provided"}</Text>
            </View>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyLabel}>Email</Text>
              <Text style={styles.readOnlyValue}>{basics.email || "Not provided"}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.label}>Owner name</Text>
            <TextInput
              style={styles.input}
              placeholder="Owner name"
              placeholderTextColor="#98A2B3"
              value={basics.ownerName}
              onChangeText={(text) => setBasics({ ...basics, ownerName: text })}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Business email"
              placeholderTextColor="#98A2B3"
              value={basics.email}
              onChangeText={(text) => setBasics({ ...basics, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </>
        )}

        <Text style={styles.label}>Shop description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell customers about your shop, signature items, opening days..."
          placeholderTextColor="#98A2B3"
          value={basics.shopDescription}
          onChangeText={(text) => setBasics({ ...basics, shopDescription: text })}
          multiline
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleSaveBasics} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>{verificationDetailsLocked ? "Save shop description" : "Save basics"}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Address & Location */}
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        {renderSectionHeader(
          "Address & Location",
          verificationDetailsLocked ? "Verified shop address changes require support review." : "Customers within your delivery radius rely on these coordinates."
        )}
        {verificationDetailsLocked ? (
          <View style={styles.lockedNotice}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#1D4E89" />
            <View style={styles.lockedNoticeCopy}>
              <Text style={styles.lockedNoticeTitle}>Address locked after verification</Text>
              <Text style={styles.lockedNoticeText}>
                This protects customer trust, tax records, and payout review. Contact support with your reason to move the shop location.
              </Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.label}>Road / street</Text>
        <TextInput
          style={[styles.input, verificationDetailsLocked && styles.inputDisabled]}
          placeholder="Road / street"
          placeholderTextColor="#98A2B3"
          value={address.roadStreet}
          onChangeText={(text) => setAddress({ ...address, roadStreet: text })}
          editable={!verificationDetailsLocked}
        />

        <Text style={styles.label}>Colony / society</Text>
        <TextInput
          style={[styles.input, verificationDetailsLocked && styles.inputDisabled]}
          placeholder="Colony or society"
          placeholderTextColor="#98A2B3"
          value={address.colony}
          onChangeText={(text) => setAddress({ ...address, colony: text })}
          editable={!verificationDetailsLocked}
        />

        <Text style={styles.label}>Area / locality</Text>
        <TextInput
          style={[styles.input, verificationDetailsLocked && styles.inputDisabled]}
          placeholder="Area or locality"
          placeholderTextColor="#98A2B3"
          value={address.area}
          onChangeText={(text) => setAddress({ ...address, area: text })}
          editable={!verificationDetailsLocked}
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={[styles.input, verificationDetailsLocked && styles.inputDisabled]}
              placeholder="City"
              placeholderTextColor="#98A2B3"
              value={address.city}
              onChangeText={(text) => setAddress({ ...address, city: text })}
              editable={!verificationDetailsLocked}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={[styles.input, verificationDetailsLocked && styles.inputDisabled]}
              placeholder="State"
              placeholderTextColor="#98A2B3"
              value={address.state}
              onChangeText={(text) => setAddress({ ...address, state: text })}
              editable={!verificationDetailsLocked}
            />
          </View>
        </View>

        <Text style={styles.label}>Pincode</Text>
        <TextInput
          style={[styles.input, verificationDetailsLocked && styles.inputDisabled]}
          placeholder="6-digit pincode"
          placeholderTextColor="#98A2B3"
          value={address.pincode}
          onChangeText={(text) => setAddress({ ...address, pincode: text.replace(/\D/g, "") })}
          keyboardType="number-pad"
          maxLength={6}
          editable={!verificationDetailsLocked}
        />

        <Text style={styles.label}>Landmark / nearby places</Text>
        <TextInput
          style={[styles.input, verificationDetailsLocked && styles.inputDisabled]}
          placeholder="Eg. Beside SBI ATM, opposite KFC"
          placeholderTextColor="#98A2B3"
          value={address.landmark}
          onChangeText={(text) => setAddress({ ...address, landmark: text })}
          editable={!verificationDetailsLocked}
        />

        <Text style={styles.label}>Google Maps link</Text>
        <TextInput
          style={[styles.input, verificationDetailsLocked && styles.inputDisabled]}
          placeholder="Paste shop Google Maps link"
          placeholderTextColor="#98A2B3"
          value={address.googleMapsLink}
          onChangeText={(text) => setAddress({ ...address, googleMapsLink: text })}
          autoCapitalize="none"
          editable={!verificationDetailsLocked}
        />

        <View style={styles.inlineActions}>
          <TouchableOpacity style={styles.utilityButton} onPress={() => Linking.openURL("https://maps.google.com")}>
            <Text style={styles.utilityButtonText}>Open Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.utilityButton}
            onPress={() => {
              if (address.googleMapsLink) {
                Linking.openURL(address.googleMapsLink).catch(() => Alert.alert("Error", "Could not open link"));
              }
            }}
          >
            <Text style={styles.utilityButtonText}>Test link</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>Latitude / longitude</Text>
          <Text style={styles.detailValue}>{coordinateText}</Text>
        </View>

        <TouchableOpacity
          style={[styles.secondaryButton, verificationDetailsLocked && styles.secondaryButtonDisabled]}
          onPress={captureShopLocation}
          disabled={saving || capturingLocation || verificationDetailsLocked}
        >
          {capturingLocation ? (
            <ActivityIndicator color="#60A5FA" />
          ) : (
            <Text style={styles.secondaryButtonText}>
              {capturedLocation ? "Re-capture shop GPS pin" : "Use current shop GPS pin"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, verificationDetailsLocked && styles.primaryButtonDisabled]}
          onPress={handleSaveAddress}
          disabled={saving || verificationDetailsLocked}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Save address</Text>}
        </TouchableOpacity>
      </View>

      {/* Store Images */}
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        {renderSectionHeader("Store Images", "Logo, banner, and food/product photos shown to customers.")}

        {renderImageSlot(
          "Shop logo",
          images.shopImageUrl,
          () =>
            uploadAndSave("logo", async (uploadedUrl) => {
              setImages((prev) => ({ ...prev, shopImageUrl: uploadedUrl }));
              await saveUpdate({ shopImageUrl: uploadedUrl });
            }),
          "logo",
          "logo"
        )}

        {renderImageSlot(
          "Banner image",
          images.bannerImageUrl,
          () =>
            uploadAndSave("banner", async (uploadedUrl) => {
              setImages((prev) => ({ ...prev, bannerImageUrl: uploadedUrl }));
              await saveUpdate({ bannerImageUrl: uploadedUrl });
            }),
          "banner",
          "banner"
        )}

        <View style={styles.imageSlotHeader}>
          <Text style={styles.imageSlotLabel}>Food / product photos</Text>
          <TouchableOpacity
            disabled={pickerBusy || saving || Boolean(uploadingKey)}
            onPress={() =>
              uploadAndSave("restaurantPhoto", async (uploadedUrl) => {
                const nextPhotos = [...images.restaurantPhotosUrls, uploadedUrl];
                setImages((prev) => ({ ...prev, restaurantPhotosUrls: nextPhotos }));
                await saveUpdate({
                  documents: { ...kyc, restaurantPhotosUrls: nextPhotos }
                });
              })
            }
          >
            <Text style={styles.linkText}>{uploadingKey === "restaurantPhoto" ? "Uploading..." : "Add photo"}</Text>
          </TouchableOpacity>
        </View>
        {images.restaurantPhotosUrls.length ? (
          <View style={styles.photoGrid}>
            {images.restaurantPhotosUrls.map((url, index) => (
              <View style={styles.photoThumbWrap} key={`${url}-${index}`}>
                <Image source={{ uri: url }} style={styles.photoThumb} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={async () => {
                    const next = images.restaurantPhotosUrls.filter((_, i) => i !== index);
                    setImages((prev) => ({ ...prev, restaurantPhotosUrls: next }));
                    await saveUpdate({ documents: { ...kyc, restaurantPhotosUrls: next } });
                  }}
                  disabled={saving}
                >
                  <Text style={styles.removePhotoText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.helperText}>Add at least 3 photos of your bestsellers for higher conversion.</Text>
        )}
      </View>

      {/* Business Hours */}
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        {renderSectionHeader("Business Hours", "Select opening hours in 12-hour AM/PM format and set weekly off days.")}

        <View style={styles.row}>
          <View style={styles.half}>
            {renderTimeCard("openingTime", "Opening time")}
          </View>
          <View style={styles.half}>
            {renderTimeCard("closingTime", "Closing time")}
          </View>
        </View>

        {renderTimePicker()}

        <Text style={styles.label}>Weekly holidays</Text>
        <View style={styles.pillRow}>
          {WEEK_DAYS.map((day) => {
            const selected = hours.weeklyHolidays.includes(day);
            return (
              <TouchableOpacity
                key={day}
                style={[styles.dayPill, selected && styles.dayPillSelected]}
                onPress={() => toggleWeeklyHoliday(day)}
              >
                <Text style={[styles.dayPillText, selected && styles.dayPillTextSelected]}>{day}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleSaveHours} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Save hours</Text>}
        </TouchableOpacity>
      </View>

      {/* KYC / Verification */}
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        {renderSectionHeader(
          "KYC / Verification",
          verificationDetailsLocked
            ? "All verified document details are locked. Re-upload is available only when admin requests it."
            : profileCompletion.isComplete
            ? "All required registration details are on file."
            : "Some required details are incomplete. Add the missing document details here."
        )}

        {kyc.reuploadNotes ? (
          <View style={styles.reuploadBanner}>
            <Ionicons name="alert-circle" size={18} color="#B83A20" />
            <Text style={styles.reuploadBannerText}>
              {`Admin note: ${kyc.reuploadNotes}`}
            </Text>
          </View>
        ) : null}

        {renderKycField("fssaiNumber", "FSSAI number", {
          mask: true,
          keyboardType: "number-pad",
          placeholder: "14-digit FSSAI license number",
          maxLength: 14
        })}
        {renderKycField("panNumber", "PAN number", {
          mask: true,
          placeholder: "ABCDE1234F",
          maxLength: 10
        })}
        {renderKycField("aadhaarNumber", "Aadhaar number", {
          mask: true,
          keyboardType: "number-pad",
          placeholder: "12-digit Aadhaar",
          maxLength: 12
        })}
        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>GST registered</Text>
          <Text style={styles.detailValue}>
            {isGstRegistered ? "Yes" : "No"}
          </Text>
        </View>
        {isGstRegistered
          ? renderKycField("gstNumber", "GSTIN", {
              placeholder: "15-character GSTIN",
              maxLength: 15
            })
          : null}

        <Text style={styles.subsectionTitle}>Documents</Text>
        {DOCUMENT_UPLOADS
          .filter((doc) => doc.key !== "gstUrl" || isGstRegistered)
          .map((doc) => renderDocumentRow(doc.key === "gstUrl" ? { ...doc, mandatory: true } : doc))}
      </View>

      {/* Menu Management */}
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        {renderSectionHeader("Menu Management", "Add dishes, set prices, mark veg/non-veg, and manage stock.")}
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.menuItemsCount || 0}</Text>
            <Text style={styles.statLabel}>Total items</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.hasCompletedSetup ? "Yes" : "No"}</Text>
            <Text style={styles.statLabel}>Setup complete</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("Menu")}>
          <Text style={styles.primaryButtonText}>Open Menu Manager</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        {renderSectionHeader(
          "Payments",
          verificationDetailsLocked
            ? "Payout details are private. Account changes require a support review."
            : "Add payout details before verification. Account numbers stay hidden on screen."
        )}
        <View style={styles.payoutSummaryCard}>
          <View style={styles.payoutIconCircle}>
            <Ionicons name="card-outline" size={20} color="#1D4E89" />
          </View>
          <View style={styles.payoutSummaryCopy}>
            <Text style={styles.payoutSummaryTitle}>{bankDetails.accountHolderName || "Payout account"}</Text>
            <Text style={styles.payoutSummaryMeta}>{maskBankAccountNumber(bankDetails.accountNumber)}</Text>
            <Text style={styles.payoutSummaryMeta}>IFSC {bankDetails.ifsc || "not added"}</Text>
          </View>
        </View>

        {verificationDetailsLocked ? (
          <>
            <View style={styles.lockedNotice}>
              <Ionicons name="lock-closed-outline" size={18} color="#1D4E89" />
              <View style={styles.lockedNoticeCopy}>
                <Text style={styles.lockedNoticeTitle}>Bank account changes need review</Text>
                <Text style={styles.lockedNoticeText}>
                  Share the reason for change. Support will verify it before updating payout details.
                </Text>
              </View>
            </View>
            <Text style={styles.label}>Reason for bank account change</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Example: Bank account closed, wrong account submitted, ownership change..."
              placeholderTextColor="#98A2B3"
              value={bankChangeRequestReason}
              onChangeText={setBankChangeRequestReason}
              multiline
            />
            <TouchableOpacity
              style={[styles.primaryButton, bankChangeRequestSubmitting && styles.primaryButtonDisabled]}
              onPress={submitBankChangeRequest}
              disabled={bankChangeRequestSubmitting}
            >
              {bankChangeRequestSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Send change request</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Account holder name</Text>
            <TextInput
              style={styles.input}
              placeholder="Name as per bank account"
              placeholderTextColor="#98A2B3"
              value={bankDetails.accountHolderName}
              onChangeText={(text) => setBankDetails((prev) => ({ ...prev, accountHolderName: text }))}
            />
            <Text style={styles.label}>Account number</Text>
            <TextInput
              style={styles.input}
              placeholder="Bank account number"
              placeholderTextColor="#98A2B3"
              value={bankDetails.accountNumber}
              onChangeText={(text) => setBankDetails((prev) => ({ ...prev, accountNumber: text.replace(/\D/g, "").slice(0, 20) }))}
              keyboardType="number-pad"
              secureTextEntry
            />
            <Text style={styles.label}>IFSC code</Text>
            <TextInput
              style={styles.input}
              placeholder="ABCD0123456"
              placeholderTextColor="#98A2B3"
              value={bankDetails.ifsc}
              onChangeText={(text) =>
                setBankDetails((prev) => ({ ...prev, ifsc: text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11) }))
              }
              autoCapitalize="characters"
              maxLength={11}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleSaveBankDetails} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Save bank details</Text>}
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate("PaymentHistory")}>
          <View style={styles.linkRowLeft}>
            <View style={[styles.linkIconCircle, { backgroundColor: "#EAF3FF" }]}>
              <Ionicons name="wallet-outline" size={18} color="#60A5FA" />
            </View>
            <Text style={styles.linkRowText}>Payment history</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8AA4C2" />
        </TouchableOpacity>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeAreaScreen: {
    flex: 1,
    backgroundColor: "#F4F8FF"
  },
  safeAreaScreenDark: {
    backgroundColor: "#0B1220"
  },
  cardDark: {
    backgroundColor: "#111827",
    borderColor: "#263449"
  },
  textDark: {
    color: "#E5EDF7"
  },
  mutedTextDark: {
    color: "#9FB0C5"
  },
  container: {
    flex: 1,
    backgroundColor: "#F4F8FF"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F8FF"
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#5E7897"
  },
  hero: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#60A5FA",
    borderRadius: 22,
    padding: 18
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  heroAvatarWrap: {
    marginRight: 12
  },
  heroAvatar: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#EAF3FF"
  },
  heroAvatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center"
  },
  heroCopy: {
    flex: 1
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#DDEBFF"
  },
  heroTitle: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#EAF3FF"
  },
  heroStatsRow: {
    flexDirection: "row",
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 10
  },
  heroStat: {
    flex: 1,
    alignItems: "center"
  },
  heroStatValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  heroStatLabel: {
    marginTop: 2,
    fontSize: 11,
    color: "#DDEBFF"
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#D9E6F7",
    padding: 16
  },
  completionBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#FFF8E8",
    borderColor: "#F5D48B",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14
  },
  completionBannerCopy: {
    flex: 1,
    marginLeft: 10
  },
  completionBannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#7A4F00"
  },
  completionBannerText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: "#7A4F00"
  },
  sectionHeader: {
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#143A66"
  },
  sectionHint: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#5E7897"
  },
  subsectionTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "800",
    color: "#143A66"
  },
  readOnlyField: {
    backgroundColor: "#F9FCFF",
    borderWidth: 1,
    borderColor: "#D9E6F7",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10
  },
  readOnlyLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5E7897",
    textTransform: "uppercase",
    marginBottom: 4
  },
  readOnlyValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#143A66"
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#486887",
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: "#CFE0F5",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#123456",
    backgroundColor: "#F9FCFF",
    marginBottom: 12
  },
  inputDisabled: {
    backgroundColor: "#EEF4FB",
    color: "#5E7897"
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: "top"
  },
  timeCard: {
    backgroundColor: "#F9FCFF",
    borderWidth: 1,
    borderColor: "#CFE0F5",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12
  },
  timeCardSelected: {
    backgroundColor: "#EAF3FF",
    borderColor: "#60A5FA"
  },
  timeCardLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#5E7897",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  timeCardLabelSelected: {
    color: "#1D4E89"
  },
  timeCardValue: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: "900",
    color: "#143A66"
  },
  timeCardValueSelected: {
    color: "#1D4E89"
  },
  timeCardHint: {
    marginTop: 3,
    fontSize: 11,
    color: "#8FA3BD",
    fontWeight: "700"
  },
  timeCardHintSelected: {
    color: "#60A5FA"
  },
  timePickerPanel: {
    backgroundColor: "#F9FCFF",
    borderWidth: 1,
    borderColor: "#D9E6F7",
    borderRadius: 18,
    padding: 12,
    marginBottom: 14
  },
  timePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  timePickerTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#143A66"
  },
  timePickerValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#60A5FA"
  },
  timePickerLabel: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 11,
    fontWeight: "800",
    color: "#5E7897",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  timeOptionRow: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  timeOptionChip: {
    minWidth: 42,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CFE0F5",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginRight: 7,
    marginBottom: 7
  },
  timeOptionChipSelected: {
    backgroundColor: "#60A5FA",
    borderColor: "#60A5FA"
  },
  timeOptionText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#44678E"
  },
  timeOptionTextSelected: {
    color: "#FFFFFF"
  },
  periodRow: {
    flexDirection: "row"
  },
  periodChip: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CFE0F5",
    borderRadius: 14,
    paddingVertical: 11,
    marginRight: 8
  },
  periodText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#44678E"
  },
  row: {
    flexDirection: "row"
  },
  half: {
    flex: 1,
    marginRight: 10
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginBottom: 8
  },
  switchCopy: {
    flex: 1,
    marginRight: 12
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#143A66"
  },
  helperText: {
    marginTop: 2,
    fontSize: 12,
    color: "#5E7897"
  },
  primaryButton: {
    backgroundColor: "#60A5FA",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4
  },
  primaryButtonDisabled: {
    backgroundColor: "#9FC8FF"
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: "#EAF3FF",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 13
  },
  secondaryButtonDisabled: {
    backgroundColor: "#EEF4FB"
  },
  secondaryButtonText: {
    color: "#60A5FA",
    fontSize: 14,
    fontWeight: "800"
  },
  dangerButton: {
    backgroundColor: "#FDECEC"
  },
  dangerText: {
    color: "#B42318"
  },
  utilityButton: {
    backgroundColor: "#EAF3FF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8
  },
  utilityButtonText: {
    color: "#60A5FA",
    fontSize: 13,
    fontWeight: "700"
  },
  inlineActions: {
    flexDirection: "row",
    marginBottom: 12
  },
  detailBlock: {
    backgroundColor: "#F9FCFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#5E7897",
    marginBottom: 4
  },
  detailValue: {
    fontSize: 14,
    color: "#143A66",
    fontWeight: "700"
  },
  lockedNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EEF6FF",
    borderWidth: 1,
    borderColor: "#CFE0F5",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12
  },
  lockedNoticeCopy: {
    flex: 1,
    marginLeft: 10
  },
  lockedNoticeTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#143A66"
  },
  lockedNoticeText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: "#355877"
  },
  imageSlot: {
    marginBottom: 14
  },
  imageSlotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  imageSlotLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#143A66"
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#60A5FA"
  },
  logoPreview: {
    width: 120,
    height: 120,
    borderRadius: 18,
    backgroundColor: "#EAF3FF"
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 18,
    backgroundColor: "#F0F6FF",
    borderWidth: 1,
    borderColor: "#D9E6F7",
    justifyContent: "center",
    alignItems: "center"
  },
  bannerPreview: {
    width: "100%",
    height: 130,
    borderRadius: 18,
    backgroundColor: "#EAF3FF"
  },
  bannerPlaceholder: {
    width: "100%",
    height: 130,
    borderRadius: 18,
    backgroundColor: "#F0F6FF",
    borderWidth: 1,
    borderColor: "#D9E6F7",
    justifyContent: "center",
    alignItems: "center"
  },
  placeholderHint: {
    marginTop: 6,
    fontSize: 12,
    color: "#5E7897"
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4
  },
  photoThumbWrap: {
    marginRight: 8,
    marginBottom: 10,
    alignItems: "center"
  },
  photoThumb: {
    width: 86,
    height: 86,
    borderRadius: 14,
    backgroundColor: "#EAF3FF"
  },
  removePhotoButton: {
    marginTop: 6,
    backgroundColor: "#FDECEC",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  removePhotoText: {
    color: "#B42318",
    fontSize: 11,
    fontWeight: "800"
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12
  },
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#EAF3FF",
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8
  },
  dayPillSelected: {
    backgroundColor: "#60A5FA"
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#44678E"
  },
  dayPillTextSelected: {
    color: "#FFFFFF"
  },
  choicePill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "#EAF3FF",
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8
  },
  choicePillSelected: {
    backgroundColor: "#60A5FA"
  },
  choicePillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#44678E"
  },
  choicePillTextSelected: {
    color: "#FFFFFF"
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FCFF",
    borderWidth: 1,
    borderColor: "#D9E6F7",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8
  },
  documentCopy: {
    flex: 1,
    marginRight: 10
  },
  documentTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#143A66",
    marginBottom: 3
  },
  documentStatus: {
    fontSize: 12,
    color: "#5E7897"
  },
  documentLinkButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6
  },
  documentLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#60A5FA"
  },
  smallUploadButton: {
    backgroundColor: "#EAF3FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 70,
    alignItems: "center"
  },
  smallUploadText: {
    color: "#60A5FA",
    fontSize: 12,
    fontWeight: "800"
  },
  documentRowAlert: {
    backgroundColor: "#FFF4F2",
    borderColor: "#F5B7AE"
  },
  documentTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 4
  },
  docBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginLeft: 8
  },
  docBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2
  },
  docBadgeVerified: {
    backgroundColor: "#E6F7EE"
  },
  docBadgeVerifiedText: {
    color: "#0E8A4A"
  },
  docBadgeReupload: {
    backgroundColor: "#FCE3DE"
  },
  docBadgeReuploadText: {
    color: "#B83A20"
  },
  docBadgeMissing: {
    backgroundColor: "#FFF1D6"
  },
  docBadgeMissingText: {
    color: "#8A5A00"
  },
  docBadgeOptional: {
    backgroundColor: "#EEF2F7"
  },
  docBadgeOptionalText: {
    color: "#5E7897"
  },
  docActionGhost: {
    backgroundColor: "#EAF3FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 78,
    alignItems: "center"
  },
  docActionGhostText: {
    color: "#60A5FA",
    fontSize: 12,
    fontWeight: "800"
  },
  docActionPrimary: {
    backgroundColor: "#D9382A",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 78,
    alignItems: "center"
  },
  docActionPrimaryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800"
  },
  reuploadBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF4F2",
    borderColor: "#F5B7AE",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12
  },
  reuploadBannerText: {
    flex: 1,
    marginLeft: 10,
    color: "#7A2316",
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 18
  },
  kycField: {
    backgroundColor: "#F9FCFF",
    borderWidth: 1,
    borderColor: "#D9E6F7",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8
  },
  kycFieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6
  },
  kycFieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#143A66",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  kycFieldValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2D3D",
    letterSpacing: 1
  },
  kycFieldValueEmpty: {
    fontSize: 13,
    color: "#8FA3BD",
    fontStyle: "italic"
  },
  kycFieldActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8
  },
  fieldLockText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#5E7897"
  },
  kycEditInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#C7D7EC",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1F2D3D",
    marginBottom: 8
  },
  kycEditButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  kycSaveButton: {
    backgroundColor: "#60A5FA",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginLeft: 8
  },
  kycSaveButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800"
  },
  kycCancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  kycCancelButtonText: {
    color: "#5E7897",
    fontSize: 12,
    fontWeight: "700"
  },
  statRow: {
    flexDirection: "row",
    marginBottom: 12
  },
  statItem: {
    flex: 1,
    backgroundColor: "#F9FCFF",
    borderRadius: 14,
    padding: 12,
    marginRight: 8
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#143A66"
  },
  statLabel: {
    marginTop: 2,
    fontSize: 12,
    color: "#5E7897"
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E6EEF9"
  },
  linkRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  linkIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10
  },
  linkRowText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#143A66"
  },
  payoutSummaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FCFF",
    borderWidth: 1,
    borderColor: "#D9E6F7",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12
  },
  payoutIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF3FF",
    marginRight: 12
  },
  payoutSummaryCopy: {
    flex: 1
  },
  payoutSummaryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#143A66",
    marginBottom: 3
  },
  payoutSummaryMeta: {
    fontSize: 12,
    color: "#5E7897",
    fontWeight: "700",
    marginTop: 2
  }
});
