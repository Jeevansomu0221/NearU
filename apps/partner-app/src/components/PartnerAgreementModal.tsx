import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { buildLegalUrl } from "../constants/legal";

type Props = {
  visible: boolean;
  onClose: () => void;
  onAccept?: () => void | Promise<void>;
};

const SHEET_HEIGHT = Math.round(Dimensions.get("window").height * 0.88);

export default function PartnerAgreementModal({ visible, onClose, onAccept }: Props) {
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);

  const acceptLabel = useMemo(() => (onAccept ? "ACCEPT" : "Close"), [onAccept]);

  const handleAccept = async () => {
    if (!onAccept || submitting) return;
    try {
      setSubmitting(true);
      await onAccept();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const TERMS_URL = buildLegalUrl("terms");
  const PRIVACY_URL = buildLegalUrl("privacy");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} accessibilityLabel="Dismiss agreement" />

        <View style={[styles.sheet, { height: SHEET_HEIGHT, paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Restaurant Partner Agreement</Text>
              <Text style={styles.subtitle}>General Terms & Conditions</Text>
              <Text style={styles.emphasis}>IMPORTANT: PLEASE READ CAREFULLY</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12} accessibilityLabel="Close agreement">
              <Ionicons name="close" size={22} color="#667085" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            bounces
          >
            <Text style={styles.sectionTitle}>1. Agreement</Text>
            <Text style={styles.p}>
              This Agreement (“Agreement”) is between you (“Restaurant Partner”, “you”) and Vyaha Technologies (“Vyaha”, “we”, “us”, “our”).
              It applies to your use of Vyaha’s restaurant partner app and related services.
            </Text>

            <Text style={styles.sectionTitle}>2. Going live</Text>
            <Text style={styles.p}>
              Your shop can go live and start receiving orders only after Vyaha verifies your documents and you complete the required
              onboarding steps (including acceptance of this Agreement).
            </Text>

            <Text style={styles.sectionTitle}>3. Services</Text>
            <Text style={styles.p}>
              Vyaha provides an ordering and delivery coordination platform. You are responsible for food quality, hygiene, packaging,
              menu accuracy, and legal compliance (including FSSAI where applicable).
            </Text>

            <Text style={styles.sectionTitle}>4. Commission (Partner Commercial Terms)</Text>
            <Text style={styles.pBold}>First 45 days after your first completed order: 0% platform commission</Text>
            <Text style={styles.p}>
              From the date of your first successfully completed customer order on Vyaha (“First Order Date”), for the next forty-five (45) calendar
              days, Vyaha will not charge platform commission on eligible completed orders.
            </Text>

            <Text style={styles.pBold}>After 45 days: 10% platform commission</Text>
            <Text style={styles.p}>
              After the 45-day period ends, Vyaha charges a platform commission of <Text style={styles.pInlineEm}>10%</Text> on eligible completed
              orders, as communicated in partner dashboards and payout statements. Vyaha may adjust payouts for refunds, cancellations, COD reconciliation,
              and other agreed deductions.
            </Text>

            <Text style={styles.sectionTitle}>5. Orders, refunds & payouts</Text>
            <Text style={styles.p}>
              Payouts will be sent directly to your registered bank account within 15 days of order completion.
              Refunds and adjustments may affect payout amounts. Payouts are processed after reconciliation and verification of your payout account,
              subject to minimum payout thresholds, pending disputes, and compliance checks.
            </Text>

            <Text style={styles.sectionTitle}>6. Conduct & compliance</Text>
            <Text style={styles.p}>
              You must provide truthful information and follow platform rules. Repeated violations may result in warnings, restrictions, suspension,
              or termination of partner access.
            </Text>

            <Text style={styles.sectionTitle}>7. Related policies</Text>
            <Text style={styles.p}>
              This Agreement should be read together with Vyaha’s <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>Terms of Service</Text>{" "}
              and <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>.
            </Text>

            <Text style={styles.sectionTitle}>8. Customer support</Text>
            <Text style={styles.p}>
              For any queries or issues, contact Vyaha Partner Support at{" "}
              <Text style={styles.link} onPress={() => Linking.openURL("tel:+916300525031")}>+91 6300525031</Text>.
            </Text>

            <Text style={styles.note}>If you do not agree, do not use the platform.</Text>
          </ScrollView>

          <View style={styles.footer}>
            {!onAccept ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={onClose} accessibilityLabel="Close">
                <Text style={styles.primaryBtnText}>Close</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
                onPress={handleAccept}
                disabled={submitting}
                accessibilityLabel="Accept agreement"
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{acceptLabel}</Text>}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end"
  },
  dismissArea: {
    flex: 1
  },
  sheet: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 8,
    elevation: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 }
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D0D5DD",
    marginBottom: 10
  },
  headerRow: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 10
  },
  headerCopy: { flex: 1 },
  title: { fontSize: 18, fontWeight: "900", color: "#101828", marginBottom: 3 },
  subtitle: { fontSize: 12, fontWeight: "700", color: "#667085", marginBottom: 6 },
  emphasis: { fontSize: 11, fontWeight: "900", letterSpacing: 0.3, color: "#B42318" },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F4F7"
  },
  body: { flex: 1 },
  bodyContent: { paddingBottom: 14 },
  sectionTitle: { marginTop: 10, marginBottom: 6, fontSize: 13, fontWeight: "900", color: "#1D2939" },
  p: { fontSize: 12.5, lineHeight: 18, color: "#475467", marginBottom: 10 },
  pBold: { fontSize: 12.5, lineHeight: 18, color: "#1D2939", fontWeight: "900", marginBottom: 8 },
  pInlineEm: { fontWeight: "900", color: "#16A34A" },
  link: { color: "#2563EB", fontWeight: "700" },
  note: { marginTop: 6, fontSize: 12, lineHeight: 18, color: "#667085", marginBottom: 18 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#EAECF0",
    paddingTop: 12,
    paddingBottom: 8
  },
  primaryBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center"
  },
  primaryBtnDisabled: { opacity: 0.65 },
  primaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "900" }
});
