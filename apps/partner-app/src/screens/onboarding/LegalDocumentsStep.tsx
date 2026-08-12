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
  verifyPartnerFssai,
  verifyPartnerGst,
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
  fssaiNumber: string;
  onFssaiNumberChange: (value: string) => void;
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

const InvalidHint = () => (
  <Text style={styles.invalidHint}>Tap Verify — Eko checks government records and shows whether this is legitimate.</Text>
);

const isPdfUri = (uri?: string) => (uri || "").split("?")[0].toLowerCase().endsWith(".pdf");

const DocUpload = ({
  title,
  subtitle,
  url,
  busy,
  disabled,
  onPress
}: {
  title: string;
  subtitle: string;
  url: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) => (
  <View style={styles.docCard}>
    <Text style={styles.docTitle}>{title}</Text>
    <Text style={styles.docSubtitle}>{subtitle}</Text>
    {url ? (
      isPdfUri(url) ? (
        <View style={styles.pdfPreview}>
          <Text style={styles.pdfTag}>PDF</Text>
          <Text style={styles.pdfName} numberOfLines={1}>
            {url.split("/").pop()?.split("?")[0] || "Uploaded document"}
          </Text>
        </View>
      ) : (
        <Image source={{ uri: url }} style={styles.docPreview} resizeMode="cover" />
      )
    ) : null}
    <TouchableOpacity style={styles.docButton} onPress={onPress} disabled={disabled || busy}>
      {busy ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.docButtonText}>{url ? "Replace certificate" : "Upload certificate"}</Text>
      )}
    </TouchableOpacity>
  </View>
);

