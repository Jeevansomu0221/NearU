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
  Image
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/client";

const CATEGORIES = ["bakery", "mini-restaurant", "tiffin-center", "fast-food", "sweets", "ice-creams", "juice", "other"];

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
  operatingHoursNote: string;
};

interface UploadResponse {
  success: boolean;
  data?: {
    url: string;
  };
  message?: string;
}

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
  const extension = filename.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";
  if (extension === "pdf") return "application/pdf";
  return "image/jpeg";
};

export default function OnboardingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<UploadingKey>(null);
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
    menuProofUrl: "",
    operatingHoursNote: ""
  });
  const [selectedCategory, setSelectedCategory] = useState("");
  const [autoFilledPhone, setAutoFilledPhone] = useState("");

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

  const uploadImageToCloudinary = async (imageUri: string): Promise<string> => {
    const formData = new FormData();
    const filename = imageUri.split("/").pop() || "document.jpg";
    const type = getUploadMimeType(filename);

    // @ts-ignore React Native FormData file object
    formData.append("image", {
      uri: imageUri,
      type,
      name: filename
    });

    const response = await api.post<UploadResponse>("/upload/image", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      },
      timeout: 420000
    });

    const uploadData = response.data;

    if (!uploadData?.success || !uploadData?.data?.url) {
      throw new Error(uploadData?.message || "Upload failed");
    }

    return uploadData.data.url;
  };

  const pickAndUploadDocument = async (docKey: UploadingKey) => {
    if (!docKey) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow gallery access to upload your documents.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.6
      });

      if (result.canceled || !result.assets[0]?.uri) {
        return;
      }

      setUploadingKey(docKey);
      const uploadedUrl = await uploadImageToCloudinary(result.assets[0].uri);
      setDocuments((prev) => ({ ...prev, [docKey]: uploadedUrl }));
    } catch (error: any) {
      console.error("Document upload failed:", error);
      Alert.alert("Upload Failed", error.message || "Failed to upload document.");
    } finally {
      setUploadingKey(null);
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
    if (!address.state || !address.city || !address.pincode || !address.area || !address.colony || !address.roadStreet || !address.googleMapsLink) {
      return "Please fill all address fields including the shop Google Maps link";
    }
    if (!/^\d{6}$/.test(address.pincode)) {
      return "Pincode must be exactly 6 digits";
    }
    if (
      !address.googleMapsLink.startsWith("https://maps.app.goo.gl/") &&
      !address.googleMapsLink.startsWith("https://goo.gl/maps/") &&
      !address.googleMapsLink.startsWith("https://www.google.com/maps/") &&
      !address.googleMapsLink.startsWith("https://www.google.co.in/maps/")
    ) {
      return "Please provide a valid Google Maps link";
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

      const requestData = {
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
          bankIfsc: documents.bankIfsc.trim().toUpperCase(),
          operatingHoursNote: documents.operatingHoursNote.trim()
        }
      };

      await api.post("/partners/onboard", requestData);
      await AsyncStorage.setItem("partnerPhone", form.phone);

      Alert.alert(
        "Application Submitted",
        "Your business details and mandatory documents were submitted successfully for admin review.",
        [{ text: "OK", onPress: () => navigation.replace("PendingApproval") }]
      );
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

        <TouchableOpacity style={styles.docButton} onPress={() => pickAndUploadDocument(docKey as UploadingKey)} disabled={isUploading}>
          {isUploading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.docButtonText}>{uploaded ? "Replace Document" : "Upload Document"}</Text>}
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
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>NearU Partner</Text>
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

          <Text style={styles.label}>Shop Google Maps link</Text>
          <TextInput placeholder="Paste the shop Google Maps share link" placeholderTextColor="#98A2B3" value={address.googleMapsLink} onChangeText={(v) => setAddress({ ...address, googleMapsLink: v })} style={styles.input} />

          <TouchableOpacity style={styles.utilityButton} onPress={() => Linking.openURL("https://maps.google.com")}>
            <Text style={styles.utilityButtonText}>Open Google Maps</Text>
          </TouchableOpacity>

          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>How to get the link</Text>
            <Text style={styles.tipText}>Open Google Maps, find your shop location, tap Share, then copy the shop link.</Text>
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

          <Text style={styles.label}>Operating hours note</Text>
          <TextInput
            placeholder="Example: 8:00 AM to 10:00 PM"
            placeholderTextColor="#98A2B3"
            value={documents.operatingHoursNote}
            onChangeText={(value) => setDocuments((prev) => ({ ...prev, operatingHoursNote: value }))}
            style={styles.input}
          />

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
    backgroundColor: "#F7F3EE"
  },
  container: {
    flex: 1,
    backgroundColor: "#F7F3EE"
  },
  hero: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 22,
    borderRadius: 28,
    backgroundColor: "#FF6B35"
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: "#FFE4D7",
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
    color: "#FFF3EC"
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#EFE5DA",
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
    borderColor: "#D9D0C5",
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
    color: "#1A120B",
    backgroundColor: "#FFFCF8",
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
    backgroundColor: "#FDE9DE",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12
  },
  utilityButtonText: {
    color: "#C4541C",
    fontWeight: "700",
    fontSize: 13
  },
  tipCard: {
    backgroundColor: "#FFF6EF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F3DED0",
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
    backgroundColor: "#F8EFE7",
    marginRight: 8,
    marginBottom: 8
  },
  categoryChipSelected: {
    backgroundColor: "#FF6B35"
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7A5640"
  },
  categoryChipTextSelected: {
    color: "#FFFFFF"
  },
  docCard: {
    backgroundColor: "#FFFCF8",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EFE5DA",
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
    backgroundColor: "#FFF2D9"
  },
  docBadgeDone: {
    backgroundColor: "#DDF8E5"
  },
  docBadgeText: {
    fontSize: 10,
    fontWeight: "800"
  },
  docBadgePendingText: {
    color: "#A15C00"
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
    backgroundColor: "#FF6B35",
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
    backgroundColor: "#FF6B35",
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
