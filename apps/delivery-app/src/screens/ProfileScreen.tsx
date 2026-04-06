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
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { rawApi } from "../api/client";
import { getDeliveryProfile, updateDeliveryProfile, type DeliveryProfile } from "../api/profile.api";

const DRAFT_KEY = "delivery_registration_draft_v2";
const STEPS = ["Basic", "Vehicle", "Documents", "Bank"] as const;
const VEHICLE_TYPES: DeliveryProfile["vehicleType"][] = ["Bike", "Scooter", "Motorcycle", "Cycle"];

type UploadField =
  | "profilePhotoUrl"
  | "aadhaarUrl"
  | "panUrl"
  | "drivingLicenseUrl"
  | "vehicleRcUrl"
  | "insuranceUrl"
  | "cancelledChequeUrl";

type Docs = NonNullable<DeliveryProfile["documents"]>;

const emptyDocs = (): Docs => ({
  aadhaarUrl: "",
  panUrl: "",
  drivingLicenseUrl: "",
  vehicleRcUrl: "",
  insuranceUrl: "",
  cancelledChequeUrl: "",
  bankAccountNumber: "",
  bankIfsc: "",
  submittedAt: "",
  isComplete: false
});

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
  const [address, setAddress] = useState("");
  const [vehicleType, setVehicleType] = useState<DeliveryProfile["vehicleType"]>("Bike");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [documents, setDocuments] = useState<Docs>(emptyDocs());

  const syncProfile = (data: DeliveryProfile) => {
    setProfile(data);
    setName(data.name || "");
    setEmail(data.email || "");
    setAddress(data.address || "");
    setVehicleType(data.vehicleType || "Bike");
    setVehicleNumber(data.vehicleNumber || "");
    setLicenseNumber(data.licenseNumber || "");
    setProfilePhotoUrl(data.profilePhotoUrl || "");
    setIsAvailable(typeof data.isAvailable === "boolean" ? data.isAvailable : true);
    setDocuments({ ...emptyDocs(), ...(data.documents || {}) });
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
            setAddress(parsed.address || response.data.address || "");
            setVehicleType(parsed.vehicleType || response.data.vehicleType || "Bike");
            setVehicleNumber(parsed.vehicleNumber || response.data.vehicleNumber || "");
            setLicenseNumber(parsed.licenseNumber || response.data.licenseNumber || "");
            setProfilePhotoUrl(parsed.profilePhotoUrl || response.data.profilePhotoUrl || "");
            setIsAvailable(typeof parsed.isAvailable === "boolean" ? parsed.isAvailable : response.data.isAvailable);
            setDocuments({ ...emptyDocs(), ...(response.data.documents || {}), ...(parsed.documents || {}) });
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
        address,
        vehicleType,
        vehicleNumber,
        licenseNumber,
        profilePhotoUrl,
        isAvailable,
        documents,
        step
      })
    ).catch(() => {});
  }, [name, email, address, vehicleType, vehicleNumber, licenseNumber, profilePhotoUrl, isAvailable, documents, step]);

  const mandatoryDocsComplete = useMemo(
    () =>
      Boolean(
        documents.aadhaarUrl &&
          documents.drivingLicenseUrl &&
          documents.vehicleRcUrl &&
          documents.bankAccountNumber &&
          documents.bankIfsc &&
          documents.cancelledChequeUrl
      ),
    [documents]
  );

  const validateStep = (index: number) => {
    if (index === 0) {
      if (name.trim().length < 3) return "Please enter your full name.";
      if (address.trim().length < 10) return "Please enter your full address.";
    }
    if (index === 1) {
      if (!vehicleNumber.trim()) return "Vehicle number is required.";
      if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,12}$/i.test(vehicleNumber.trim())) return "Vehicle number format looks invalid.";
      if (!licenseNumber.trim()) return "Driving license is required.";
      if (!/^[A-Z]{2}[0-9]{2}[0-9A-Z]{8,14}$/i.test(licenseNumber.trim())) return "Driving license format looks invalid.";
    }
    if (index === 2) {
      if (!documents.aadhaarUrl || !documents.drivingLicenseUrl || !documents.vehicleRcUrl) {
        return "Aadhaar, driving license, and vehicle RC are mandatory.";
      }
    }
    if (index === 3) {
      if (!documents.bankAccountNumber?.trim()) return "Bank account number is required.";
      if (!documents.bankIfsc?.trim()) return "IFSC code is required.";
      if (!documents.cancelledChequeUrl) return "Cancelled cheque upload is required.";
    }
    return null;
  };

  const uploadFile = async (field: UploadField) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission needed", "Please allow gallery access to upload documents.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85
      });

      if (result.canceled || !result.assets[0]?.uri) return;

      setUploading(field);
      const asset = result.assets[0];
      const formData = new FormData();
      const fileName = asset.fileName || asset.uri.split("/").pop() || `${field}.jpg`;

      // @ts-ignore React Native FormData
      formData.append("image", {
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        name: fileName
      });

      const response: any = await rawApi.post("/upload/image", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const url = response?.data?.data?.url;
      if (!url) throw new Error(response?.data?.message || "Upload failed");

      if (field === "profilePhotoUrl") {
        setProfilePhotoUrl(url);
      } else {
        setDocuments((current) => ({ ...current, [field]: url }));
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
      JSON.stringify({ name, email, address, vehicleType, vehicleNumber, licenseNumber, profilePhotoUrl, isAvailable, documents, step })
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
        address: address.trim(),
        vehicleType,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        licenseNumber: licenseNumber.trim().toUpperCase(),
        profilePhotoUrl,
        isAvailable,
        status: "PENDING",
        documents: {
          ...documents,
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
        navigation.reset({ index: 0, routes: [{ name: "Main" }] });
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const renderUpload = (field: UploadField, title: string, subtitle: string, required?: boolean) => {
    const url = field === "profilePhotoUrl" ? profilePhotoUrl : documents[field as keyof Docs];
    return (
      <View style={styles.uploadCard} key={field}>
        <Text style={styles.uploadTitle}>{title}{required ? " *" : ""}</Text>
        <Text style={styles.uploadSubtitle}>{subtitle}</Text>
        {typeof url === "string" && url ? (
          <Image source={{ uri: url }} style={styles.preview} />
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
          <Text style={styles.label}>Address</Text>
          <TextInput style={[styles.input, styles.area]} value={address} onChangeText={setAddress} placeholder="Enter full address" placeholderTextColor="#98A2B3" multiline textAlignVertical="top" selectionColor="#FF6B35" />
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
          {renderUpload("aadhaarUrl", "Aadhaar Card", "Mandatory for KYC and identity verification", true)}
          {renderUpload("drivingLicenseUrl", "Driving License", "Mandatory for bike and scooter delivery", true)}
          {renderUpload("vehicleRcUrl", "Vehicle RC", "Mandatory vehicle ownership proof", true)}
          {renderUpload("panUrl", "PAN Card", "Applicable if available")}
          {renderUpload("insuranceUrl", "Insurance Document", "Applicable if available")}
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bank and Submit</Text>
        <Text style={styles.cardText}>Payout details are mandatory before the account can move from Pending to Verified.</Text>
        <Text style={styles.label}>Bank Account Number</Text>
        <TextInput style={styles.input} value={documents.bankAccountNumber || ""} onChangeText={(value) => setDocuments((current) => ({ ...current, bankAccountNumber: value.replace(/\D/g, "") }))} placeholder="Enter account number" placeholderTextColor="#98A2B3" keyboardType="number-pad" selectionColor="#FF6B35" />
        <Text style={styles.label}>IFSC Code</Text>
        <TextInput style={styles.input} value={documents.bankIfsc || ""} onChangeText={(value) => setDocuments((current) => ({ ...current, bankIfsc: value.toUpperCase() }))} placeholder="Enter IFSC code" placeholderTextColor="#98A2B3" autoCapitalize="characters" selectionColor="#FF6B35" />
        {renderUpload("cancelledChequeUrl", "Cancelled Cheque", "Mandatory for payout verification", true)}
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
  preview: { width: "100%", height: 120, borderRadius: 14, marginTop: 12, backgroundColor: "#F2F4F7" },
  uploadButton: { marginTop: 12, alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: "#FF6B35", minWidth: 110, alignItems: "center" },
  uploadButtonText: { fontSize: 13, fontWeight: "800", color: "#fff" },
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
