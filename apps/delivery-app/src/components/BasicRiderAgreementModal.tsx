import React, { useMemo, useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { buildLegalUrl } from "../constants/legal";

type Props = {
  visible: boolean;
  onClose: () => void;
  onAccept?: () => void | Promise<void>;
};

export default function BasicRiderAgreementModal({ visible, onClose, onAccept }: Props) {
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);

  const acceptLabel = useMemo(() => (onAccept ? "ACCEPT" : "Close"), [onAccept]);

  const TERMS_URL = buildLegalUrl("terms");
  const PRIVACY_URL = buildLegalUrl("privacy");
  const DELIVERY_POLICY_URL = buildLegalUrl("delivery-policy");

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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 10 }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Basic Rider Agreement</Text>
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
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionTitle}>1. Agreement</Text>
            <Text style={styles.p}>
              This Agreement (“Agreement”) is entered into between you (“Delivery Partner”, “you”) and Vyaha Technologies (“Vyaha”, “we”, “us”, “our”).
              It governs your use of Vyaha to receive and complete delivery jobs.
            </Text>

            <Text style={styles.sectionTitle}>2. Independent contractor</Text>
            <Text style={styles.p}>
              You are an independent contractor and not an employee, agent, or franchisee of Vyaha (unless otherwise required by law or agreed in writing).
              Vyaha does not control your work hours or employment benefits.
            </Text>

            <Text style={styles.sectionTitle}>3. Verification & onboarding</Text>
            <Text style={styles.p}>
              You must provide truthful identity, phone, vehicle, and verification/KYC details required by Vyaha. Vyaha may approve, reject, pause,
              or re-verify your account.
            </Text>

            <Text style={styles.sectionTitle}>4. Going online & accepting jobs</Text>
            <Text style={styles.p}>
              When you turn “Online ON”, you agree to accept eligible jobs, pick up the correct order, and complete delivery in a lawful and safe manner.
              You must not misrepresent order status.
            </Text>

            <Text style={styles.sectionTitle}>5. Safety, conduct & location</Text>
            <Text style={styles.p}>
              You must follow road safety rules, protect customer data to delivery-related use only, and keep delivery status updated honestly.
              Vyaha may use GPS/location data to coordinate deliveries and ensure safety during online or active delivery sessions.
            </Text>

            <Text style={styles.sectionTitle}>6. Cash on delivery (COD) & refunds</Text>
            <Text style={styles.p}>
              If COD is enabled for an order, you must collect the correct amount, hand over items to the correct customer, and reconcile COD collection as required.
              Refunds and adjustments (if any) may affect your earnings/payout settlement after review and reconciliation.
            </Text>

            <Text style={styles.sectionTitle}>7. Earnings & payouts</Text>
            <Text style={styles.p}>
              Your earnings depend on delivery/job completion, applicable platform rules, incentives/charges (if any), and verified reconciliation outcomes.
              Payouts are processed after completed jobs and required checks, subject to bank verification, minimum payout thresholds, and fraud/safety review.
            </Text>

            <Text style={styles.sectionTitle}>8. Suspension & termination</Text>
            <Text style={styles.p}>
              Vyaha may warn, restrict, suspend, or terminate your account for fraud, safety violations, repeated misdelivery, document issues, or non-compliance.
              You can request support review through official support channels.
            </Text>

            <Text style={styles.sectionTitle}>9. Related policies</Text>
            <Text style={styles.p}>
              This Agreement should be read together with Vyaha’s{" "}
              <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>
                Terms of Service
              </Text>
              ,{" "}
              <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>
                Privacy Policy
              </Text>{" "}
              and{" "}
              <Text style={styles.link} onPress={() => Linking.openURL(DELIVERY_POLICY_URL)}>
                Delivery Partner Policy
              </Text>
              .
            </Text>

            <Text style={styles.note}>If you do not agree, do not use the platform.</Text>
          </ScrollView>

          <View style={styles.footer}>
            {!onAccept ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={onClose} accessibilityLabel="Close agreement">
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
  sheet: {
    maxHeight: "92%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingTop: 10
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

