import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
  skipPartnerPan,
  verifyPartnerPan,
  type PartnerKycState
} from "../../api/kyc.api";

type Props = {
  kyc: PartnerKycState;
  onKycChange: (next: PartnerKycState) => void;
  ownerName: string;
  restaurantName: string;
  panNumber: string;
  onPanNumberChange: (value: string) => void;
  fssaiUrl: string;
  gstRegistered: "yes" | "no" | "";
  onGstRegisteredChange: (value: "yes" | "no") => void;
  gstNumber: string;
  onGstNumberChange: (value: string) => void;
  gstUrl: string;
  uploadingKey: string | null;
  pickerBusy: boolean;
  onPickDocument: (key: "fssaiUrl" | "gstUrl") => void;
};

const Check = ({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) => (
  <Pressable style={styles.checkRow} onPress={onPress} hitSlop={6}>
    <Ionicons name={checked ? "checkbox" : "square-outline"} size={18} color={checked ? partnerTheme.colors.primary : "#98A2B3"} />
    <Text style={styles.checkText}>{label}</Text>
  </Pressable>
);

const VerifiedBadge = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <View style={styles.verifiedBadge}>
    <Ionicons name="checkmark-circle" size={18} color="#216E39" />
    <View style={styles.verifiedCopy}>
      <Text style={styles.verifiedTitle}>{title}</Text>
      {subtitle ? <Text style={styles.verifiedSubtitle}>{subtitle}</Text> : null}
    </View>
  </View>
);

const isPdfUri = (uri?: string) => (uri || "").split("?")[0].toLowerCase().endsWith(".pdf");

