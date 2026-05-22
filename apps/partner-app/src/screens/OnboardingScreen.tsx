import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ActivityIndicator,
  Image,
  Modal
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { uploadMultipart } from "../api/client";

const CATEGORIES = ["bakery", "mini-restaurant", "grocery", "tiffin-center", "fast-food", "sweets", "ice-creams", "juice", "other"];

const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata",
  "Surat", "Pune", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane",
  "Bhopal", "Visakhapatnam", "Patna", "Vadodara", "Ghaziabad", "Ludhiana",
  "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Varanasi", "Srinagar",
  "Aurangabad", "Amritsar", "Navi Mumbai", "Howrah", "Gwalior", "Coimbatore",
  "Vijayawada", "Madurai", "Raipur", "Chandigarh", "Guwahati"
];

type DocumentState = {
  fssaiNumber: string;
  fssaiUrl: string;
  panNumber: string;
  panFrontUrl: string;
  aadhaarNumber: string;
  aadhaarFrontUrl: string;
  aadhaarBackUrl: string;
  bankDocumentType: "cheque" | "passbook" | "statement" | "";
  bankAccountHolderName: string;
  cancelledChequeUrl: string;
  bankPassbookUrl: string;
  bankStatementUrl: string;
  bankAccountNumber: string;
  bankIfsc: string;
  addressProofUrl: string;
  gstUrl: string;
  shopLicenseUrl: string;
  ownerPanUrl: string;
  menuProofUrl: string;
};

interface UploadResponse {
  success: boolean;
  data?: {
    url: string;
  };
  message?: string;
}

type PickerAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

type UploadingKey =
  | "fssaiUrl"
  | "panFrontUrl"
  | "aadhaarFrontUrl"
  | "aadhaarBackUrl"
  | "cancelledChequeUrl"
  | "bankPassbookUrl"
  | "bankStatementUrl"
  | "addressProofUrl"
  | "gstUrl"
  | "shopLicenseUrl"
  | "ownerPanUrl"
  | "menuProofUrl"
  | null;

type PendingDocument = {
  docKey: Exclude<UploadingKey, null>;
  asset: PickerAsset;
  title: string;
};

const mandatoryDocs: Array<{ key: keyof DocumentState; title: string; subtitle: string }> = [
  { key: "fssaiUrl", title: "FSSAI License", subtitle: "Single PDF/image document" },
  { key: "panFrontUrl", title: "PAN Card - Upload Front Side", subtitle: "Mandatory owner PAN proof" },
  { key: "aadhaarFrontUrl", title: "Aadhaar - Upload Front Side", subtitle: "Mandatory owner Aadhaar proof" },
  { key: "aadhaarBackUrl", title: "Aadhaar - Upload Back Side", subtitle: "Mandatory owner Aadhaar proof" },
  { key: "addressProofUrl", title: "Restaurant Address Proof", subtitle: "Utility bill, rental proof, or property document" }
];

const optionalDocs: Array<{ key: keyof DocumentState; title: string; subtitle: string }> = [
  { key: "gstUrl", title: "GST Certificate", subtitle: "Required only if turnover is above Rs 20 lakh/year" },
  { key: "shopLicenseUrl", title: "Shop & Establishment License", subtitle: "If applicable in your location" },
  { key: "ownerPanUrl", title: "Owner PAN Copy", subtitle: "Useful for additional verification" },
  { key: "menuProofUrl", title: "Menu List / Proof", subtitle: "Optional support for faster review" }
];

const getUploadMimeType = (filename: string) => {
  const lastDot = filename.lastIndexOf(".");
  const extension = lastDot >= 0 ? filename.slice(lastDot + 1).toLowerCase() : "";
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
  const rawName = asset.fileName || fromUri || fallbackName;
  const sanitized = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");

  if (/\.[a-z0-9]+$/i.test(sanitized)) {
    return sanitized;
  }

  const mimeExtension = (asset.mimeType || "")
    .split("/")[1]
    ?.replace("jpeg", "jpg")
    .replace("svg+xml", "svg") || "jpg";

  return `${sanitized || "upload"}.${mimeExtension}`;
};

const loadLocationModule = async () => {
  try {
    return await import("expo-location");
  } catch (error) {
    console.warn("expo-location is unavailable in this app build:", error);
    return null;
  }
};

