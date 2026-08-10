import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  LayoutAnimation,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { getDeliveryProfile, type DeliveryProfile } from "../api/profile.api";
import {
  completeDigiLocker,
  saveRegistrationBasics,
  skipBank,
  skipPan,
  startDigiLocker,
  verifyBank,
  verifyPan,
  type AadhaarVerifyResult
} from "../api/kyc.api";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const GREEN = "#16A34A";
const VEHICLE_TYPES: DeliveryProfile["vehicleType"][] = ["Bike", "Scooter", "EV", "Cycle", "Car"];
const DRAFT_KEY = "delivery_kyc_registration_draft_v1";
const STEP_META = [
  { title: "DigiLocker", hint: "Verify Aadhaar via DigiLocker" },
  { title: "Details", hint: "Vehicle & emergency contact" },
  { title: "PAN", hint: "Optional — add later in Profile" },
  { title: "Bank", hint: "Optional — needed for payouts" }
] as const;

type Step = 0 | 1 | 2 | 3;

const motorVehicle = (type: string) => !["cycle", "bicycle", "ev"].includes(type.toLowerCase());

const Field = ({
  label,
  children,
  hint
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    {children}
    {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
  </View>
);

const Check = ({
  checked,
  onPress,
  label
}: {
  checked: boolean;
  onPress: () => void;
  label: string;
}) => (
  <Pressable style={styles.checkRow} onPress={onPress} hitSlop={6}>
    <Ionicons name={checked ? "checkbox" : "square-outline"} size={18} color={checked ? GREEN : "#98A2B3"} />
    <Text style={styles.checkText}>{label}</Text>
  </Pressable>
);

export default function KycRegistrationScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(1)).current;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [profile, setProfile] = useState<DeliveryProfile | null>(null);
  const [statusNote, setStatusNote] = useState("");

  const [aadhaarConsent, setAadhaarConsent] = useState(false);
  const [digilockerStarted, setDigilockerStarted] = useState(false);
  const [initiationTransactionId, setInitiationTransactionId] = useState("");
  const [digilockerCode, setDigilockerCode] = useState<string | undefined>();
  const [digilockerReferenceId, setDigilockerReferenceId] = useState<string | undefined>();
  const [digilockerVerificationId, setDigilockerVerificationId] = useState<string | undefined>();
  const [isMockDigiLocker, setIsMockDigiLocker] = useState(false);
  const [digilockerWebUrl, setDigilockerWebUrl] = useState<string | null>(null);
  const [webCompleting, setWebCompleting] = useState(false);
  const digilockerReturnHandled = useRef(false);
  const initiationTxnRef = useRef("");
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

  const meta = STEP_META[step];
  const progress = useMemo(() => (step + 1) / STEP_META.length, [step]);

  const animateStep = (next: Step) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.sequence([
      Animated.timing(fade, { toValue: 0.35, duration: 90, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true })
    ]).start();
    setStep(next);
    setStatusNote("");
  };

  const finishToMain = async () => {
    await AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  };

  const isBankDone = (docs?: DeliveryProfile["documents"] | null) =>
    docs?.bankVerificationStatus === "VERIFIED" || Boolean(docs?.bankDetailsSkipped);

  const goAfterPan = async (data: DeliveryProfile) => {
    setProfile(data);
    if (isBankDone(data.documents)) {
      await finishToMain();
      return;
    }
    animateStep(3);
  };

  const hydrateFromProfile = (data: DeliveryProfile) => {
    setProfile(data);
    const docs = data.documents || {};
    if (docs.aadhaarVerified) {
      setLockedName(docs.aadhaarName || data.name || "");
      setDigilockerStarted(true);
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
    else if (!isBankDone(docs)) setStep(3);
    else finishToMain().catch(() => {});
  };

  const applyDigiLockerResult = (data: AadhaarVerifyResult) => {
    const name = data.extracted?.name || data.name || "";
    setProfile(data);
    setLockedName(name);
    setBankAccountHolderName(name);
    setDigilockerWebUrl(null);
    animateStep(1);
  };

  const finishDigiLockerFromReturn = async (params: {
    code?: string;
    referenceId?: string;
    verificationId?: string;
  }) => {
    if (digilockerReturnHandled.current) return;
    digilockerReturnHandled.current = true;
    setDigilockerWebUrl(null);
    if (params.code) setDigilockerCode(params.code);
    if (params.referenceId) setDigilockerReferenceId(params.referenceId);
    if (params.verificationId) setDigilockerVerificationId(params.verificationId);
    setStatusNote("Finishing DigiLocker verification…");
    setWebCompleting(true);
    setBusy(true);
    try {
      const response = await completeDigiLocker({
        initiationTransactionId: initiationTxnRef.current || initiationTransactionId || undefined,
        code: params.code,
        reference_id: params.referenceId,
        verification_id: params.verificationId
      });
      if (!response.success || !response.data) throw new Error(response.message || "Verification failed");
      applyDigiLockerResult(response.data);
    } catch (error: any) {
      digilockerReturnHandled.current = false;
      setStatusNote("DigiLocker returned — tap Continue to finish verification");
      Alert.alert("Verification failed", error?.message || "Could not complete DigiLocker verification");
    } finally {
      setWebCompleting(false);
      setBusy(false);
    }
  };

  const handleDigiLockerReturnUrl = (url: string | null) => {
    if (!url) return false;
    const isCallback =
      url.includes("kyc/digilocker/callback") ||
      url.includes("vyaha-delivery://kyc/digilocker") ||
      url.includes("kyc/digilocker?");
    if (!isCallback) return false;
    try {
      const query = url.includes("?") ? url.split("?")[1] : "";
      const params = new URLSearchParams(query);
      const code = params.get("code") || undefined;
      const error = params.get("error");
      const referenceId = params.get("reference_id") || undefined;
      const verificationId = params.get("verification_id") || undefined;
      if (error) {
        setDigilockerWebUrl(null);
        Alert.alert("DigiLocker", error);
        return true;
      }
      void finishDigiLockerFromReturn({ code, referenceId, verificationId });
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getDeliveryProfile();
        if (response.success && response.data) {
          const docs = response.data.documents || {};
          if (
            response.data.status === "ACTIVE" &&
            docs.aadhaarVerified &&
            (docs.panVerified || docs.panSkipped) &&
            isBankDone(docs)
          ) {
            await finishToMain();
            return;
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

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      handleDigiLockerReturnUrl(url);
    };

    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [initiationTransactionId]);

  const handleStartDigiLocker = async () => {
    if (!aadhaarConsent) {
      Alert.alert("Consent required", "Please consent to DigiLocker / Aadhaar verification.");
      return;
    }
    setBusy(true);
    digilockerReturnHandled.current = false;
    try {
      const response = await startDigiLocker({ consent: true });
      if (!response.success || !response.data) throw new Error(response.message || "Failed to start DigiLocker");
      setInitiationTransactionId(response.data.initiationTransactionId);
      initiationTxnRef.current = response.data.initiationTransactionId;
      setDigilockerStarted(true);
      setIsMockDigiLocker(Boolean(response.data.mock) || !response.data.authorizationUrl);

      if (response.data.authorizationUrl) {
        setDigilockerWebUrl(response.data.authorizationUrl);
        setStatusNote("Complete DigiLocker inside the app, then we’ll finish automatically");
      } else {
        setStatusNote(response.data.message || "Mock DigiLocker ready — tap Continue to verify");
      }
    } catch (error: any) {
      Alert.alert("DigiLocker failed", error?.message || "Could not start DigiLocker");
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteDigiLocker = async () => {
    setBusy(true);
    try {
      const response = await completeDigiLocker({
        initiationTransactionId: initiationTransactionId || undefined,
        code: digilockerCode,
        reference_id: digilockerReferenceId,
        verification_id: digilockerVerificationId
      });
      if (!response.success || !response.data) throw new Error(response.message || "Verification failed");
      applyDigiLockerResult(response.data);
    } catch (error: any) {
      Alert.alert("Verification failed", error?.message || "Could not complete DigiLocker verification");
    } finally {
      setBusy(false);
    }
  };

  const onDigiLockerNavChange = (nav: WebViewNavigation) => {
    if (nav?.url) handleDigiLockerReturnUrl(nav.url);
  };

  const handleSaveBasics = async () => {
    if (!emergencyContactName.trim()) {
      Alert.alert("Missing details", "Emergency contact name is required.");
      return;
    }
    if (!/^\d{10}$/.test(emergencyContactPhone)) {
      Alert.alert("Missing details", "Enter a valid 10-digit emergency number.");
      return;
    }
    if (motorVehicle(vehicleType) && !vehicleNumber.trim()) {
      Alert.alert("Missing details", "Vehicle number is required.");
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
      if (!response.success || !response.data) throw new Error(response.message || "Failed to save");
      setProfile(response.data);
      animateStep(2);
    } catch (error: any) {
      Alert.alert("Save failed", error?.message || "Could not save details");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyPan = async () => {
    const pan = panNumber.trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      Alert.alert("Invalid PAN", "PAN must match AAAAA9999A.");
      return;
    }
    if (!panConsent) {
      Alert.alert("Consent required", "Please consent to PAN verification.");
      return;
    }
    setBusy(true);
    try {
      const response = await verifyPan({ panNumber: pan, consent: true });
      if (!response.success || !response.data) throw new Error(response.message || "PAN failed");
      await goAfterPan(response.data);
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
      if (!response.success || !response.data) throw new Error(response.message || "Failed to skip");
      await goAfterPan(response.data);
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
      if (isBankDone(profile?.documents)) {
        await finishToMain();
        return;
      }
      const response = await verifyBank({
        bankAccountNumber: bankAccountNumber.trim(),
        bankIfsc: bankIfsc.trim().toUpperCase(),
        bankAccountHolderName: bankAccountHolderName.trim() || lockedName,
        bankUpiId: bankUpiId.trim().toLowerCase() || undefined,
        allowAdminFallback: true
      });
      if (!response.success || !response.data) throw new Error(response.message || "Bank verify failed");
      if (response.data.adminFallback) {
        Alert.alert("Under review", response.data.ekoError || "Sent for admin review. You can start delivering.");
      }
      await finishToMain();
    } catch (error: any) {
      Alert.alert("Bank verify failed", error?.message || "Could not verify bank");
    } finally {
      setBusy(false);
    }
  };

  const handleSkipBank = async () => {
    setBusy(true);
    try {
      if (isBankDone(profile?.documents)) {
        await finishToMain();
        return;
      }
      const response = await skipBank();
      if (!response.success) throw new Error(response.message || "Failed to skip");
      await finishToMain();
    } catch (error: any) {
      Alert.alert("Skip failed", error?.message || "Could not skip bank");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.topBar}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.stepHeader}>
          <Text style={styles.stepCount}>
            {step + 1}/{STEP_META.length}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>{meta.title}</Text>
            <Text style={styles.stepHint}>{meta.hint}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: 16 + Math.max(insets.bottom, 8) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fade }}>
          {step === 0 ? (
            <View>
              <Text style={styles.digiIntro}>
                Verify your Aadhaar securely through DigiLocker (via Eko) inside the app. Your name will be locked from the e-Aadhaar shared with DigiLocker.
              </Text>
              <Check
                checked={aadhaarConsent}
                onPress={() => setAadhaarConsent((c) => !c)}
                label="I consent to DigiLocker / Aadhaar verification"
              />
              {statusNote ? <Text style={styles.statusNote}>{statusNote}</Text> : null}
              {lockedName ? (
                <View style={styles.lockRow}>
                  <Ionicons name="lock-closed" size={14} color={GREEN} />
                  <Text style={styles.lockText}>{lockedName}</Text>
                </View>
              ) : null}
              {!digilockerStarted || profile?.documents?.aadhaarVerified ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, busy && styles.btnDisabled]}
                  onPress={handleStartDigiLocker}
                  disabled={busy || Boolean(profile?.documents?.aadhaarVerified)}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {profile?.documents?.aadhaarVerified ? "Aadhaar verified" : "Verify with DigiLocker"}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.primaryBtn, busy && styles.btnDisabled]}
                    onPress={handleCompleteDigiLocker}
                    disabled={busy}
                  >
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>
                        {isMockDigiLocker ? "Continue (mock)" : webCompleting ? "Finishing…" : "I've finished in DigiLocker"}
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.linkBtn} onPress={handleStartDigiLocker} disabled={busy}>
                    <Text style={styles.linkBtnText}>Open DigiLocker again</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : null}

          {step === 1 ? (
            <View>
              <Field label="Name (from Aadhaar)">
                <TextInput style={[styles.input, styles.inputLocked]} value={lockedName || profile?.name || ""} editable={false} />
              </Field>
              <Field label="Vehicle">
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
              </Field>
              {motorVehicle(vehicleType) ? (
                <>
                  <Field label="Vehicle number">
                    <TextInput
                      style={styles.input}
                      value={vehicleNumber}
                      onChangeText={(v) => setVehicleNumber(v.toUpperCase())}
                      autoCapitalize="characters"
                      placeholder="TS09AB1234"
                      placeholderTextColor="#98A2B3"
                    />
                  </Field>
                  <Field label="License (optional)">
                    <TextInput
                      style={styles.input}
                      value={licenseNumber}
                      onChangeText={(v) => setLicenseNumber(v.toUpperCase())}
                      autoCapitalize="characters"
                      placeholder="License number"
                      placeholderTextColor="#98A2B3"
                    />
                  </Field>
                </>
              ) : null}
              <Field label="Emergency contact">
                <TextInput
                  style={styles.input}
                  value={emergencyContactName}
                  onChangeText={setEmergencyContactName}
                  placeholder="Name"
                  placeholderTextColor="#98A2B3"
                />
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={emergencyContactPhone}
                  onChangeText={(v) => setEmergencyContactPhone(v.replace(/\D/g, "").slice(0, 10))}
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholder="10-digit mobile"
                  placeholderTextColor="#98A2B3"
                />
              </Field>
              <Check checked={termsAccepted} onPress={() => setTermsAccepted((c) => !c)} label="I accept partner terms" />
              <TouchableOpacity style={[styles.primaryBtn, busy && styles.btnDisabled]} onPress={handleSaveBasics} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Continue</Text>}
              </TouchableOpacity>
            </View>
          ) : null}

          {step === 2 ? (
            <View>
              <Field label="PAN">
                <TextInput
                  style={styles.input}
                  value={panNumber}
                  onChangeText={(v) => setPanNumber(v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
                  autoCapitalize="characters"
                  maxLength={10}
                  placeholder="AAAAA9999A"
                  placeholderTextColor="#98A2B3"
                />
              </Field>
              <Check checked={panConsent} onPress={() => setPanConsent((c) => !c)} label="I consent to PAN verification" />
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.secondaryBtn, busy && styles.btnDisabled]} onPress={handleSkipPan} disabled={busy}>
                  <Text style={styles.secondaryBtnText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtnFlex, busy && styles.btnDisabled]} onPress={handleVerifyPan} disabled={busy}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {step === 3 ? (
            <View>
              <Field label="Account holder">
                <TextInput
                  style={styles.input}
                  value={bankAccountHolderName}
                  onChangeText={setBankAccountHolderName}
                  placeholder="As on bank account"
                  placeholderTextColor="#98A2B3"
                />
              </Field>
              <Field label="Account number">
                <TextInput
                  style={styles.input}
                  value={bankAccountNumber}
                  onChangeText={(v) => setBankAccountNumber(v.replace(/\D/g, ""))}
                  keyboardType="number-pad"
                  placeholder="Account number"
                  placeholderTextColor="#98A2B3"
                />
              </Field>
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Field label="IFSC">
                    <TextInput
                      style={styles.input}
                      value={bankIfsc}
                      onChangeText={(v) => setBankIfsc(v.toUpperCase())}
                      autoCapitalize="characters"
                      placeholder="HDFC0001234"
                      placeholderTextColor="#98A2B3"
                    />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="UPI (optional)">
                    <TextInput
                      style={styles.input}
                      value={bankUpiId}
                      onChangeText={(v) => setBankUpiId(v.trim().toLowerCase())}
                      autoCapitalize="none"
                      placeholder="name@upi"
                      placeholderTextColor="#98A2B3"
                    />
                  </Field>
                </View>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.secondaryBtn, busy && styles.btnDisabled]} onPress={handleSkipBank} disabled={busy}>
                  <Text style={styles.secondaryBtnText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtnFlex, busy && styles.btnDisabled]} onPress={handleVerifyBank} disabled={busy}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      <Modal
        visible={Boolean(digilockerWebUrl)}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setDigilockerWebUrl(null)}
      >
        <View style={[styles.webShell, { paddingTop: insets.top }]}>
          <View style={styles.webHeader}>
            <Text style={styles.webTitle}>DigiLocker</Text>
            <TouchableOpacity
              style={styles.webClose}
              onPress={() => {
                setDigilockerWebUrl(null);
                setStatusNote("Closed DigiLocker — tap Continue after finishing, or open again");
              }}
              hitSlop={8}
            >
              <Ionicons name="close" size={22} color="#101828" />
            </TouchableOpacity>
          </View>
          {webCompleting ? (
            <View style={styles.webLoading}>
              <ActivityIndicator color={GREEN} size="large" />
              <Text style={styles.webLoadingText}>Finishing verification…</Text>
            </View>
          ) : digilockerWebUrl ? (
            <WebView
              source={{ uri: digilockerWebUrl }}
              onNavigationStateChange={onDigiLockerNavChange}
              onShouldStartLoadWithRequest={(request) => {
                if (handleDigiLockerReturnUrl(request.url)) return false;
                return true;
              }}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webLoading}>
                  <ActivityIndicator color={GREEN} />
                </View>
              )}
              setSupportMultipleWindows={false}
              javaScriptEnabled
              domStorageEnabled
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              style={styles.webview}
            />
          ) : null}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EAECF0",
    backgroundColor: "#fff"
  },
  progressTrack: { height: 3, borderRadius: 2, backgroundColor: "#E4E7EC", overflow: "hidden", marginBottom: 10 },
  progressFill: { height: "100%", backgroundColor: GREEN, borderRadius: 2 },
  stepHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepCount: {
    minWidth: 36,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: GREEN,
    backgroundColor: "#ECFDF3",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    overflow: "hidden"
  },
  stepTitle: { fontSize: 16, fontWeight: "700", color: "#101828" },
  stepHint: { fontSize: 12, color: "#667085", marginTop: 1 },
  body: { paddingHorizontal: 16, paddingTop: 14 },
  digiIntro: { fontSize: 13, lineHeight: 19, color: "#475467", marginBottom: 12 },
  field: { marginBottom: 10 },
  label: { fontSize: 12, fontWeight: "600", color: "#475467", marginBottom: 5 },
  fieldHint: { fontSize: 11, color: "#98A2B3", marginTop: 4 },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    paddingHorizontal: 12,
    fontSize: 15,
    color: "#101828",
    backgroundColor: "#fff"
  },
  inputLocked: { backgroundColor: "#F2F4F7", color: "#475467" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, marginTop: 2 },
  checkText: { flex: 1, fontSize: 12, color: "#475467", lineHeight: 16 },
  statusNote: { fontSize: 12, color: GREEN, marginBottom: 8, fontWeight: "600" },
  lockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF3",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10
  },
  lockText: { flex: 1, color: "#027A48", fontSize: 12, fontWeight: "600" },
  primaryBtn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4
  },
  primaryBtnFlex: {
    flex: 1.4,
    height: 44,
    borderRadius: 10,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff"
  },
  secondaryBtnText: { color: "#344054", fontSize: 14, fontWeight: "600" },
  linkBtn: { alignItems: "center", paddingVertical: 10 },
  linkBtnText: { color: GREEN, fontSize: 13, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  twoCol: { flexDirection: "row", gap: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    backgroundColor: "#fff"
  },
  chipActive: { backgroundColor: "#ECFDF3", borderColor: GREEN },
  chipText: { fontSize: 12, color: "#475467", fontWeight: "600" },
  chipTextActive: { color: GREEN },
  btnDisabled: { opacity: 0.65 },
  webShell: { flex: 1, backgroundColor: "#fff" },
  webHeader: {
    height: 48,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EAECF0"
  },
  webTitle: { fontSize: 16, fontWeight: "700", color: "#101828" },
  webClose: { padding: 6 },
  webview: { flex: 1 },
  webLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    gap: 10
  },
  webLoadingText: { fontSize: 13, color: "#475467", fontWeight: "600" }
});
