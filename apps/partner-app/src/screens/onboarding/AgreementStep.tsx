import React, { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { partnerTheme } from "../../theme";
import { buildLegalUrl } from "../../constants/legal";
import { acceptPartnerAgreement, type PartnerKycState } from "../../api/kyc.api";
import PartnerAgreementModal from "../../components/PartnerAgreementModal";

type Props = {
  kyc: PartnerKycState;
  onKycChange: (next: PartnerKycState) => void;
  termsAccepted: boolean;
  partnerAgreementAccepted: boolean;
  onTermsAcceptedChange: (value: boolean) => void;
  onPartnerAgreementAcceptedChange: (value: boolean) => void;
  summary: {
    restaurantName: string;
    ownerName: string;
    city: string;
    category: string;
  };
};

const Check = ({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) => (
  <Pressable style={styles.checkRow} onPress={onPress} hitSlop={6}>
    <Ionicons name={checked ? "checkbox" : "square-outline"} size={18} color={checked ? partnerTheme.colors.primary : "#98A2B3"} />
    <Text style={styles.checkText}>{label}</Text>
  </Pressable>
);

export default function AgreementStep({
  kyc,
  termsAccepted,
  partnerAgreementAccepted,
  onTermsAcceptedChange,
  onPartnerAgreementAcceptedChange,
  summary
}: Props) {
  const [agreementModalVisible, setAgreementModalVisible] = useState(false);

  const partnerAgreementLabel = useMemo(
    () =>
      "I accept the Restaurant Partner agreement (0% for first 45 days after first order, then 10% platform commission)",
    []
  );

  return (
    <View>
      <Text style={styles.hint}>
        Vyaha will verify your documents before your restaurant goes live. After approval, your shop can go live and start receiving orders.
      </Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{summary.restaurantName || "Your restaurant"}</Text>
        <Text style={styles.summaryLine}>Owner: {summary.ownerName || "—"}</Text>
        <Text style={styles.summaryLine}>City: {summary.city || "—"}</Text>
        <Text style={styles.summaryLine}>Category: {summary.category || "—"}</Text>
      </View>

      <View style={styles.timeline}>
        <Text style={styles.timelineItem}>1. Submit application for review</Text>
        <Text style={styles.timelineItem}>2. Vyaha verifies documents and shop details</Text>
        <Text style={styles.timelineItem}>3. Accept Restaurant Partner agreement after approval</Text>
        <Text style={styles.timelineItem}>4. Shop goes live and orders start coming in</Text>
      </View>

      <Check checked={termsAccepted || Boolean(kyc.termsAcceptedAt)} onPress={() => onTermsAcceptedChange(!termsAccepted)} label="I accept Vyaha Terms of Service" />
      <Pressable onPress={() => Linking.openURL(buildLegalUrl("terms"))}>
        <Text style={styles.link}>Read terms</Text>
      </Pressable>

      <Check
        checked={partnerAgreementAccepted || Boolean(kyc.partnerAgreementAcceptedAt)}
        onPress={() => onPartnerAgreementAcceptedChange(!partnerAgreementAccepted)}
        label={partnerAgreementLabel}
      />

      <Pressable onPress={() => setAgreementModalVisible(true)}>
        <Text style={styles.link}>View partner agreement</Text>
      </Pressable>

      <PartnerAgreementModal
        visible={agreementModalVisible}
        onClose={() => setAgreementModalVisible(false)}
        onAccept={() => onPartnerAgreementAcceptedChange(true)}
      />
    </View>
  );
}

export const validateAndSaveAgreement = async (
  termsAccepted: boolean,
  partnerAgreementAccepted: boolean,
  kyc: PartnerKycState,
  onKycChange: (next: PartnerKycState) => void
) => {
  if (!termsAccepted && !kyc.termsAcceptedAt) {
    return { ok: false as const, message: "Please accept the terms and conditions." };
  }
  if (!partnerAgreementAccepted && !kyc.partnerAgreementAcceptedAt) {
    return { ok: false as const, message: "Please accept the Restaurant Partner agreement." };
  }
  if (kyc.termsAcceptedAt && kyc.partnerAgreementAcceptedAt) {
    return { ok: true as const };
  }
  try {
    const result = await acceptPartnerAgreement({ termsAccepted: true, partnerAgreementAccepted: true });
    onKycChange(result.kyc);
    return { ok: true as const };
  } catch (error: any) {
    return { ok: false as const, message: error?.message || "Could not save agreement" };
  }
};

const styles = StyleSheet.create({
  hint: { marginBottom: 12, fontSize: 13, lineHeight: 18, color: partnerTheme.colors.muted },
  summaryCard: {
    backgroundColor: partnerTheme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    padding: 14,
    marginBottom: 12
  },
  summaryTitle: { fontSize: 17, fontWeight: "900", color: partnerTheme.colors.primaryDark, marginBottom: 6 },
  summaryLine: { fontSize: 13, color: partnerTheme.colors.mutedDark, marginBottom: 4 },
  timeline: { marginBottom: 14 },
  timelineItem: { fontSize: 13, color: partnerTheme.colors.text, marginBottom: 6, lineHeight: 18 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  checkText: { flex: 1, fontSize: 13, color: partnerTheme.colors.text, lineHeight: 18 },
  link: { color: partnerTheme.colors.primary, fontWeight: "700", marginBottom: 12, marginLeft: 26 }
});