export default function LegalDocumentsStep({
  kyc,
  onKycChange,
  ownerName,
  restaurantName,
  panNumber,
  onPanNumberChange,
  fssaiNumber,
  onFssaiNumberChange,
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
  const [busy, setBusy] = useState<"" | "pan" | "fssai" | "gst">("");
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

  const handleVerifyFssai = async () => {
    const fssai = fssaiNumber.replace(/\D/g, "");
    if (!/^\d{14}$/.test(fssai)) {
      Alert.alert("Invalid FSSAI", "FSSAI number must be 14 digits.");
      return;
    }
    setBusy("fssai");
    try {
      const result = await verifyPartnerFssai({ fssaiNumber: fssai });
      onKycChange(result.kyc);
      onFssaiNumberChange(result.kyc.fssaiNumber || fssai);
    } catch (error: any) {
      Alert.alert("FSSAI not verified", error?.message || "This FSSAI license could not be verified.");
    } finally {
      setBusy("");
    }
  };

  const handleVerifyGst = async () => {
    const gstin = gstNumber.trim().toUpperCase();
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) {
      Alert.alert("Invalid GSTIN", "Enter a valid 15-character GSTIN.");
      return;
    }
    setBusy("gst");
    try {
      const result = await verifyPartnerGst({ gstNumber: gstin, businessName: restaurantName || ownerName });
      onKycChange(result.kyc);
      onGstNumberChange(result.kyc.gstNumber || gstin);
    } catch (error: any) {
      Alert.alert("GSTIN not verified", error?.message || "This GSTIN could not be verified.");
    } finally {
      setBusy("");
    }
  };

  return (
    <View>
      <Text style={styles.hint}>
        We verify PAN, FSSAI and GST with Eko against government records. Only active licenses get a green badge.
        Upload FSSAI and GST certificates for admin review.
      </Text>

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
        <VerifiedBadge title="PAN verified — legitimate" subtitle={kyc.panName ? `Registered name: ${kyc.panName}` : undefined} />
      ) : kyc.panSkipped ? (
        <VerifiedBadge title="PAN skipped" subtitle="You can add and verify PAN later from Profile." />
      ) : (
        <>
          <InvalidHint />
          <Check checked={panConsent} onPress={() => setPanConsent((c) => !c)} label="I consent to PAN verification via Eko" />
          <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyPan} disabled={busy !== ""}>
            {busy === "pan" ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify PAN</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleSkipPan} disabled={busy !== ""}>
            <Text style={styles.secondaryBtnText}>Skip PAN for now</Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={styles.sectionTitle}>FSSAI license</Text>
      <Text style={styles.label}>FSSAI number</Text>
      <TextInput
        placeholder="14-digit FSSAI number"
        placeholderTextColor="#98A2B3"
        keyboardType="number-pad"
        value={fssaiNumber}
        onChangeText={(v) => onFssaiNumberChange(v.replace(/\D/g, "").slice(0, 14))}
        style={[styles.input, kyc.fssaiVerified && styles.inputLocked]}
        editable={!kyc.fssaiVerified}
      />
      {kyc.fssaiVerified ? (
        <VerifiedBadge
          title="FSSAI verified — legitimate"
          subtitle={[kyc.fssaiBusinessName, kyc.fssaiLicenseStatus].filter(Boolean).join(" · ") || undefined}
        />
      ) : (
        <>
          <InvalidHint />
          <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyFssai} disabled={busy !== ""}>
            {busy === "fssai" ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify FSSAI</Text>}
          </TouchableOpacity>
        </>
      )}
      <DocUpload
        title="FSSAI certificate"
        subtitle="Upload a clear image or PDF of your FSSAI license"
        url={fssaiUrl}
        busy={uploadingKey === "fssaiUrl"}
        disabled={pickerBusy || Boolean(uploadingKey)}
        onPress={() => onPickDocument("fssaiUrl")}
      />

      <Text style={styles.sectionTitle}>GST registration</Text>
      <View style={styles.chipRow}>
        {(["yes", "no"] as const).map((value) => {
          const selected = gstRegistered === value;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onGstRegisteredChange(value)}
              disabled={kyc.gstVerified && value === "yes"}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {value === "yes" ? "Yes, GST registered" : "No GST registration"}
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
            style={[styles.input, kyc.gstVerified && styles.inputLocked]}
            editable={!kyc.gstVerified}
          />
          {kyc.gstVerified ? (
            <VerifiedBadge
              title="GSTIN verified — legitimate"
              subtitle={[kyc.gstLegalName, kyc.gstStatus].filter(Boolean).join(" · ") || undefined}
            />
          ) : (
            <>
              <InvalidHint />
              <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyGst} disabled={busy !== ""}>
                {busy === "gst" ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify GSTIN</Text>}
              </TouchableOpacity>
            </>
          )}
          <DocUpload
            title="GST certificate"
            subtitle="Upload a clear image or PDF of your GST certificate"
            url={gstUrl}
            busy={uploadingKey === "gstUrl"}
            disabled={pickerBusy || Boolean(uploadingKey)}
            onPress={() => onPickDocument("gstUrl")}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: 14, fontSize: 13, lineHeight: 18, color: partnerTheme.colors.muted },
  sectionTitle: { marginTop: 10, marginBottom: 8, fontSize: 16, fontWeight: "900", color: partnerTheme.colors.primaryDark },
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
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: partnerTheme.colors.successSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12
  },
  verifiedCopy: { flex: 1 },
  verifiedTitle: { color: "#216E39", fontWeight: "800", fontSize: 14 },
  verifiedSubtitle: { marginTop: 4, color: "#216E39", fontSize: 12, lineHeight: 17 },
  invalidHint: { marginBottom: 10, fontSize: 12, lineHeight: 17, color: partnerTheme.colors.muted },
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: partnerTheme.colors.neutralSoft,
    marginRight: 8,
    marginBottom: 8
  },
  chipSelected: { backgroundColor: partnerTheme.colors.primary },
  chipText: { fontSize: 13, fontWeight: "700", color: partnerTheme.colors.mutedDark },
  chipTextSelected: { color: "#fff" },
  docCard: {
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    backgroundColor: partnerTheme.colors.surface
  },
  docTitle: { fontSize: 14, fontWeight: "800", color: partnerTheme.colors.text },
  docSubtitle: { marginTop: 4, marginBottom: 10, fontSize: 12, lineHeight: 17, color: partnerTheme.colors.muted },
  docPreview: { width: "100%", height: 140, borderRadius: 12, marginBottom: 10 },
  pdfPreview: {
    borderRadius: 12,
    backgroundColor: partnerTheme.colors.neutralSoft,
    padding: 12,
    marginBottom: 10
  },
  pdfTag: { fontSize: 11, fontWeight: "800", color: partnerTheme.colors.primary },
  pdfName: { marginTop: 4, fontSize: 12, color: partnerTheme.colors.text },
  docButton: {
    backgroundColor: partnerTheme.colors.primary,
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 12
  },
  docButtonText: { color: "#fff", fontSize: 13, fontWeight: "800" }
});