export default function LegalDocumentsStep({
  kyc,
  onKycChange,
  ownerName,
  panNumber,
  onPanNumberChange,
  fssaiUrl,
  gstRegistered,
  onGstRegisteredChange,
  gstNumber,
  onGstNumberChange,
  gstUrl,
  uploadingKey,
  pickerBusy,
  onPickDocument
}: Props) {
  const [busy, setBusy] = useState<"" | "pan">("");
  const [panConsent, setPanConsent] = useState(false);

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
    setBusy("pan");
    try {
      const result = await verifyPartnerPan({ panNumber: pan, consent: true, ownerName });
      onKycChange(result.kyc);
      onPanNumberChange(result.kyc.panNumber || pan);
    } catch (error: any) {
      Alert.alert("PAN not verified", error?.message || "This PAN could not be verified.");
    } finally {
      setBusy("");
    }
  };

  const handleSkipPan = async () => {
    setBusy("pan");
    try {
      const result = await skipPartnerPan();
      onKycChange(result.kyc);
    } catch (error: any) {
      Alert.alert("Skip failed", error?.message || "Could not skip PAN");
    } finally {
      setBusy("");
    }
  };

  return (
    <View>
      <Text style={styles.hint}>Verify PAN with Eko, then upload FSSAI. GST is only if you are registered.</Text>

      <Text style={styles.sectionTitle}>PAN</Text>
      <Text style={styles.label}>PAN number</Text>
      <TextInput
        placeholder="AAAAA9999A"
        placeholderTextColor="#98A2B3"
        autoCapitalize="characters"
        value={panNumber}
        onChangeText={(v) => onPanNumberChange(v.toUpperCase().slice(0, 10))}
        style={[styles.input, (kyc.panVerified || kyc.panSkipped) && styles.inputLocked]}
        editable={!kyc.panVerified && !kyc.panSkipped}
      />
      {kyc.panVerified ? (
        <VerifiedBadge title="PAN verified" subtitle={kyc.panName ? `Name: ${kyc.panName}` : undefined} />
      ) : kyc.panSkipped ? (
        <VerifiedBadge title="PAN skipped" subtitle="You can add it later from Profile." />
      ) : (
        <>
          <Check checked={panConsent} onPress={() => setPanConsent((c) => !c)} label="I consent to PAN verification via Eko" />
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyPan} disabled={busy !== ""}>
              {busy === "pan" ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify PAN</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleSkipPan} disabled={busy !== ""}>
              <Text style={styles.secondaryBtnText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>FSSAI</Text>
      {kyc.fssaiVerified ? (
        <VerifiedBadge
          title="FSSAI verified"
          subtitle={[kyc.fssaiBusinessName, kyc.fssaiLicenseStatus].filter(Boolean).join(" · ") || undefined}
        />
      ) : (
        <Text style={styles.pendingHint}>
          Upload your FSSAI license. The name on it must match the restaurant name or PAN name. Vyaha will verify it during review.
        </Text>
      )}
      {fssaiUrl ? (
        <View style={styles.uploadedRow}>
          {isPdfUri(fssaiUrl) ? (
            <View style={styles.pdfBadge}><Text style={styles.pdfBadgeText}>PDF</Text></View>
          ) : (
            <Image source={{ uri: fssaiUrl }} style={styles.thumbPreview} resizeMode="cover" />
          )}
          <Text style={styles.uploadedLabel} numberOfLines={1}>FSSAI uploaded</Text>
        </View>
      ) : null}
      <TouchableOpacity
        style={fssaiUrl ? styles.outlineBtn : styles.uploadBtn}
        onPress={() => onPickDocument("fssaiUrl")}
        disabled={pickerBusy || Boolean(uploadingKey)}
      >
        {uploadingKey === "fssaiUrl" ? (
          <ActivityIndicator color={fssaiUrl ? partnerTheme.colors.primary : "#fff"} />
        ) : (
          <Text style={fssaiUrl ? styles.outlineBtnText : styles.uploadBtnText}>
            {fssaiUrl ? "Replace FSSAI" : "Upload FSSAI"}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>GST</Text>
      <View style={styles.chipRow}>
        {(["yes", "no"] as const).map((value) => {
          const selected = gstRegistered === value;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onGstRegisteredChange(value)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {value === "yes" ? "GST registered" : "No GST"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {gstRegistered === "yes" ? (
        <>
          <Text style={styles.label}>GSTIN</Text>
          <TextInput
            placeholder="15-character GSTIN"
            placeholderTextColor="#98A2B3"
            autoCapitalize="characters"
            value={gstNumber}
            onChangeText={(v) => onGstNumberChange(v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15))}
            style={styles.input}
          />
          {kyc.gstVerified ? (
            <VerifiedBadge
              title="GSTIN verified"
              subtitle={[kyc.gstLegalName, kyc.gstStatus].filter(Boolean).join(" · ") || undefined}
            />
          ) : (
            <Text style={styles.pendingHint}>Upload GST certificate for admin review.</Text>
          )}
          {gstUrl ? (
            <View style={styles.uploadedRow}>
              {isPdfUri(gstUrl) ? (
                <View style={styles.pdfBadge}><Text style={styles.pdfBadgeText}>PDF</Text></View>
              ) : (
                <Image source={{ uri: gstUrl }} style={styles.thumbPreview} resizeMode="cover" />
              )}
              <Text style={styles.uploadedLabel} numberOfLines={1}>GST uploaded</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={gstUrl ? styles.outlineBtn : styles.uploadBtn}
            onPress={() => onPickDocument("gstUrl")}
            disabled={pickerBusy || Boolean(uploadingKey)}
          >
            {uploadingKey === "gstUrl" ? (
              <ActivityIndicator color={gstUrl ? partnerTheme.colors.primary : "#fff"} />
            ) : (
              <Text style={gstUrl ? styles.outlineBtnText : styles.uploadBtnText}>
                {gstUrl ? "Replace GST" : "Upload GST"}
              </Text>
            )}
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: 8, fontSize: 12, lineHeight: 16, color: partnerTheme.colors.muted },
  sectionTitle: { marginTop: 8, marginBottom: 4, fontSize: 14, fontWeight: "900", color: partnerTheme.colors.primaryDark },
  label: { fontSize: 12, fontWeight: "700", color: partnerTheme.colors.mutedDark, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: partnerTheme.colors.text,
    backgroundColor: partnerTheme.colors.surface,
    marginBottom: 8
  },
  inputLocked: { backgroundColor: "#F1ECE6", color: "#7B6D63" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  checkText: { flex: 1, fontSize: 12, color: partnerTheme.colors.text, lineHeight: 16 },
  btnRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  primaryBtn: {
    flex: 1.2,
    backgroundColor: partnerTheme.colors.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10
  },
  primaryBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  secondaryBtn: {
    flex: 0.8,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border
  },
  secondaryBtnText: { color: partnerTheme.colors.primary, fontSize: 13, fontWeight: "800" },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: partnerTheme.colors.successSoft,
    borderRadius: 10,
    padding: 8,
    marginBottom: 8
  },
  verifiedCopy: { flex: 1 },
  verifiedTitle: { color: "#216E39", fontWeight: "800", fontSize: 13 },
  verifiedSubtitle: { marginTop: 2, color: "#216E39", fontSize: 11, lineHeight: 15 },
  pendingHint: { marginBottom: 6, fontSize: 11, lineHeight: 15, color: partnerTheme.colors.mutedDark },
  uploadedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: partnerTheme.colors.successSoft,
    borderRadius: 10
  },
  uploadedLabel: { flex: 1, fontSize: 12, fontWeight: "700", color: "#216E39" },
  thumbPreview: { width: 32, height: 32, borderRadius: 6 },
  pdfBadge: {
    backgroundColor: partnerTheme.colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3
  },
  pdfBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: partnerTheme.colors.neutralSoft,
    marginRight: 8,
    marginBottom: 6
  },
  chipSelected: { backgroundColor: partnerTheme.colors.primary },
  chipText: { fontSize: 12, fontWeight: "700", color: partnerTheme.colors.mutedDark },
  chipTextSelected: { color: "#fff" },
  uploadBtn: {
    backgroundColor: partnerTheme.colors.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginBottom: 8
  },
  uploadBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  outlineBtn: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    backgroundColor: partnerTheme.colors.surface
  },
  outlineBtnText: { color: partnerTheme.colors.primary, fontSize: 13, fontWeight: "800" }
});
