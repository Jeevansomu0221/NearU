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
  Switch,
  Linking
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import api, { uploadMultipart } from "../api/client";

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
  { key: "aadhaarBackUrl", title: "Aadhaar back", subtitle: "Submitted during registration", mandatory: true },
  { key: "bankProofUrl", title: "Bank proof", subtitle: "Cancelled cheque / passbook / statement", mandatory: true },
  { key: "addressProofUrl", title: "Address proof", subtitle: "Utility bill or rental agreement", mandatory: true },
  { key: "gstUrl", title: "GST certificate", subtitle: "Optional - if registered" },
  { key: "shopLicenseUrl", title: "Shop & establishment license", subtitle: "Optional - if applicable" },
  { key: "ownerPanUrl", title: "Owner PAN copy", subtitle: "Optional secondary copy" },
  { key: "menuProofUrl", title: "Menu list / proof", subtitle: "Optional - speeds approval" }
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

export default function ProfileScreen({ navigation }: any) {
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

  const [kyc, setKyc] = useState<Documents>({});
  const [kycEditingField, setKycEditingField] = useState<keyof Documents | null>(null);
  const [kycDraftValue, setKycDraftValue] = useState("");

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
    setKyc(normalizeDocumentsFromApi(data.documents));
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

  const handleSaveBasics = () =>
    saveUpdate(
      {
        ownerName: basics.ownerName.trim(),
        email: basics.email.trim(),
        shopDescription: basics.shopDescription.trim()
      },
      "Basic shop details updated"
    );

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
    if (!address.roadStreet || !address.colony || !address.area || !address.city || !address.state) {
      Alert.alert("Missing details", "Fill all address fields before saving.");
      return;
    }
    if (!/^\d{6}$/.test(address.pincode)) {
      Alert.alert("Pincode", "Pincode must be exactly 6 digits.");
      return;
    }
    const [storedLng, storedLat] = profile?.location?.coordinates || [];
    const hasStoredLocation =
      typeof storedLat === "number" &&
      typeof storedLng === "number" &&
      !(storedLat === 0 && storedLng === 0);
    if (!capturedLocation && !hasStoredLocation && !address.googleMapsLink.trim()) {
      Alert.alert("Shop location", "Capture your shop GPS pin or add a Google Maps link so customers can locate you.");
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
        isOpen: hours.isOpen,
        weeklyHolidays: hours.weeklyHolidays
      },
      "Business hours updated"
    );
  };

  const handleSaveKyc = () =>
    saveUpdate({ documents: { ...kyc } }, "KYC details updated");

  const startEditKycField = (field: keyof Documents) => {
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

  if (loading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F80ED" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Profile not found</Text>
      </View>
    );
  }

  const renderSectionHeader = (title: string, hint?: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
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
              <ActivityIndicator color="#2F80ED" />
            ) : (
              <>
                <Ionicons name="image-outline" size={22} color="#2F80ED" />
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
    // Once the admin has APPROVED the partner, every submitted detail is considered verified.
    // We don't surface "Not on file" for approved partners — admin already validated their KYC.
    const isApproved = profile?.status === "APPROVED";
    const showVerified = hasValue || isApproved;

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
              <Text style={[styles.docBadgeText, styles.docBadgeMissingText]}>Not on file</Text>
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
              {hasValue ? display : isApproved ? "Submitted during registration" : "Not provided yet"}
            </Text>
            <View style={styles.kycFieldActions}>
              <TouchableOpacity
                style={styles.docActionGhost}
                onPress={() => startEditKycField(field)}
                disabled={saving}
              >
                <Text style={styles.docActionGhostText}>{hasValue || isApproved ? "Change" : "Add"}</Text>
              </TouchableOpacity>
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
    // Approved partners: treat every doc as Verified unless admin specifically asks to re-upload.
    const isApproved = profile?.status === "APPROVED";

    let badgeStyle: any = styles.docBadgeVerified;
    let badgeTextStyle: any = styles.docBadgeVerifiedText;
    let badgeLabel = "Verified";
    let statusLine = "Submitted during registration";
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
    } else if (!hasFile && !isApproved) {
      if (doc.mandatory) {
        badgeStyle = styles.docBadgeMissing;
        badgeTextStyle = styles.docBadgeMissingText;
        badgeLabel = "Not on file";
        statusLine = "Please upload to complete verification";
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
            <ActivityIndicator size="small" color={reuploadRequested ? "#FFFFFF" : "#2F80ED"} />
          ) : (
            <Text style={actionTextStyle}>{actionLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 36 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={styles.heroAvatarWrap}>
            {images.shopImageUrl ? (
              <Image source={{ uri: images.shopImageUrl }} style={styles.heroAvatar} />
            ) : (
              <View style={[styles.heroAvatar, styles.heroAvatarPlaceholder]}>
                <Ionicons name="storefront" size={26} color="#2F80ED" />
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

      {/* Basic Shop Details */}
      <View style={styles.card}>
        {renderSectionHeader("Basic Shop Details", "Shop name and phone stay fixed after registration.")}
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
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Save basics</Text>}
        </TouchableOpacity>
      </View>

      {/* Address & Location */}
      <View style={styles.card}>
        {renderSectionHeader("Address & Location", "Customers within your delivery radius rely on these coordinates.")}

        <Text style={styles.label}>Road / street</Text>
        <TextInput
          style={styles.input}
          placeholder="Road / street"
          placeholderTextColor="#98A2B3"
          value={address.roadStreet}
          onChangeText={(text) => setAddress({ ...address, roadStreet: text })}
        />

        <Text style={styles.label}>Colony / society</Text>
        <TextInput
          style={styles.input}
          placeholder="Colony or society"
          placeholderTextColor="#98A2B3"
          value={address.colony}
          onChangeText={(text) => setAddress({ ...address, colony: text })}
        />

        <Text style={styles.label}>Area / locality</Text>
        <TextInput
          style={styles.input}
          placeholder="Area or locality"
          placeholderTextColor="#98A2B3"
          value={address.area}
          onChangeText={(text) => setAddress({ ...address, area: text })}
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              placeholder="City"
              placeholderTextColor="#98A2B3"
              value={address.city}
              onChangeText={(text) => setAddress({ ...address, city: text })}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.input}
              placeholder="State"
              placeholderTextColor="#98A2B3"
              value={address.state}
              onChangeText={(text) => setAddress({ ...address, state: text })}
            />
          </View>
        </View>

        <Text style={styles.label}>Pincode</Text>
        <TextInput
          style={styles.input}
          placeholder="6-digit pincode"
          placeholderTextColor="#98A2B3"
          value={address.pincode}
          onChangeText={(text) => setAddress({ ...address, pincode: text.replace(/\D/g, "") })}
          keyboardType="number-pad"
          maxLength={6}
        />

        <Text style={styles.label}>Landmark / nearby places</Text>
        <TextInput
          style={styles.input}
          placeholder="Eg. Beside SBI ATM, opposite KFC"
          placeholderTextColor="#98A2B3"
          value={address.landmark}
          onChangeText={(text) => setAddress({ ...address, landmark: text })}
        />

        <Text style={styles.label}>Google Maps link</Text>
        <TextInput
          style={styles.input}
          placeholder="Paste shop Google Maps link"
          placeholderTextColor="#98A2B3"
          value={address.googleMapsLink}
          onChangeText={(text) => setAddress({ ...address, googleMapsLink: text })}
          autoCapitalize="none"
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

        <TouchableOpacity style={styles.secondaryButton} onPress={captureShopLocation} disabled={saving || capturingLocation}>
          {capturingLocation ? (
            <ActivityIndicator color="#2F80ED" />
          ) : (
            <Text style={styles.secondaryButtonText}>
              {capturedLocation ? "Re-capture shop GPS pin" : "Use current shop GPS pin"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={handleSaveAddress} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Save address</Text>}
        </TouchableOpacity>
      </View>

      {/* Store Images */}
      <View style={styles.card}>
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
      <View style={styles.card}>
        {renderSectionHeader("Business Hours", "Control daily opening hours and weekly off days.")}

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Opening time</Text>
            <TextInput
              style={styles.input}
              value={hours.openingTime}
              onChangeText={(text) => setHours({ ...hours, openingTime: text })}
              placeholder="08:00"
              placeholderTextColor="#98A2B3"
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Closing time</Text>
            <TextInput
              style={styles.input}
              value={hours.closingTime}
              onChangeText={(text) => setHours({ ...hours, closingTime: text })}
              placeholder="22:00"
              placeholderTextColor="#98A2B3"
            />
          </View>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Open for orders right now</Text>
          <Switch value={hours.isOpen} onValueChange={(value) => setHours({ ...hours, isOpen: value })} />
        </View>

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
      <View style={styles.card}>
        {renderSectionHeader(
          "KYC / Verification",
          profile.status === "APPROVED"
            ? "All your registration details are verified by our team. Tap Change to update anything."
            : "Your registration details are on file. Tap Change to update something."
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
        {renderKycField("bankAccountHolderName", "Bank account holder", {
          placeholder: "Name as per bank records"
        })}
        {renderKycField("bankAccountNumber", "Bank account number", {
          mask: true,
          keyboardType: "number-pad",
          placeholder: "Account number"
        })}
        {renderKycField("bankIfsc", "IFSC code", {
          placeholder: "IFSC code",
          maxLength: 11
        })}

        <Text style={styles.subsectionTitle}>Documents</Text>
        {DOCUMENT_UPLOADS.map(renderDocumentRow)}
      </View>

      {/* Menu Management */}
      <View style={styles.card}>
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

      <View style={styles.card}>
        {renderSectionHeader("App Settings", "Order, delivery, payout, and notification settings are in Settings screen.")}
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("Settings")}>
          <Text style={styles.primaryButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#2F80ED",
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
  textArea: {
    minHeight: 88,
    textAlignVertical: "top"
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
    backgroundColor: "#2F80ED",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4
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
  secondaryButtonText: {
    color: "#2F80ED",
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
    color: "#2F80ED",
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
    color: "#2F80ED"
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
    backgroundColor: "#2F80ED"
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
    backgroundColor: "#2F80ED"
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
    color: "#2F80ED"
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
    color: "#2F80ED",
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
    color: "#2F80ED",
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
    backgroundColor: "#2F80ED",
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
  linkRowText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#143A66"
  }
});
