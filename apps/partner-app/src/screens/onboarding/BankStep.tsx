import React, { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { partnerTheme } from "../../theme";
import { skipPartnerBank, verifyPartnerBank, type PartnerKycState } from "../../api/kyc.api";

type Props = {
  kyc: PartnerKycState;
  onKycChange: (next: PartnerKycState) => void;
  defaultHolderName?: string;
};

export default function BankStep({ kyc, onKycChange, defaultHolderName }: Props) {
  const [busy, setBusy] = useState(false);
  const [holderName, setHolderName] = useState(kyc.bankAccountHolderName || defaultHolderName || "");
  const [accountNumber, setAccountNumber] = useState(kyc.bankAccountNumber || "");
  const [ifsc, setIfsc] = useState(kyc.bankIfsc || "");

  const isDone = kyc.bankVerificationStatus === "VERIFIED" || kyc.bankDetailsSkipped;

  const handleVerify = async () => {
    if (!accountNumber.trim() || !ifsc.trim()) {
      Alert.alert("Missing details", "Account number and IFSC are required.");
      return;
    }
    setBusy(true);
    try {
      const result = await verifyPartnerBank({
        bankAccountNumber: accountNumber.trim(),
        bankIfsc: ifsc.trim().toUpperCase(),
        bankAccountHolderName: holderName.trim() || defaultHolderName,
        allowAdminFallback: true
      });
      onKycChange(result.kyc);
      if (result.adminFallback) {
        Alert.alert("Under review", result.ekoError || "Bank details saved for admin review.");
      }
    } catch (error: any) {
      Alert.alert("Bank verify failed", error?.message || "Could not verify bank");
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = async () => {
    setBusy(true);
    try {
      const result = await skipPartnerBank();
      onKycChange(result.kyc);
    } catch (error: any) {
      Alert.alert("Skip failed", error?.message || "Could not skip bank");
    } finally {
      setBusy(false);
    }
  };

  if (isDone) {
    return (
      <View style={styles.doneBox}>
        <Text style={styles.doneText}>
          {kyc.bankVerificationStatus === "VERIFIED"
            ? `Payout account verified${kyc.bankAccountHolderName ? `: ${kyc.bankAccountHolderName}` : ""}`
            : "Bank details skipped — add them later from Profile before your first payout."}
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.hint}>Verify the bank account where you want to receive payouts. You can skip and add this later.</Text>
      <Text style={styles.label}>Account holder name</Text>
      <TextInput
        style={styles.input}
        placeholder="As per bank records"
        placeholderTextColor="#98A2B3"
        value={holderName}
        onChangeText={setHolderName}
      />
      <Text style={styles.label}>Bank account number</Text>
      <TextInput
        style={styles.input}
        placeholder="Account number"
        placeholderTextColor="#98A2B3"
        keyboardType="number-pad"
        value={accountNumber}
        onChangeText={(v) => setAccountNumber(v.replace(/\D/g, ""))}
      />
      <Text style={styles.label}>IFSC code</Text>
      <TextInput
        style={styles.input}
        placeholder="IFSC"
        placeholderTextColor="#98A2B3"
        autoCapitalize="characters"
        value={ifsc}
        onChangeText={(v) => setIfsc(v.toUpperCase())}
      />
      <TouchableOpacity style={[styles.primaryBtn, busy && styles.disabled]} onPress={handleVerify} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify bank account</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={handleSkip} disabled={busy}>
        <Text style={styles.secondaryBtnText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: 12, fontSize: 13, lineHeight: 18, color: partnerTheme.colors.muted },
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
  primaryBtn: { backgroundColor: partnerTheme.colors.primary, borderRadius: 16, alignItems: "center", paddingVertical: 14, marginBottom: 10 },
  primaryBtnText: { color: "#fff", fontWeight: "800" },
  secondaryBtn: { borderRadius: 16, alignItems: "center", paddingVertical: 14, borderWidth: 1, borderColor: partnerTheme.colors.border },
  secondaryBtnText: { color: partnerTheme.colors.primary, fontWeight: "800" },
  disabled: { opacity: 0.7 },
  doneBox: { backgroundColor: partnerTheme.colors.successSoft, borderRadius: 14, padding: 14 },
  doneText: { color: "#216E39", fontWeight: "700", lineHeight: 20 }
});