export default function OnboardingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<UploadingKey>(null);
  const [pickerBusy, setPickerBusy] = useState(false);
  const [pendingDocument, setPendingDocument] = useState<PendingDocument | null>(null);
  const [form, setForm] = useState({
    ownerName: "",
    restaurantName: "",
    phone: ""
  });
  const [address, setAddress] = useState({
    state: "",
    city: "",
    pincode: "",
    area: "",
    colony: "",
    roadStreet: "",
    nearbyPlaces: "",
    googleMapsLink: ""
  });
  const [documents, setDocuments] = useState<DocumentState>({
    fssaiNumber: "",
    fssaiUrl: "",
    panNumber: "",
    panFrontUrl: "",
    aadhaarNumber: "",
    aadhaarFrontUrl: "",
    aadhaarBackUrl: "",
    bankDocumentType: "",
    bankAccountHolderName: "",
    cancelledChequeUrl: "",
    bankPassbookUrl: "",
    bankStatementUrl: "",
    bankAccountNumber: "",
    bankIfsc: "",
    addressProofUrl: "",
    gstUrl: "",
    shopLicenseUrl: "",
    ownerPanUrl: "",
    menuProofUrl: ""
  });
  const [selectedCategory, setSelectedCategory] = useState("");
  const [autoFilledPhone, setAutoFilledPhone] = useState("");
  const [shopLocation, setShopLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [capturingLocation, setCapturingLocation] = useState(false);

  useEffect(() => {
    const fetchPhone = async () => {
      try {
        const storedPhone = await AsyncStorage.getItem("phone");
        if (storedPhone) {
          setAutoFilledPhone(storedPhone);
          setForm((prev) => ({ ...prev, phone: storedPhone }));
        }
      } catch (error) {
        console.log("Error fetching phone:", error);
      }
    };
    fetchPhone();
  }, []);

  const filteredCities = useMemo(() => {
    if (!address.city || address.city.length < 2) {
      return [];
    }
    return INDIAN_CITIES.filter((city) => city.toLowerCase().includes(address.city.toLowerCase())).slice(0, 6);
  }, [address.city]);

  const uploadImageToCloudinary = async (asset: PickerAsset): Promise<string> => {
    const formData = new FormData();
    const filename = getUploadFilename(asset, "partner-document.jpg");
    const type = asset.mimeType || getUploadMimeType(filename);

    // @ts-ignore React Native FormData file object
    formData.append("image", {
      uri: asset.uri,
      type,
      name: filename
    });

    const uploadData = await uploadMultipart<UploadResponse["data"]>("/upload/image", formData);

    if (!uploadData?.success || !uploadData?.data?.url) {
      throw new Error(uploadData?.message || "Upload failed");
    }

    return uploadData.data.url;
  };

  const getDocumentTitle = (docKey: Exclude<UploadingKey, null>) => {
    const doc = [...mandatoryDocs, ...optionalDocs].find((item) => item.key === docKey);
    if (doc) {
      return doc.title.replace(" - Upload Front Side", "");
    }
    if (docKey === "cancelledChequeUrl") return "Cancelled Cheque";
    if (docKey === "bankPassbookUrl") return "Bank Passbook";
    if (docKey === "bankStatementUrl") return "Bank Statement";
    return "Document";
  };

  const pickAndPreviewDocument = async (docKey: UploadingKey) => {
    if (!docKey) return;
    if (pickerBusy || uploadingKey) return;

    try {
      setPickerBusy(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow gallery access to upload your documents.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.6
      });

      if (result.canceled || !result.assets[0]?.uri) {
        return;
      }

      setPendingDocument({
        docKey,
        asset: result.assets[0],
        title: getDocumentTitle(docKey)
      });
    } catch (error: any) {
      console.error("Document picker failed:", error);
      Alert.alert(
        "Picker Failed",
        error.response?.data?.message || error.message || "Could not open your gallery. Please try again."
      );
    } finally {
      setPickerBusy(false);
    }
  };

  const uploadPendingDocument = async () => {
    if (!pendingDocument) return;

    try {
      const { docKey, asset } = pendingDocument;
      setUploadingKey(docKey);
      const uploadedUrl = await uploadImageToCloudinary(asset);
      setDocuments((prev) => ({ ...prev, [docKey]: uploadedUrl }));
      setPendingDocument(null);
    } catch (error: any) {
      console.error("Document upload failed:", error);
      Alert.alert("Upload Failed", error.response?.data?.message || error.message || "Failed to upload document.");
    } finally {
      setUploadingKey(null);
    }
  };

  const captureShopLocation = async () => {
    try {
      setCapturingLocation(true);
      const Location = await loadLocationModule();
      if (!Location) {
        Alert.alert(
          "App update required",
          "This Partner app build does not include location support yet. Install the latest build, or paste your shop Google Maps link below for now."
        );
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location permission needed",
          "Open the Vyaha Partner app while standing at your shop and allow location access so we can pin its exact spot."
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      setShopLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });

      Alert.alert("Shop location captured", "We have pinned your shop. You can re-capture any time from this screen.");
    } catch (error: any) {
      Alert.alert("Could not capture location", error?.message || "Please try again from inside the shop.");
    } finally {
      setCapturingLocation(false);
    }
  };

  const validateForm = () => {
    if (!form.ownerName || !form.restaurantName || !form.phone) {
      return "Please fill all basic details";
    }
    if (form.phone.length !== 10) {
      return "Enter valid 10-digit phone number";
    }
    if (!selectedCategory) {
      return "Please select a business category";
    }
    if (!address.state || !address.city || !address.pincode || !address.area || !address.colony || !address.roadStreet) {
      return "Please fill state, city, pincode, area, colony and road / street";
    }
    if (!shopLocation && !address.googleMapsLink.trim()) {
      return "Tap 'Use my shop location' or paste a Google Maps share link so customers can find you";
    }
    if (!/^\d{6}$/.test(address.pincode)) {
      return "Pincode must be exactly 6 digits";
    }
    if (!/^\d{14}$/.test(documents.fssaiNumber.trim())) {
      return "FSSAI number must be 14 digits";
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(documents.panNumber.trim().toUpperCase())) {
      return "PAN number must match AAAAA9999A format";
    }
    if (!/^\d{12}$/.test(documents.aadhaarNumber.trim())) {
      return "Aadhaar number must be 12 digits";
    }
    if (!documents.fssaiUrl || !documents.panFrontUrl || !documents.aadhaarFrontUrl || !documents.aadhaarBackUrl || !documents.addressProofUrl) {
      return "Please upload FSSAI, PAN front, Aadhaar front/back, and address proof";
    }
    if (!documents.bankAccountHolderName.trim()) {
      return "Account holder name is mandatory";
    }
    if (!documents.bankAccountNumber || !/^\d+$/.test(documents.bankAccountNumber.trim())) {
      return "Bank account number must be numeric";
    }
    if (!documents.bankIfsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(documents.bankIfsc.trim().toUpperCase())) {
      return "IFSC format is invalid";
    }
    if (!documents.bankDocumentType || (!documents.cancelledChequeUrl && !documents.bankPassbookUrl && !documents.bankStatementUrl)) {
      return "Upload any one bank proof: cancelled cheque, passbook, or bank statement";
    }
    return null;
  };

  const submit = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert("Missing Details", validationError);
      return;
    }

    try {
      setSubmitting(true);
      const userId = (await AsyncStorage.getItem("userId")) || "";
      const userStr = await AsyncStorage.getItem("user");
      const fallbackUserId = userStr ? JSON.parse(userStr).id : "";

      const requestData: any = {
        ...form,
        address: {
          state: address.state.trim(),
          city: address.city.trim(),
          pincode: address.pincode.trim(),
          area: address.area.trim(),
          colony: address.colony.trim(),
          roadStreet: address.roadStreet.trim(),
          nearbyPlaces: address.nearbyPlaces
            .split(",")
            .map((place) => place.trim())
            .filter((place) => place.length > 0),
          googleMapsLink: address.googleMapsLink.trim()
        },
        category: selectedCategory,
        userId: userId || fallbackUserId,
        documents: {
          ...documents,
          fssaiNumber: documents.fssaiNumber.trim(),
          panNumber: documents.panNumber.trim().toUpperCase(),
          aadhaarNumber: documents.aadhaarNumber.trim(),
          ownerIdProofUrl: documents.aadhaarFrontUrl,
          ownerPanUrl: documents.panFrontUrl,
          bankProofUrl: documents.cancelledChequeUrl || documents.bankPassbookUrl || documents.bankStatementUrl,
          bankAccountHolderName: documents.bankAccountHolderName.trim(),
          bankAccountNumber: documents.bankAccountNumber.trim(),
          bankIfsc: documents.bankIfsc.trim().toUpperCase()
        }
      };

      if (shopLocation) {
        requestData.location = shopLocation;
      }

      await api.post("/partners/onboard", requestData);
      await AsyncStorage.setItem("partnerPhone", form.phone);

      navigation.replace("ApplicationSubmitted", {
        ownerName: form.ownerName,
        restaurantName: form.restaurantName
      });
    } catch (error: any) {
      console.error("Submission error:", error);
      Alert.alert("Error", error.response?.data?.message || error.response?.data?.error || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderDocCard = (
    title: string,
    subtitle: string,
    docKey: keyof DocumentState,
    mandatory = false
  ) => {
    const uploaded = Boolean(documents[docKey]);
    const isUploading = uploadingKey === docKey;
    const previewUrl = documents[docKey];

    return (
      <View key={docKey} style={styles.docCard}>
        <View style={styles.docHeader}>
          <View style={styles.docCopy}>
            <Text style={styles.docTitle}>
              {title} {mandatory ? "*" : ""}
            </Text>
            <Text style={styles.docSubtitle}>{subtitle}</Text>
          </View>
          <View style={[styles.docBadge, uploaded ? styles.docBadgeDone : styles.docBadgePending]}>
            <Text style={[styles.docBadgeText, uploaded ? styles.docBadgeDoneText : styles.docBadgePendingText]}>
              {uploaded ? "Uploaded" : mandatory ? "Required" : "Optional"}
            </Text>
          </View>
        </View>

        {previewUrl ? <Image source={{ uri: previewUrl }} style={styles.docPreview} resizeMode="cover" /> : null}

        <TouchableOpacity style={styles.docButton} onPress={() => pickAndPreviewDocument(docKey as UploadingKey)} disabled={isUploading || pickerBusy}>
          {isUploading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.docButtonText}>{uploaded ? "Replace Document" : "Choose Document"}</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 30 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Modal
          visible={Boolean(pendingDocument)}
          transparent
          animationType="slide"
          onRequestClose={() => {
            if (!uploadingKey) setPendingDocument(null);
          }}
        >
          <View style={styles.previewOverlay}>
            <View style={styles.previewSheet}>
              <View style={styles.previewHeader}>
                <View style={styles.previewTitleWrap}>
                  <Text style={styles.previewEyebrow}>Ready to upload</Text>
                  <Text style={styles.previewTitle}>{pendingDocument?.title || "Document"}</Text>
                </View>
                <TouchableOpacity
                  style={styles.previewCloseButton}
                  onPress={() => setPendingDocument(null)}
                  disabled={uploadingKey !== null}
                >
                  <Text style={styles.previewCloseText}>Close</Text>
                </TouchableOpacity>
              </View>

              {pendingDocument ? (
                <Image source={{ uri: pendingDocument.asset.uri }} style={styles.previewImage} resizeMode="contain" />
              ) : null}

              <Text style={styles.previewHelp}>
                Make sure the full document is visible, clear, and readable before uploading.
              </Text>

              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={styles.previewSecondaryButton}
                  onPress={async () => {
                    const docKey = pendingDocument?.docKey || null;
                    setPendingDocument(null);
                    if (docKey) {
                      await pickAndPreviewDocument(docKey);
                    }
                  }}
                  disabled={uploadingKey !== null}
                >
                  <Text style={styles.previewSecondaryText}>Choose Again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.previewPrimaryButton}
                  onPress={uploadPendingDocument}
                  disabled={uploadingKey !== null}
                >
                  {uploadingKey ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.previewPrimaryText}>Upload</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Vyaha Partner</Text>
          <Text style={styles.heroTitle}>Set up your shop for approval</Text>
          <Text style={styles.heroSubtitle}>
            Submit your business details and the required restaurant documents in one place.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Basic details</Text>

          <Text style={styles.label}>Owner name</Text>
          <TextInput placeholder="Enter full name" placeholderTextColor="#98A2B3" value={form.ownerName} onChangeText={(v) => setForm({ ...form, ownerName: v })} style={styles.input} />

          <Text style={styles.label}>Restaurant or shop name</Text>
          <TextInput placeholder="Enter restaurant or shop name" placeholderTextColor="#98A2B3" value={form.restaurantName} onChangeText={(v) => setForm({ ...form, restaurantName: v })} style={styles.input} />

          <Text style={styles.label}>Phone number</Text>
          <TextInput
            placeholder="10-digit mobile number"
            placeholderTextColor="#98A2B3"
            value={form.phone}
            onChangeText={(v) => setForm({ ...form, phone: v })}
            keyboardType="number-pad"
            maxLength={10}
            style={[styles.input, autoFilledPhone ? styles.disabledInput : null]}
            editable={!autoFilledPhone}
          />
          {autoFilledPhone ? <Text style={styles.helperText}>Auto-filled from your login</Text> : null}

          <Text style={styles.sectionTitle}>Shop address</Text>

          <Text style={styles.label}>State</Text>
          <TextInput placeholder="State" placeholderTextColor="#98A2B3" value={address.state} onChangeText={(v) => setAddress({ ...address, state: v })} style={styles.input} />

          <Text style={styles.label}>City or town</Text>
          <TextInput placeholder="City or town" placeholderTextColor="#98A2B3" value={address.city} onChangeText={(v) => setAddress({ ...address, city: v })} style={styles.input} />
          {filteredCities.length > 0 ? (
            <View style={styles.suggestionCard}>
              {filteredCities.map((city) => (
                <TouchableOpacity key={city} style={styles.suggestionRow} onPress={() => setAddress({ ...address, city })}>
                  <Text style={styles.suggestionText}>{city}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>Pincode</Text>
              <TextInput placeholder="6 digits" placeholderTextColor="#98A2B3" value={address.pincode} onChangeText={(v) => setAddress({ ...address, pincode: v })} keyboardType="number-pad" maxLength={6} style={styles.input} />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Area</Text>
              <TextInput placeholder="Area / locality" placeholderTextColor="#98A2B3" value={address.area} onChangeText={(v) => setAddress({ ...address, area: v })} style={styles.input} />
            </View>
          </View>

          <Text style={styles.label}>Colony or society</Text>
          <TextInput placeholder="Colony / society" placeholderTextColor="#98A2B3" value={address.colony} onChangeText={(v) => setAddress({ ...address, colony: v })} style={styles.input} />

          <Text style={styles.label}>Road or street</Text>
          <TextInput placeholder="Road / street details" placeholderTextColor="#98A2B3" value={address.roadStreet} onChangeText={(v) => setAddress({ ...address, roadStreet: v })} style={styles.input} />

          <Text style={styles.label}>Nearby places</Text>
          <TextInput placeholder="Metro station, mall, landmark" placeholderTextColor="#98A2B3" value={address.nearbyPlaces} onChangeText={(v) => setAddress({ ...address, nearbyPlaces: v })} style={styles.input} />

          <Text style={styles.label}>Pin your shop</Text>
          <Text style={styles.helperText}>
            Stand inside your shop and tap below. Customers within 3 km will see you and delivery partners will navigate here.
          </Text>
          <TouchableOpacity
            style={[styles.primaryActionButton, capturingLocation && styles.primaryActionButtonDisabled]}
            onPress={captureShopLocation}
            disabled={capturingLocation}
          >
            {capturingLocation ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryActionButtonText}>
                {shopLocation ? "Re-capture shop location" : "Use my shop location"}
              </Text>
            )}
          </TouchableOpacity>
          {shopLocation ? (
            <View style={styles.successCard}>
              <Text style={styles.successCardText}>
                Pinned: {shopLocation.latitude.toFixed(5)}, {shopLocation.longitude.toFixed(5)}
              </Text>
            </View>
          ) : null}

          <Text style={styles.label}>Google Maps link (optional)</Text>
          <TextInput
            placeholder="Optional - paste a Google Maps share link"
            placeholderTextColor="#98A2B3"
            value={address.googleMapsLink}
            onChangeText={(v) => setAddress({ ...address, googleMapsLink: v })}
            style={styles.input}
          />

          <TouchableOpacity style={styles.utilityButton} onPress={() => Linking.openURL("https://maps.google.com")}>
            <Text style={styles.utilityButtonText}>Open Google Maps</Text>
          </TouchableOpacity>

          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>Why pin your shop?</Text>
            <Text style={styles.tipText}>
              The pinned spot is what we use to match nearby customers and route delivery partners. A maps link is only useful as a backup if you can't open the app inside the shop.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Business category</Text>
          <View style={styles.categoryWrap}>
            {CATEGORIES.map((cat) => {
              const selected = selectedCategory === cat;
              return (
                <TouchableOpacity key={cat} style={[styles.categoryChip, selected && styles.categoryChipSelected]} onPress={() => setSelectedCategory(cat)}>
                  <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
                    {cat.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Mandatory restaurant documents</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>These are required</Text>
            <Text style={styles.tipText}>
              FSSAI, PAN front, Aadhaar front/back, bank proof with bank details, and restaurant address proof are mandatory before admin approval.
            </Text>
          </View>

          <Text style={styles.label}>FSSAI number *</Text>
          <TextInput
            placeholder="14-digit FSSAI number"
            placeholderTextColor="#98A2B3"
            value={documents.fssaiNumber}
            onChangeText={(value) => setDocuments((prev) => ({ ...prev, fssaiNumber: value.replace(/\D/g, "").slice(0, 14) }))}
            keyboardType="number-pad"
            style={styles.input}
          />

          <Text style={styles.label}>PAN number *</Text>
          <TextInput
            placeholder="AAAAA9999A"
            placeholderTextColor="#98A2B3"
            autoCapitalize="characters"
            value={documents.panNumber}
            onChangeText={(value) => setDocuments((prev) => ({ ...prev, panNumber: value.toUpperCase().slice(0, 10) }))}
            style={styles.input}
          />

          <Text style={styles.label}>Aadhaar number *</Text>
          <TextInput
            placeholder="12-digit Aadhaar number"
            placeholderTextColor="#98A2B3"
            value={documents.aadhaarNumber}
            onChangeText={(value) => setDocuments((prev) => ({ ...prev, aadhaarNumber: value.replace(/\D/g, "").slice(0, 12) }))}
            keyboardType="number-pad"
            style={styles.input}
          />

          {mandatoryDocs.map((doc) => renderDocCard(doc.title, doc.subtitle, doc.key, true))}

          <Text style={styles.label}>Account holder name *</Text>
          <TextInput
            placeholder="Enter payout account holder name"
            placeholderTextColor="#98A2B3"
            value={documents.bankAccountHolderName}
            onChangeText={(value) => setDocuments((prev) => ({ ...prev, bankAccountHolderName: value }))}
            style={styles.input}
          />

          <Text style={styles.label}>Bank account number *</Text>
          <TextInput
            placeholder="Enter payout bank account number"
            placeholderTextColor="#98A2B3"
            value={documents.bankAccountNumber}
            onChangeText={(value) => setDocuments((prev) => ({ ...prev, bankAccountNumber: value.replace(/\D/g, "") }))}
            keyboardType="number-pad"
            style={styles.input}
          />

          <Text style={styles.label}>Bank IFSC code *</Text>
          <TextInput
            placeholder="Enter bank IFSC"
            placeholderTextColor="#98A2B3"
            autoCapitalize="characters"
            value={documents.bankIfsc}
            onChangeText={(value) => setDocuments((prev) => ({ ...prev, bankIfsc: value.toUpperCase() }))}
            style={styles.input}
          />

          <Text style={styles.helperText}>Upload any one: Cancelled Cheque (Recommended) / Passbook / Bank Statement</Text>
          <View style={styles.categoryWrap}>
            {(["cheque", "passbook", "statement"] as const).map((type) => {
              const selected = documents.bankDocumentType === type;
              return (
                <TouchableOpacity key={type} style={[styles.categoryChip, selected && styles.categoryChipSelected]} onPress={() => setDocuments((prev) => ({ ...prev, bankDocumentType: type }))}>
                  <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
                    {type === "cheque" ? "Cancelled Cheque" : type === "passbook" ? "Passbook" : "Bank Statement"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {documents.bankDocumentType === "passbook"
            ? renderDocCard("Bank Passbook", "First page image for payout verification", "bankPassbookUrl", true)
            : documents.bankDocumentType === "statement"
              ? renderDocCard("Bank Statement", "Recent statement as PDF/image", "bankStatementUrl", true)
              : renderDocCard("Cancelled Cheque", "Recommended payout verification proof", "cancelledChequeUrl", true)}

          <Text style={styles.sectionTitle}>If applicable</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>Conditional documents</Text>
            <Text style={styles.tipText}>
              GST is required only if turnover is above Rs 20 lakh per year. The rest help with verification but are not mandatory.
            </Text>
          </View>

          {optionalDocs.map((doc) => renderDocCard(doc.title, doc.subtitle, doc.key))}

          <TouchableOpacity style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={submit} disabled={submitting || uploadingKey !== null}>
            {submitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.submitButtonText}>Submit for Approval</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
    backgroundColor: "#F4F8FF"
  },
  previewOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(26, 18, 11, 0.56)"
  },
  previewSheet: {
    maxHeight: "88%",
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E6F7",
    padding: 16
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12
  },
  previewTitleWrap: {
    flex: 1,
    marginRight: 12
  },
  previewEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: "#2F80ED",
    marginBottom: 4
  },
  previewTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "800",
    color: "#2C2018"
  },
  previewCloseButton: {
    borderRadius: 14,
    backgroundColor: "#ECF4FF",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  previewCloseText: {
    color: "#44678E",
    fontSize: 12,
    fontWeight: "800"
  },
  previewImage: {
    width: "100%",
    height: 360,
    borderRadius: 18,
    backgroundColor: "#2C2018"
  },
  previewHelp: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: "#6B5E55"
  },
  previewActions: {
    flexDirection: "row",
    marginTop: 14
  },
  previewSecondaryButton: {
    flex: 1,
    marginRight: 10,
    borderRadius: 16,
    backgroundColor: "#ECF4FF",
    alignItems: "center",
    paddingVertical: 14
  },
  previewSecondaryText: {
    color: "#44678E",
    fontSize: 13,
    fontWeight: "800"
  },
  previewPrimaryButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#2F80ED",
    alignItems: "center",
    paddingVertical: 14
  },
  previewPrimaryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },
  container: {
    flex: 1,
    backgroundColor: "#F4F8FF"
  },
  hero: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 22,
    borderRadius: 28,
    backgroundColor: "#2F80ED"
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: "#DDEBFF",
    marginBottom: 10
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#EAF3FF"
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#D9E6F7",
    padding: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2C2018",
    marginTop: 8,
    marginBottom: 14
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B5E55",
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: "#D5E3F5",
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
    color: "#123456",
    backgroundColor: "#F9FCFF",
    marginBottom: 12
  },
  disabledInput: {
    backgroundColor: "#F1ECE6",
    color: "#7B6D63"
  },
  helperText: {
    marginTop: -6,
    marginBottom: 10,
    fontSize: 12,
    color: "#50745E"
  },
  suggestionCard: {
    marginTop: -4,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EADFD3",
    overflow: "hidden",
    backgroundColor: "#FFFDF9"
  },
  suggestionRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F2E9E0"
  },
  suggestionText: {
    fontSize: 14,
    color: "#2C2018"
  },
  row: {
    flexDirection: "row"
  },
  half: {
    flex: 1,
    marginRight: 10
  },
  utilityButton: {
    alignSelf: "flex-start",
    backgroundColor: "#ECF4FF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12
  },
  utilityButtonText: {
    color: "#2F80ED",
    fontWeight: "700",
    fontSize: 13
  },
  primaryActionButton: {
    alignSelf: "stretch",
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 10
  },
  primaryActionButtonDisabled: {
    backgroundColor: "#FFB48A"
  },
  primaryActionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800"
  },
  successCard: {
    backgroundColor: "#ECFDF3",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#A6F4C5"
  },
  successCardText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "700"
  },
  tipCard: {
    backgroundColor: "#F1F7FF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D9E6F7",
    marginBottom: 14
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 4
  },
  tipText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6B5E55"
  },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#ECF4FF",
    marginRight: 8,
    marginBottom: 8
  },
  categoryChipSelected: {
    backgroundColor: "#2F80ED"
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#44678E"
  },
  categoryChipTextSelected: {
    color: "#FFFFFF"
  },
  docCard: {
    backgroundColor: "#F9FCFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D9E6F7",
    padding: 14,
    marginBottom: 12
  },
  docHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  docCopy: {
    flex: 1,
    marginRight: 12
  },
  docTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 4
  },
  docSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: "#7B6D63"
  },
  docBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  docBadgePending: {
    backgroundColor: "#EAF3FF"
  },
  docBadgeDone: {
    backgroundColor: "#DDF8E5"
  },
  docBadgeText: {
    fontSize: 10,
    fontWeight: "800"
  },
  docBadgePendingText: {
    color: "#44678E"
  },
  docBadgeDoneText: {
    color: "#216E39"
  },
  docPreview: {
    width: "100%",
    height: 160,
    borderRadius: 14,
    marginTop: 12,
    marginBottom: 12
  },
  docButton: {
    backgroundColor: "#2F80ED",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 10
  },
  docButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },
  submitButton: {
    backgroundColor: "#2F80ED",
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 6
  },
  submitButtonDisabled: {
    backgroundColor: "#FFB08F"
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800"
  }
});
