import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDeliveryProfile, type DeliveryProfile } from "../api/profile.api";
import {
  saveRegistrationBasics,
  sendAadhaarOtp,
  skipBank,
  skipPan,
  verifyAadhaarOtp,
  verifyBank,
  verifyPan
} from "../api/kyc.api";

const GREEN = "#16A34A";
const VEHICLE_TYPES: DeliveryProfile["vehicleType"][] = ["Bike", "Scooter", "EV", "Cycle", "Car"];
const DRAFT_KEY = "delivery_kyc_registration_draft_v1";

type Step = 0 | 1 | 2 | 3;

const motorVehicle = (type: string) => !["cycle", "bicycle", "ev"].includes(type.toLowerCase());

export default function KycRegistrationScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [profile, setProfile] = useState<DeliveryProfile | null>(null);

  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarConsent, setAadhaarConsent] = useState(false);
  const [aadhaarOtpSent, setAadhaarOtpSent] = useState(false);
  const [aadhaarOtp, setAadhaarOtp] = useState("");
  const [initiationTransactionId, setInitiationTransactionId] = useState("");
  const [lockedName, setLockedName] = useState("");

  const [vehicleType, setVehicleType] = useState<DeliveryProfile["vehicleType"]>("Bike");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [panNumber, setPanNumber] = useState("");
  const [panConsent, setPanConsent] = useState(false);

  const [bankAccountHolderName, setBankAccountHolderName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankUpiId, setBankUpiId] = useState("");

  const steps = useMemo(
    () => [
      { key: "aadhaar", title: "Aadhaar", subtitle: "Verify identity" },
      { key: "basics", title: "Details", subtitle: "Vehicle & contact" },
      { key: "pan", title: "PAN", subtitle: "Optional" },
      { key: "bank", title: "Bank", subtitle: "For payouts" }
    ],
    []
  );

  const finishToMain = async () => {
    await AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  };

  const hydrateFromProfile = (data: DeliveryProfile) => {
    setProfile(data);
    const docs = data.documents || {};
    if (docs.aadhaarVerified) {
      setLockedName(docs.aadhaarName || data.name || "");
      setAadhaarNumber(docs.aadhaarNumber || "");
      setAadhaarOtpSent(true);
    }
    setVehicleType(data.vehicleType || "Bike");
    setVehicleNumber(data.vehicleNumber || "");
    setLicenseNumber(data.licenseNumber || "");
    setEmergencyContactName(data.emergencyContactName || "");
    setEmergencyContactPhone(data.emergencyContactPhone || "");
    setTermsAccepted(Boolean(data.termsAcceptedAt));
    setPanNumber(docs.panNumber || "");
    setBankAccountHolderName(docs.bankAccountHolderName || docs.aadhaarName || data.name || "");
    setBankAccountNumber(docs.bankAccountNumber || "");
    setBankIfsc(docs.bankIfsc || "");
    setBankUpiId(docs.bankUpiId || "");

    if (!docs.aadhaarVerified) setStep(0);
    else if (!data.termsAcceptedAt || !data.emergencyContactName) setStep(1);
    else if (!docs.panVerified && !docs.panSkipped) setStep(2);
    else if (docs.bankVerificationStatus !== "VERIFIED" && !docs.bankDetailsSkipped) setStep(3);
    else {
      // Fully done — enter app
      finishToMain().catch(() => {});
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getDeliveryProfile();
        if (response.success && response.data) {
          if (response.data.status === "ACTIVE" && response.data.isProfileComplete) {
            const docs = response.data.documents || {};
            // Still allow completing skipped PAN/bank during registration if they landed here.
            if (docs.aadhaarVerified && docs.panSkipped && docs.bankDetailsSkipped) {
              await finishToMain();
              return;
            }
          }
          hydrateFromProfile(response.data);
        } else {
          Alert.alert("Error", response.message || "Failed to load profile");
        }
      } catch (error: any) {
        Alert.alert("Error", error?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSendAadhaarOtp = async () => {
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      Alert.alert("Invalid Aadhaar", "Enter a valid 12-digit Aadhaar number.");
      return;
    }
    if (!aadhaarConsent) {
      Alert.alert("Consent required", "Please consent to Aadhaar verification to continue.");
      return;
    }
    setBusy(true);
    try {
      const response = await sendAadhaarOtp({ aadhaarNumber, consent: true });
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to send Aadhaar OTP");
      }
      setInitiationTransactionId(response.data.initiationTransactionId);
      setAadhaarOtpSent(true);
      Alert.alert("OTP sent", response.data.message || "Enter the OTP sent to your Aadhaar-linked mobile.");
    } catch (error: any) {
      Alert.alert("Aadhaar OTP failed", error?.message || "Could not send OTP");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyAadhaar = async () => {
    if (!/^\d{6}$/.test(aadhaarOtp)) {
      Alert.alert("Invalid OTP", "Enter the 6-digit OTP.");
      return;
    }
    setBusy(true);
    try {
      const response = await verifyAadhaarOtp({
        otp: aadhaarOtp,
        initiationTransactionId: initiationTransactionId || undefined
      });
      if (!response.success || !response.data) {
        throw new Error(response.message || "Aadhaar verification failed");
      }
      setProfile(response.data);
      setLockedName(response.data.extracted?.name || response.data.name || "");
      setBankAccountHolderName(response.data.extracted?.name || response.data.name || "");
      setStep(1);
      Alert.alert("Aadhaar verified", `Name locked as ${response.data.extracted?.name || response.data.name}`);
    } catch (error: any) {
      Alert.alert("Verification failed", error?.message || "Could not verify Aadhaar OTP");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveBasics = async () => {
    if (!emergencyContactName.trim()) {
      Alert.alert("Missing details", "Emergency contact name is required.");
      return;
    }
    if (!/^\d{10}$/.test(emergencyContactPhone)) {
      Alert.alert("Missing details", "Enter a valid 10-digit emergency contact number.");
      return;
    }
    if (motorVehicle(vehicleType) && !vehicleNumber.trim()) {
      Alert.alert("Missing details", "Vehicle number is required for this vehicle type.");
      return;
    }
    if (!termsAccepted) {
      Alert.alert("Terms required", "Please accept the terms to continue.");
      return;
    }
    setBusy(true);
    try {
      const response = await saveRegistrationBasics({
        vehicleType,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        licenseNumber: licenseNumber.trim().toUpperCase(),
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone,
        termsAccepted: true
      });
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to save details");
      }
      setProfile(response.data);
      setStep(2);
    } catch (error: any) {
      Alert.alert("Save failed", error?.message || "Could not save registration details");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyPan = async () => {
    const pan = panNumber.trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      Alert.alert("Invalid PAN", "PAN must match AAAAA9999A format.");
      return;
    }
    if (!panConsent) {
      Alert.alert("Consent required", "Please consent to PAN verification.");
      return;
    }
    setBusy(true);
    try {
      const response = await verifyPan({ panNumber: pan, consent: true });
      if (!response.success || !response.data) {
        throw new Error(response.message || "PAN verification failed");
      }
      setProfile(response.data);
      setStep(3);
    } catch (error: any) {
      Alert.alert("PAN failed", error?.message || "Could not verify PAN");
    } finally {
      setBusy(false);
    }
  };

  const handleSkipPan = async () => {
    setBusy(true);
    try {
      const response = await skipPan();
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to skip PAN");
      }
      setProfile(response.data);
      setStep(3);
    } catch (error: any) {
      Alert.alert("Skip failed", error?.message || "Could not skip PAN");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyBank = async () => {
    if (!bankAccountNumber.trim() || !bankIfsc.trim()) {
      Alert.alert("Missing details", "Account number and IFSC are required.");
      return;
    }
    if (!/^[0-9]+$/.test(bankAccountNumber.trim())) {
      Alert.alert("Invalid account", "Account number must be numeric.");
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc.trim().toUpperCase())) {
      Alert.alert("Invalid IFSC", "Enter a valid IFSC code.");
      return;
    }
    setBusy(true);
    try {
      const response = await verifyBank({
        bankAccountNumber: bankAccountNumber.trim(),
        bankIfsc: bankIfsc.trim().toUpperCase(),
        bankAccountHolderName: bankAccountHolderName.trim() || lockedName,
        bankUpiId: bankUpiId.trim().toLowerCase() || undefined,
        allowAdminFallback: true
      });
      if (!response.success || !response.data) {
        throw new Error(response.message || "Bank verification failed");
      }
      if (response.data.adminFallback) {
        Alert.alert(
          "Submitted for review",
          response.data.decentroError
            ? `Decentro could not verify automatically. ${response.data.decentroError}`
            : "Bank details sent for admin review. You can start delivering."
        );
      }
      await finishToMain();
    } catch (error: any) {
      Alert.alert("Bank verify failed", error?.message || "Could not verify bank details");
    } finally {
      setBusy(false);
    }
  };

  const handleSkipBank = async () => {
    setBusy(true);
    try {
      const response = await skipBank();
      if (!response.success) {
        throw new Error(response.message || "Failed to skip bank details");
      }
      Alert.alert("Skipped", "Add bank details later in Profile to withdraw earnings.");
      await finishToMain();
    } catch (error: any) {
      Alert.alert("Skip failed", error?.message || "Could not skip bank details");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading registration...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heroTitle}>Rider registration</Text>
        <Text style={styles.heroSubtitle}>Verify Aadhaar to go online. PAN and bank can wait.</Text>

        <View style={styles.progressRow}>
          {steps.map((item, index) => {
            const active = index <= step;
            return (
              <View key={item.key} style={styles.progressItem}>
                <View style={[styles.progressDot, active && styles.progressDotActive]}>
                  <Text style={[styles.progressDotText, active && styles.progressDotTextActive]}>{index + 1}</Text>
                </View>
                <Text style={[styles.progressLabel, active && styles.progressLabelActive]}>{item.title}</Text>
              </View>
            );
          })}
        </View>

        {step === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Aadhaar verification</Text>
            <Text style={styles.cardHint}>OTP is sent to the mobile linked with your Aadhaar.</Text>
            <Text style={styles.label}>Aadhaar number</Text>
            <TextInput
              style={styles.input}
              value={aadhaarNumber}
              onChangeText={(v) => setAadhaarNumber(v.replace(/\D/g, "").slice(0, 12))}
              keyboardType="number-pad"
              maxLength={12}
              placeholder="12-digit Aadhaar"
              placeholderTextColor="#98A2B3"
              editable={!profile?.documents?.aadhaarVerified}
            />
            <TouchableOpacity style={styles.checkRow} onPress={() => setAadhaarConsent((c) => !c)} activeOpacity={0.8}>
              <Ionicons name={aadhaarConsent ? "checkbox" : "square-outline"} size={22} color={aadhaarConsent ? GREEN : "#98A2B3"} />
              <Text style={styles.checkText}>I consent to verify my Aadhaar for rider onboarding</Text>
            </TouchableOpacity>
            {!aadhaarOtpSent || !profile?.documents?.aadhaarVerified ? (
              <TouchableOpacity style={[styles.primaryBtn, busy && styles.btnDisabled]} onPress={handleSendAadhaarOtp} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Send Aadhaar OTP</Text>}
              </TouchableOpacity>
            ) : null}
            {aadhaarOtpSent && !profile?.documents?.aadhaarVerified ? (
              <>
                <Text style={[styles.label, { marginTop: 16 }]}>Enter OTP</Text>
                <TextInput
                  style={styles.input}
                  value={aadhaarOtp}
                  onChangeText={(v) => setAadhaarOtp(v.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="6-digit OTP"
                  placeholderTextColor="#98A2B3"
                />
                <TouchableOpacity style={[styles.primaryBtn, busy && styles.btnDisabled]} onPress={handleVerifyAadhaar} disabled={busy}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify & lock name</Text>}
                </TouchableOpacity>
              </>
            ) : null}
            {lockedName ? (
              <View style={styles.lockBanner}>
                <Ionicons name="lock-closed" size={16} color={GREEN} />
                <Text style={styles.lockBannerText}>Name locked: {lockedName}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rider details</Text>
            <Text style={styles.label}>Full name (from Aadhaar)</Text>
            <TextInput style={[styles.input, styles.inputLocked]} value={lockedName || profile?.name || ""} editable={false} />
            <Text style={styles.label}>Vehicle type</Text>
            <View style={styles.chipRow}>
              {VEHICLE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, vehicleType === type && styles.chipActive]}
                  onPress={() => setVehicleType(type)}
                >
                  <Text style={[styles.chipText, vehicleType === type && styles.chipTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {motorVehicle(vehicleType) ? (
              <>
                <Text style={styles.label}>Vehicle number</Text>
                <TextInput
                  style={styles.input}
                  value={vehicleNumber}
                  onChangeText={(v) => setVehicleNumber(v.toUpperCase())}
                  autoCapitalize="characters"
                  placeholder="e.g. TS09AB1234"
                  placeholderTextColor="#98A2B3"
                />
                <Text style={styles.label}>Driving license (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={licenseNumber}
                  onChangeText={(v) => setLicenseNumber(v.toUpperCase())}
                  autoCapitalize="characters"
                  placeholder="License number"
                  placeholderTextColor="#98A2B3"
                />
              </>
            ) : null}
            <Text style={styles.label}>Emergency contact name</Text>
            <TextInput
              style={styles.input}
              value={emergencyContactName}
              onChangeText={setEmergencyContactName}
              placeholder="Contact name"
              placeholderTextColor="#98A2B3"
            />
            <Text style={styles.label}>Emergency contact phone</Text>
            <TextInput
              style={styles.input}
              value={emergencyContactPhone}
              onChangeText={(v) => setEmergencyContactPhone(v.replace(/\D/g, "").slice(0, 10))}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="10-digit mobile"
              placeholderTextColor="#98A2B3"
            />
            <TouchableOpacity style={styles.checkRow} onPress={() => setTermsAccepted((c) => !c)} activeOpacity={0.8}>
              <Ionicons name={termsAccepted ? "checkbox" : "square-outline"} size={22} color={termsAccepted ? GREEN : "#98A2B3"} />
              <Text style={styles.checkText}>I accept Vyaha delivery partner terms</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, busy && styles.btnDisabled]} onPress={handleSaveBasics} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Continue</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>PAN verification</Text>
            <Text style={styles.cardHint}>Optional now — you can add PAN later from Profile.</Text>
            <Text style={styles.label}>PAN number</Text>
            <TextInput
              style={styles.input}
              value={panNumber}
              onChangeText={(v) => setPanNumber(v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
              autoCapitalize="characters"
              maxLength={10}
              placeholder="AAAAA9999A"
              placeholderTextColor="#98A2B3"
            />
            <TouchableOpacity style={styles.checkRow} onPress={() => setPanConsent((c) => !c)} activeOpacity={0.8}>
              <Ionicons name={panConsent ? "checkbox" : "square-outline"} size={22} color={panConsent ? GREEN : "#98A2B3"} />
              <Text style={styles.checkText}>I consent to PAN verification</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, busy && styles.btnDisabled]} onPress={handleVerifyPan} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify PAN</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleSkipPan} disabled={busy}>
              <Text style={styles.secondaryBtnText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bank for payouts</Text>
            <Text style={styles.cardHint}>Verified via Decentro. Skip now and add later to withdraw.</Text>
            <Text style={styles.label}>Account holder name</Text>
            <TextInput
              style={styles.input}
              value={bankAccountHolderName}
              onChangeText={setBankAccountHolderName}
              placeholder="As on bank account"
              placeholderTextColor="#98A2B3"
            />
            <Text style={styles.label}>Account number</Text>
            <TextInput
              style={styles.input}
              value={bankAccountNumber}
              onChangeText={(v) => setBankAccountNumber(v.replace(/\D/g, ""))}
              keyboardType="number-pad"
              placeholder="Account number"
              placeholderTextColor="#98A2B3"
            />
            <Text style={styles.label}>IFSC</Text>
            <TextInput
              style={styles.input}
              value={bankIfsc}
              onChangeText={(v) => setBankIfsc(v.toUpperCase())}
              autoCapitalize="characters"
              placeholder="HDFC0001234"
              placeholderTextColor="#98A2B3"
            />
            <Text style={styles.label}>UPI ID (optional)</Text>
            <TextInput
              style={styles.input}
              value={bankUpiId}
              onChangeText={(v) => setBankUpiId(v.trim().toLowerCase())}
              autoCapitalize="none"
              placeholder="name@upi"
              placeholderTextColor="#98A2B3"
            />
            <TouchableOpacity style={[styles.primaryBtn, busy && styles.btnDisabled]} onPress={handleVerifyBank} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify bank</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleSkipBank} disabled={busy}>
              <Text style={styles.secondaryBtnText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" },
  loadingText: { marginTop: 12, color: "#667085", fontSize: 15 },
  container: { padding: 20 },
  heroTitle: { fontSize: 26, fontWeight: "700", color: "#101828", marginBottom: 6 },
  heroSubtitle: { fontSize: 15, color: "#667085", marginBottom: 20, lineHeight: 22 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  progressItem: { alignItems: "center", flex: 1 },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E4E7EC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6
  },
  progressDotActive: { backgroundColor: GREEN },
  progressDotText: { fontSize: 13, fontWeight: "700", color: "#667085" },
  progressDotTextActive: { color: "#fff" },
  progressLabel: { fontSize: 12, color: "#98A2B3" },
  progressLabelActive: { color: GREEN, fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EAECF0"
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#101828", marginBottom: 6 },
  cardHint: { fontSize: 13, color: "#667085", marginBottom: 14, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: "600", color: "#344054", marginBottom: 6, marginTop: 10 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#101828",
    backgroundColor: "#fff"
  },
  inputLocked: { backgroundColor: "#F2F4F7", color: "#475467" },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 14, marginBottom: 8 },
  checkText: { flex: 1, fontSize: 13, color: "#475467", lineHeight: 18 },
  primaryBtn: {
    marginTop: 14,
    height: 48,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center"
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  secondaryBtn: {
    marginTop: 10,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryBtnText: { color: "#344054", fontSize: 14, fontWeight: "600" },
  lockBanner: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF3",
    borderRadius: 10,
    padding: 10
  },
  lockBannerText: { color: "#027A48", fontWeight: "600", fontSize: 13, flex: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    backgroundColor: "#fff"
  },
  chipActive: { backgroundColor: "#ECFDF3", borderColor: GREEN },
  chipText: { fontSize: 13, color: "#475467", fontWeight: "600" },
  chipTextActive: { color: GREEN }
});
