import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { partnerTheme } from "../../theme";
import {
  completePartnerDigiLocker,
  getPartnerKycStatus,
  skipPartnerPan,
  startPartnerDigiLocker,
  verifyPartnerPan,
  type PartnerKycState
} from "../../api/kyc.api";

type Props = {
  kyc: PartnerKycState;
  onKycChange: (next: PartnerKycState) => void;
  onOwnerNameLocked?: (name: string) => void;
};

const Check = ({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) => (
  <Pressable style={styles.checkRow} onPress={onPress} hitSlop={6}>
    <Ionicons name={checked ? "checkbox" : "square-outline"} size={18} color={checked ? partnerTheme.colors.primary : "#98A2B3"} />
    <Text style={styles.checkText}>{label}</Text>
  </Pressable>
);

export default function KycIdentityStep({ kyc, onKycChange, onOwnerNameLocked }: Props) {
  const [busy, setBusy] = useState(false);
  const [aadhaarConsent, setAadhaarConsent] = useState(false);
  const [panConsent, setPanConsent] = useState(false);
  const [panNumber, setPanNumber] = useState(kyc.panNumber || "");
  const [digilockerStarted, setDigilockerStarted] = useState(false);
  const [initiationTransactionId, setInitiationTransactionId] = useState("");
  const [isMockDigiLocker, setIsMockDigiLocker] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const digilockerReturnHandled = useRef(false);
  const initiationTxnRef = useRef("");

  useEffect(() => {
    getPartnerKycStatus()
      .then((status) => {
        onKycChange(status);
        if (status.panNumber) setPanNumber(status.panNumber);
        if (status.aadhaarName) onOwnerNameLocked?.(status.aadhaarName);
      })
      .catch(() => {});
  }, []);

  const finishDigiLockerFromReturn = async (params: {
    code?: string;
    referenceId?: string;
    verificationId?: string;
  }) => {
    if (digilockerReturnHandled.current) return;
    digilockerReturnHandled.current = true;
    setStatusNote("Finishing DigiLocker verification…");
    setBusy(true);
    try {
      const result = await completePartnerDigiLocker({
        initiationTransactionId: initiationTxnRef.current || initiationTransactionId || undefined,
        code: params.code,
        reference_id: params.referenceId,
        verification_id: params.verificationId
      });
      onKycChange(result.kyc);
      if (result.extracted?.name) onOwnerNameLocked?.(result.extracted.name);
      setStatusNote("Aadhaar verified successfully.");
    } catch (error: any) {
      digilockerReturnHandled.current = false;
      setStatusNote("DigiLocker returned — tap Continue to finish verification");
      Alert.alert("Verification failed", error?.message || "Could not complete DigiLocker");
    } finally {
      setBusy(false);
    }
  };

  const handleDigiLockerReturnUrl = (url: string | null) => {
    if (!url) return false;
    const isCallback =
      url.includes("kyc/digilocker/callback") ||
      url.includes("vyaha-partner://kyc/digilocker") ||
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
    const handleUrl = (url: string | null) => {
      handleDigiLockerReturnUrl(url);
    };
    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [initiationTransactionId]);

  const handleStartDigiLocker = async () => {
    if (!aadhaarConsent) {
      Alert.alert("Consent required", "Please consent to DigiLocker verification.");
      return;
    }
    setBusy(true);
    digilockerReturnHandled.current = false;
    try {
      const result = await startPartnerDigiLocker({ consent: true });
      setInitiationTransactionId(result.initiationTransactionId);
      initiationTxnRef.current = result.initiationTransactionId;
      setDigilockerStarted(true);
      setIsMockDigiLocker(Boolean(result.mock) || !result.authorizationUrl);

      if (result.authorizationUrl) {
        setStatusNote("Complete DigiLocker in your browser, then return to this app.");
        const opened = await Linking.canOpenURL(result.authorizationUrl);
        if (opened) {
          await Linking.openURL(result.authorizationUrl);
        } else {
          Alert.alert("Could not open browser", "Copy the DigiLocker link from support or try again.");
        }
      } else {
        setStatusNote(result.message || "Mock DigiLocker ready — tap Continue.");
      }
    } catch (error: any) {
      Alert.alert("DigiLocker failed", error?.message || "Could not start DigiLocker");
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteDigiLockerManual = async () => {
    setBusy(true);
    try {
      const result = await completePartnerDigiLocker({
        initiationTransactionId: initiationTxnRef.current || initiationTransactionId || undefined
      });
      onKycChange(result.kyc);
      if (result.extracted?.name) onOwnerNameLocked?.(result.extracted.name);
      setStatusNote("Aadhaar verified successfully.");
    } catch (error: any) {
      Alert.alert("Verification failed", error?.message || "Could not complete DigiLocker");
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
      const result = await verifyPartnerPan({ panNumber: pan, consent: true });
      onKycChange(result.kyc);
    } catch (error: any) {
      Alert.alert("PAN failed", error?.message || "Could not verify PAN");
    } finally {
      setBusy(false);
    }
  };

  const handleSkipPan = async () => {
    setBusy(true);
    try {
      const result = await skipPartnerPan();
      onKycChange(result.kyc);
    } catch (error: any) {
      Alert.alert("Skip failed", error?.message || "Could not skip PAN");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Text style={styles.sectionHint}>
        Verify the restaurant owner's Aadhaar through DigiLocker (via Eko). PAN verification is recommended but can be skipped.
      </Text>

      <Text style={styles.subTitle}>Aadhaar via DigiLocker</Text>
      <Check checked={aadhaarConsent} onPress={() => setAadhaarConsent((c) => !c)} label="I consent to DigiLocker / Aadhaar verification" />
      {kyc.aadhaarVerified ? (
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#216E39" />
          <Text style={styles.verifiedText}>Verified: {kyc.aadhaarName || "Owner"}</Text>
        </View>
      ) : !digilockerStarted ? (
        <TouchableOpacity style={[styles.primaryBtn, busy && styles.btnDisabled]} onPress={handleStartDigiLocker} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify with DigiLocker</Text>}
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.primaryBtn, busy && styles.btnDisabled]}
            onPress={handleCompleteDigiLockerManual}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>{isMockDigiLocker ? "Continue (mock)" : "I've finished in DigiLocker"}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={handleStartDigiLocker} disabled={busy}>
            <Text style={styles.linkBtnText}>Open DigiLocker again</Text>
          </TouchableOpacity>
        </>
      )}
      {statusNote ? <Text style={styles.statusNote}>{statusNote}</Text> : null}

      <Text style={styles.subTitle}>PAN verification</Text>
      <Text style={styles.label}>PAN number</Text>
      <TextInput
        placeholder="AAAAA9999A"
        placeholderTextColor="#98A2B3"
        autoCapitalize="characters"
        value={panNumber}
        onChangeText={(value) => setPanNumber(value.toUpperCase().slice(0, 10))}
        style={[styles.input, (kyc.panVerified || kyc.panSkipped) && styles.inputLocked]}
        editable={!kyc.panVerified && !kyc.panSkipped}
      />
      {!kyc.panVerified && !kyc.panSkipped ? (
        <>
          <Check checked={panConsent} onPress={() => setPanConsent((c) => !c)} label="I consent to PAN verification via Eko" />
          <TouchableOpacity style={[styles.primaryBtn, busy && styles.btnDisabled]} onPress={handleVerifyPan} disabled={busy || !kyc.aadhaarVerified}>
            <Text style={styles.primaryBtnText}>Verify PAN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleSkipPan} disabled={busy || !kyc.aadhaarVerified}>
            <Text style={styles.secondaryBtnText}>Skip for now</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#216E39" />
          <Text style={styles.verifiedText}>
            {kyc.panVerified ? `PAN verified${kyc.panName ? `: ${kyc.panName}` : ""}` : "PAN skipped — add later in Profile"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHint: { marginBottom: 14, fontSize: 13, lineHeight: 18, color: partnerTheme.colors.muted },
  subTitle: { marginTop: 8, marginBottom: 8, fontSize: 15, fontWeight: "900", color: partnerTheme.colors.primaryDark },
  label: { fontSize: 13, fontWeight: "700", color: partnerTheme.colors.mutedDark, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
    color: partnerTheme.colors.text,
    backgroundColor: partnerTheme.colors.surface,
    marginBottom: 12
  },
  inputLocked: { backgroundColor: "#F1ECE6", color: "#7B6D63" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  checkText: { flex: 1, fontSize: 13, color: partnerTheme.colors.text, lineHeight: 18 },
  primaryBtn: {
    backgroundColor: partnerTheme.colors.primary,
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 10
  },
  primaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  secondaryBtn: {
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    marginBottom: 10
  },
  secondaryBtnText: { color: partnerTheme.colors.primary, fontSize: 14, fontWeight: "800" },
  linkBtn: { alignItems: "center", marginBottom: 10 },
  linkBtnText: { color: partnerTheme.colors.primary, fontWeight: "700" },
  btnDisabled: { opacity: 0.7 },
  statusNote: { fontSize: 12, color: partnerTheme.colors.muted, marginBottom: 8 },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: partnerTheme.colors.successSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12
  },
  verifiedText: { color: "#216E39", fontWeight: "700", flex: 1 }
});
