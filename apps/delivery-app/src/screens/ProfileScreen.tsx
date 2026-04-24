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
import { resolveDeliveryRoute } from "../utils/deliveryStatus";

const DRAFT_KEY = "delivery_registration_draft_v2";
const STEPS = ["Basic", "Vehicle", "Documents", "Bank"] as const;
const VEHICLE_TYPES: DeliveryProfile["vehicleType"][] = ["Bike", "Scooter", "Motorcycle", "Cycle"];
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

const PDF_UPLOAD_FIELDS: UploadField[] = ["bankStatementUrl"];
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

const uploadAssetToServer = async (asset: UploadAsset, field: UploadField) => {
  const token = await AsyncStorage.getItem("token");
  if (!token) {
    throw new Error("Session expired. Please log in again.");
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

  let lastErrorMessage = "Upload failed";

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
        lastErrorMessage = responseData?.message || `Upload failed (${response.status})`;
        continue;
      }

      return responseData.data.url;
    } catch (error: any) {
      lastErrorMessage = error?.message || "Network Error";
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
  const [uploading, setUploading] = useState<UploadField | null>(null);
  const [profile, setProfile] = useState<DeliveryProfile | null>(null);
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddress());
  const [vehicleType, setVehicleType] = useState<DeliveryProfile["vehicleType"]>("Bike");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [documents, setDocuments] = useState<Docs>(emptyDocs());
  const formattedAddress = useMemo(() => buildAddressString(addressForm), [addressForm]);

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
    setAddressForm(parseAddressString(data.address || ""));
    setVehicleType(data.vehicleType || "Bike");
    setVehicleNumber(data.vehicleNumber || "");
    setLicenseNumber(data.licenseNumber || "");
    setProfilePhotoUrl(data.profilePhotoUrl || "");
    setIsAvailable(typeof data.isAvailable === "boolean" ? data.isAvailable : true);
    setDocuments(normalizeDocuments(data.documents));
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getDeliveryProfile();
        if (response.success && response.data) {
          syncProfile(response.data);
          const draft = await AsyncStorage.getItem(DRAFT_KEY);
          if ((forceComplete || !response.data.isProfileComplete) && draft) {
            const parsed = JSON.parse(draft);
            setName(parsed.name || response.data.name || "");
            setEmail(parsed.email || response.data.email || "");
            setAddressForm(parsed.addressForm || parseAddressString(parsed.address || response.data.address || ""));
            setVehicleType(parsed.vehicleType || response.data.vehicleType || "Bike");
            setVehicleNumber(parsed.vehicleNumber || response.data.vehicleNumber || "");
            setLicenseNumber(parsed.licenseNumber || response.data.licenseNumber || "");
            setProfilePhotoUrl(parsed.profilePhotoUrl || response.data.profilePhotoUrl || "");
            setIsAvailable(typeof parsed.isAvailable === "boolean" ? parsed.isAvailable : response.data.isAvailable);
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
        address: formattedAddress,
        addressForm,
        vehicleType,
        vehicleNumber,
        licenseNumber,
        profilePhotoUrl,
        isAvailable,
        documents,
        step
      })
    ).catch(() => {});
  }, [name, email, formattedAddress, addressForm, vehicleType, vehicleNumber, licenseNumber, profilePhotoUrl, isAvailable, documents, step]);

  const mandatoryDocsComplete = useMemo(() => {
    const normalized = normalizeDocuments(documents);
    return Boolean(
      normalized.aadhaarFrontUrl &&
        normalized.aadhaarBackUrl &&
        normalized.panFrontUrl &&
        normalized.drivingLicenseFrontUrl &&
        normalized.drivingLicenseBackUrl &&
        normalized.vehicleRcFrontUrl &&
        normalized.vehicleRcBackUrl &&
        normalized.insuranceUrl &&
        normalized.bankAccountHolderName &&
        normalized.bankAccountNumber &&
        normalized.bankIfsc &&
        normalized.bankDocumentType &&
        (normalized.cancelledChequeUrl || normalized.bankPassbookUrl || normalized.bankStatementUrl)
    );
  }, [documents]);

  const validateStep = (index: number) => {
    if (index === 0) {
      if (name.trim().length < 3) return "Please enter your full name.";
      if (!addressForm.flatNo.trim()) return "Flat / house number is required.";
      if (!addressForm.apartment.trim()) return "Apartment / building name is required.";
      if (!addressForm.colony.trim()) return "Colony / society is required.";
      if (!addressForm.area.trim()) return "Area / locality is required.";
      if (!addressForm.city.trim()) return "City is required.";
      if (!addressForm.state.trim()) return "State is required.";
      if (!/^[0-9]{6}$/.test(addressForm.pincode.trim())) return "Pincode must be 6 digits.";
    }
    if (index === 1) {
      if (!vehicleNumber.trim()) return "Vehicle number is required.";
      if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,12}$/i.test(vehicleNumber.trim())) return "Vehicle number format looks invalid.";
      if (!licenseNumber.trim()) return "Driving license is required.";
      if (!/^[A-Z]{2}[0-9]{2}[0-9A-Z]{8,14}$/i.test(licenseNumber.trim())) return "Driving license format looks invalid.";
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
      if (!normalized.drivingLicenseFrontUrl || !normalized.drivingLicenseBackUrl || !normalized.vehicleRcFrontUrl || !normalized.vehicleRcBackUrl || !normalized.insuranceUrl) {
        return "Driving license front/back, vehicle RC front/back, and insurance document are mandatory.";
      }
    }
    if (index === 3) {
      if (!documents.bankAccountHolderName?.trim()) return "Account holder name is required.";
      if (!documents.bankAccountNumber?.trim()) return "Bank account number is required.";
      if (!/^[0-9]+$/.test(documents.bankAccountNumber.trim())) return "Bank account number must be numeric.";
      if (!documents.bankIfsc?.trim()) return "IFSC code is required.";
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(documents.bankIfsc.trim().toUpperCase())) return "IFSC code format is invalid.";
      if (!documents.bankDocumentType || (!documents.cancelledChequeUrl && !documents.bankPassbookUrl && !documents.bankStatementUrl)) {
        return "Upload any one bank proof: cancelled cheque, passbook, or bank statement.";
      }
    }
    return null;
  };

  const pickDocument = async (field: UploadField): Promise<UploadAsset | null> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: PDF_UPLOAD_FIELDS.includes(field) ? ["image/*", "application/pdf"] : ["image/*"],
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

  const pickImage = async (): Promise<UploadAsset | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Permission needed", "Please allow gallery access to upload images.");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
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

  const uploadFile = async (field: UploadField) => {
    try {
      const shouldUseDocumentPicker = PDF_UPLOAD_FIELDS.includes(field);
      const asset = shouldUseDocumentPicker ? await pickDocument(field) : await pickImage();
      if (!asset?.uri) return;

      setUploading(field);
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
      Alert.alert("Upload failed", error.message || "Please try again.");
    } finally {
      setUploading(null);
    }
  };

  const handleSaveDraft = async () => {
    await AsyncStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ name, email, address: formattedAddress, addressForm, vehicleType, vehicleNumber, licenseNumber, profilePhotoUrl, isAvailable, documents, step })
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
      const response = await updateDeliveryProfile({
        name: name.trim(),
        email: email.trim() || undefined,
        address: formattedAddress,
        vehicleType,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        licenseNumber: licenseNumber.trim().toUpperCase(),
        profilePhotoUrl,
        isAvailable,
        status: "PENDING",
        documents: {
          ...documents,
          aadhaarNumber: documents.aadhaarNumber?.trim(),
          aadhaarFrontUrl: documents.aadhaarUrl,
          panNumber: documents.panNumber?.trim().toUpperCase(),
          panFrontUrl: documents.panFrontUrl,
          drivingLicenseFrontUrl: documents.drivingLicenseUrl,
          vehicleRcFrontUrl: documents.vehicleRcUrl,
          bankAccountHolderName: documents.bankAccountHolderName?.trim(),
          bankAccountNumber: documents.bankAccountNumber?.trim(),
          bankIfsc: documents.bankIfsc?.trim().toUpperCase()
        }
      });

      if (!response.success || !response.data) {
        Alert.alert("Error", response.message || "Failed to save profile");
        return;
      }

      syncProfile(response.data);
      await AsyncStorage.removeItem(DRAFT_KEY);
      Alert.alert("Submitted", "Your delivery profile is now pending admin verification.");
      if (forceComplete) {
        navigation.reset({ index: 0, routes: [{ name: resolveDeliveryRoute(response.data) }] });
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const renderUpload = (field: UploadField, title: string, subtitle: string, required?: boolean) => {
    const url = field === "profilePhotoUrl" ? profilePhotoUrl : documents[field as keyof Docs];
    const showImagePreview = typeof url === "string" && url && !isPdfFile(url);
    return (
      <View style={styles.uploadCard} key={field}>
        <Text style={styles.uploadTitle}>{title}{required ? " *" : ""}</Text>
        <Text style={styles.uploadSubtitle}>{subtitle}</Text>
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
        <TouchableOpacity style={styles.uploadButton} onPress={() => uploadFile(field)} disabled={uploading === field}>
          {uploading === field ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.uploadButtonText}>{url ? "Replace File" : "Upload File"}</Text>}
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
          {renderUpload("profilePhotoUrl", "Profile Photo", "Optional but recommended for easy identification")}
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter full name" placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.readOnly}><Text style={styles.readOnlyText}>{profile?.phone || "Verified with OTP"}</Text></View>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Enter email address" placeholderTextColor="#98A2B3" autoCapitalize="none" keyboardType="email-address" selectionColor="#FF6B35" />
          <Text style={styles.label}>Delivery Address</Text>
          <TextInput style={styles.input} value={addressForm.flatNo} onChangeText={(value) => updateAddressField("flatNo", value)} placeholder="Flat / house no." placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
          <TextInput style={[styles.input, styles.stackedInput]} value={addressForm.apartment} onChangeText={(value) => updateAddressField("apartment", value)} placeholder="Apartment / building name" placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
          <TextInput style={[styles.input, styles.stackedInput]} value={addressForm.colony} onChangeText={(value) => updateAddressField("colony", value)} placeholder="Colony / society" placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
          <TextInput style={[styles.input, styles.stackedInput]} value={addressForm.area} onChangeText={(value) => updateAddressField("area", value)} placeholder="Area / locality" placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
          <TextInput style={[styles.input, styles.stackedInput]} value={addressForm.city} onChangeText={(value) => updateAddressField("city", value)} placeholder="City" placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
          <TextInput style={[styles.input, styles.stackedInput]} value={addressForm.state} onChangeText={(value) => updateAddressField("state", value)} placeholder="State" placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
          <TextInput style={[styles.input, styles.stackedInput]} value={addressForm.pincode} onChangeText={(value) => updateAddressField("pincode", value)} placeholder="Pincode" placeholderTextColor="#98A2B3" keyboardType="number-pad" maxLength={6} selectionColor="#FF6B35" />
          <View style={styles.addressPreview}>
            <Text style={styles.addressPreviewLabel}>Saved format</Text>
            <Text style={styles.addressPreviewText}>{formattedAddress || "Flat no, apartment, colony, area, city, state, pincode"}</Text>
          </View>
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
          <Text style={styles.label}>Vehicle Number</Text>
          <TextInput style={styles.input} value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="TS09AB1234" placeholderTextColor="#98A2B3" autoCapitalize="characters" selectionColor="#FF6B35" />
          <Text style={styles.label}>Driving License Number</Text>
          <TextInput style={styles.input} value={licenseNumber} onChangeText={setLicenseNumber} placeholder="TS0120230012345" placeholderTextColor="#98A2B3" autoCapitalize="characters" selectionColor="#FF6B35" />
          <TouchableOpacity style={styles.availability} onPress={() => setIsAvailable((current) => !current)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.availabilityTitle}>Set account available after activation</Text>
              <Text style={styles.availabilityText}>You can still change this later from the profile.</Text>
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
          {renderUpload("drivingLicenseUrl", "Driving License - Upload Front Side", "Mandatory for bike and scooter delivery", true)}
          {renderUpload("drivingLicenseBackUrl", "Driving License - Upload Back Side", "Mandatory license back side", true)}
          {renderUpload("vehicleRcUrl", "Vehicle RC - Upload Front Side", "Mandatory vehicle ownership proof", true)}
          {renderUpload("vehicleRcBackUrl", "Vehicle RC - Upload Back Side", "Mandatory vehicle ownership proof", true)}
          {renderUpload("insuranceUrl", "Vehicle Insurance", "Mandatory single document", true)}
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bank and Submit</Text>
        <Text style={styles.cardText}>Payout details are mandatory before the account can move from Pending to Verified.</Text>
        <Text style={styles.label}>Account Holder Name</Text>
        <TextInput style={styles.input} value={documents.bankAccountHolderName || ""} onChangeText={(value) => setDocuments((current) => ({ ...current, bankAccountHolderName: value }))} placeholder="Enter account holder name" placeholderTextColor="#98A2B3" selectionColor="#FF6B35" />
        <Text style={styles.label}>Bank Account Number</Text>
        <TextInput style={styles.input} value={documents.bankAccountNumber || ""} onChangeText={(value) => setDocuments((current) => ({ ...current, bankAccountNumber: value.replace(/\D/g, "") }))} placeholder="Enter account number" placeholderTextColor="#98A2B3" keyboardType="number-pad" selectionColor="#FF6B35" />
        <Text style={styles.label}>IFSC Code</Text>
        <TextInput style={styles.input} value={documents.bankIfsc || ""} onChangeText={(value) => setDocuments((current) => ({ ...current, bankIfsc: value.toUpperCase() }))} placeholder="Enter IFSC code" placeholderTextColor="#98A2B3" autoCapitalize="characters" selectionColor="#FF6B35" />
        <Text style={styles.cardText}>Upload any one: Cancelled Cheque (Recommended) / Passbook / Bank Statement</Text>
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
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Review checklist</Text>
          <Text style={styles.summaryItem}>{mandatoryDocsComplete ? "Mandatory documents look complete." : "Mandatory documents are still missing."}</Text>
          <Text style={styles.summaryItem}>{"Status flow: Pending -> Verified -> Active"}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#FF6B35" /><Text style={styles.loadingText}>Loading profile...</Text></View>;
  }

  const currentStatus = statusTone[profile?.status || "INACTIVE"];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 8}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 136 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroTag}><Ionicons name="bicycle-outline" size={16} color="#C2410C" /><Text style={styles.heroTagText}>Delivery Partner Registration</Text></View>
          <Text style={styles.heroTitle}>Complete your rider profile</Text>
          <Text style={styles.heroSubtitle}>Upload the mandatory KYC, vehicle, and payout documents so the admin team can verify and activate your account.</Text>
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
        <TouchableOpacity style={styles.saveDraft} onPress={handleSaveDraft}><Text style={styles.saveDraftText}>Save Draft</Text></TouchableOpacity>
        <View style={styles.footerRow}>
          {step > 0 ? <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep((current) => current - 1)}><Text style={styles.secondaryButtonText}>Back</Text></TouchableOpacity> : <View style={styles.spacer} />}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F5F0" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F5F0" },
  loadingText: { marginTop: 12, color: "#667085", fontSize: 15 },
  hero: { margin: 16, padding: 20, borderRadius: 24, backgroundColor: "#FFF4EE", borderWidth: 1, borderColor: "#FFD9C9" },
  heroTag: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "#fff" },
  heroTagText: { fontSize: 12, fontWeight: "700", color: "#C2410C" },
  heroTitle: { marginTop: 14, fontSize: 25, fontWeight: "800", color: "#1D2939" },
  heroSubtitle: { marginTop: 8, fontSize: 14, lineHeight: 21, color: "#475467" },
  statusCard: { marginHorizontal: 16, marginTop: -2, padding: 16, borderRadius: 20 },
  statusLabel: { fontSize: 15, fontWeight: "800" },
  statusText: { marginTop: 6, fontSize: 13, lineHeight: 19, color: "#475467" },
  progressCard: { marginHorizontal: 16, marginTop: 14, padding: 16, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#ECECEC" },
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
  card: { marginHorizontal: 16, marginTop: 14, padding: 18, borderRadius: 22, backgroundColor: "#fff", borderWidth: 1, borderColor: "#ECECEC" },
  cardTitle: { fontSize: 21, fontWeight: "800", color: "#1D2939" },
  cardText: { marginTop: 6, fontSize: 13, lineHeight: 20, color: "#667085" },
  label: { marginTop: 16, marginBottom: 8, fontSize: 13, fontWeight: "700", color: "#344054" },
  input: { borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: "#101828", backgroundColor: "#fff" },
  area: { minHeight: 110 },
  stackedInput: { marginTop: 10 },
  readOnly: { borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 16, padding: 14, backgroundColor: "#F8FAFC" },
  readOnlyText: { fontSize: 15, fontWeight: "700", color: "#101828" },
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
  uploadTitle: { fontSize: 14, fontWeight: "800", color: "#1D2939" },
  uploadSubtitle: { marginTop: 4, fontSize: 12, lineHeight: 18, color: "#667085" },
  placeholder: { marginTop: 12, height: 72, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: "#D0D5DD", alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  placeholderText: { marginTop: 6, fontSize: 12, color: "#98A2B3" },
  fileBadge: { marginTop: 12, padding: 14, borderRadius: 14, backgroundColor: "#ECFDF3", borderWidth: 1, borderColor: "#ABEFC6", flexDirection: "row", alignItems: "center", gap: 8 },
  fileBadgeText: { fontSize: 13, fontWeight: "700", color: "#027A48" },
  preview: { width: "100%", height: 120, borderRadius: 14, marginTop: 12, backgroundColor: "#F2F4F7" },
  uploadButton: { marginTop: 12, alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: "#FF6B35", minWidth: 110, alignItems: "center" },
  uploadButtonText: { fontSize: 13, fontWeight: "800", color: "#fff" },
  addressPreview: { marginTop: 12, padding: 14, borderRadius: 16, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E4E7EC" },
  addressPreviewLabel: { fontSize: 12, fontWeight: "700", color: "#667085" },
  addressPreviewText: { marginTop: 6, fontSize: 13, lineHeight: 20, color: "#344054" },
  summary: { marginTop: 16, padding: 16, borderRadius: 18, backgroundColor: "#F8FAFC" },
  summaryTitle: { fontSize: 14, fontWeight: "800", color: "#1D2939" },
  summaryItem: { marginTop: 6, fontSize: 13, color: "#667085" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: "rgba(248,245,240,0.97)", borderTopWidth: 1, borderTopColor: "#EAECF0" },
  saveDraft: { alignSelf: "center", paddingHorizontal: 14, paddingVertical: 8 },
  saveDraftText: { fontSize: 13, fontWeight: "700", color: "#667085" },
  footerRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 12 },
  secondaryButton: { paddingHorizontal: 20, paddingVertical: 15, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E4E7EC" },
  secondaryButtonText: { fontSize: 14, fontWeight: "800", color: "#344054" },
  spacer: { width: 90 },
  primaryButton: { flex: 1, minHeight: 54, borderRadius: 18, backgroundColor: "#FF6B35", alignItems: "center", justifyContent: "center" },
  primaryButtonText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  disabled: { opacity: 0.75 }
});
