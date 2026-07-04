import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  cancelAccountDeletionRequest,
  getMyDeletionRequest,
  requestAccountDeletion,
  type AccountDeletionRequest
} from "../api/accountDeletion.api";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmitted?: (request: AccountDeletionRequest) => void;
  isDark?: boolean;
}

const REASON_OPTIONS = [
  { id: "leaving", label: "No longer operating" },
  { id: "platform", label: "Other platform" },
  { id: "privacy", label: "Privacy concerns" },
  { id: "earnings", label: "Low earnings" },
  { id: "other", label: "Other" }
] as const;

type ReasonId = (typeof REASON_OPTIONS)[number]["id"];

const REASON_LABELS: Record<ReasonId, string> = {
  leaving: "No longer operating on Vyaha",
  platform: "Found another platform",
  privacy: "Privacy concerns",
  earnings: "Low earnings or fees",
  other: "Other"
};

const BRAND = "#1D4E89";

export default function DeleteAccountModal({ visible, onClose, onSubmitted, isDark = false }: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<AccountDeletionRequest | null>(null);
  const [selectedReason, setSelectedReason] = useState<ReasonId | "">("");
  const [details, setDetails] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const loadPendingRequest = async () => {
    setLoading(true);
    try {
      const request = await getMyDeletionRequest();
      setPendingRequest(request?.status === "PENDING" ? request : null);
    } catch {
      setPendingRequest(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setSelectedReason("");
      setDetails("");
      setKeyboardHeight(0);
      void loadPendingRequest();
    }
  }, [visible]);

  const buildReasonPayload = () => {
    const category = selectedReason ? REASON_LABELS[selectedReason] : "";
    const trimmedDetails = details.trim();

    if (selectedReason === "other") {
      return { reasonCategory: category, reason: trimmedDetails };
    }

    const reason = trimmedDetails ? `${category} — ${trimmedDetails}` : category;
    return { reasonCategory: category, reason };
  };

  const canSubmit = useMemo(() => {
    if (!selectedReason || submitting) return false;
    if (selectedReason === "other") return details.trim().length >= 10;
    return REASON_LABELS[selectedReason].length >= 10;
  }, [selectedReason, details, submitting]);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert("Reason required", "Please select why you want to delete your account.");
      return;
    }

    const payload = buildReasonPayload();
    if (payload.reason.length < 10) {
      Alert.alert("More details needed", "Please add a short explanation in at least 10 characters.");
      return;
    }

    Keyboard.dismiss();
    setSubmitting(true);
    try {
      const created = await requestAccountDeletion(payload);
      if (created) {
        onSubmitted?.(created);
        onClose();
        return;
      }

      const latest = await getMyDeletionRequest();
      if (latest) {
        onSubmitted?.(latest);
      }
      onClose();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || error.message || "Failed to submit deletion request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = () => {
    Alert.alert("Cancel deletion request?", "You can submit a new request later if you change your mind.", [
      { text: "Keep request", style: "cancel" },
      {
        text: "Cancel request",
        style: "destructive",
        onPress: async () => {
          setSubmitting(true);
          try {
            await cancelAccountDeletionRequest();
            setPendingRequest(null);
            Alert.alert("Cancelled", "Your account deletion request has been cancelled.");
          } catch (error: any) {
            Alert.alert("Error", error.response?.data?.message || error.message || "Failed to cancel request");
          } finally {
            setSubmitting(false);
          }
        }
      }
    ]);
  };

  const sheetBottomPadding = Math.max(insets.bottom, 12) + (Platform.OS === "android" ? keyboardHeight : 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropDismiss} onPress={onClose} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardWrap}
            keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
          >
            <Pressable style={[styles.sheet, isDark && styles.sheetDark, { paddingBottom: sheetBottomPadding }]} onPress={() => undefined}>
              <View style={styles.handle} />

              <View style={styles.headerRow}>
                <View style={styles.headerCopy}>
                  <Text style={[styles.title, isDark && styles.textDark]}>Delete account</Text>
                  <Text style={[styles.subtitle, isDark && styles.mutedDark]}>
                    Submit a request for review. Deletion is processed after payout checks.
                  </Text>
                </View>
                <TouchableOpacity style={[styles.closeIconBtn, isDark && styles.closeIconBtnDark]} onPress={onClose} hitSlop={12}>
                  <Ionicons name="close" size={22} color={isDark ? "#D0D5DD" : "#667085"} />
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.centerState}>
                  <ActivityIndicator color={BRAND} size="large" />
                </View>
              ) : pendingRequest ? (
                <View style={styles.pendingCard}>
                  <View style={styles.pendingIconWrap}>
                    <Ionicons name="time-outline" size={24} color="#B45309" />
                  </View>
                  <Text style={styles.pendingTitle}>Review in progress</Text>
                  <Text style={styles.pendingText}>
                    Submitted {new Date(pendingRequest.createdAt).toLocaleDateString("en-IN")}. Our team is verifying payouts before deletion.
                  </Text>
                  <View style={[styles.pendingReasonBox, isDark && styles.pendingReasonBoxDark]}>
                    <Text style={styles.pendingReasonLabel}>Your reason</Text>
                    <Text style={[styles.pendingReason, isDark && styles.textDark]}>{pendingRequest.reason}</Text>
                  </View>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={handleCancelRequest} disabled={submitting}>
                    <Text style={styles.secondaryBtnText}>Cancel request</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.formBody}>
                  <Text style={[styles.sectionLabel, isDark && styles.textDark]}>Reason for leaving</Text>
                  <View style={styles.reasonGrid}>
                    {REASON_OPTIONS.map((option) => {
                      const active = selectedReason === option.id;
                      return (
                        <TouchableOpacity
                          key={option.id}
                          style={[
                            styles.reasonChip,
                            isDark && styles.reasonChipDark,
                            active && styles.reasonChipActive,
                            active && isDark && styles.reasonChipActiveDark
                          ]}
                          onPress={() => setSelectedReason(option.id)}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.reasonChipText, isDark && styles.mutedDark, active && styles.reasonChipTextActive]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {selectedReason === "other" ? (
                    <View style={styles.fieldBlock}>
                      <Text style={[styles.fieldLabel, isDark && styles.textDark]}>Tell us more</Text>
                      <TextInput
                        style={[styles.input, isDark && styles.inputDark]}
                        multiline
                        maxLength={280}
                        placeholder="Briefly explain why you want to delete your account"
                        placeholderTextColor="#98A2B3"
                        value={details}
                        onChangeText={setDetails}
                        textAlignVertical="top"
                        returnKeyType="done"
                        blurOnSubmit
                        onSubmitEditing={Keyboard.dismiss}
                      />
                    </View>
                  ) : null}
                </View>
              )}

              {!loading && !pendingRequest ? (
                <View style={styles.footer}>
                  <TouchableOpacity
                    style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                    activeOpacity={0.9}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitText}>Submit deletion request</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end"
  },
  backdropDismiss: {
    ...StyleSheet.absoluteFillObject
  },
  keyboardWrap: {
    justifyContent: "flex-end"
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10
  },
  sheetDark: { backgroundColor: "#111827" },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#D0D5DD",
    marginBottom: 16
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18
  },
  headerCopy: { flex: 1 },
  title: { fontSize: 20, fontWeight: "800", color: "#101828", letterSpacing: -0.3 },
  subtitle: { marginTop: 6, fontSize: 13, lineHeight: 19, color: "#667085" },
  textDark: { color: "#F9FAFB" },
  mutedDark: { color: "#98A2B3" },
  closeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F2F4F7",
    alignItems: "center",
    justifyContent: "center"
  },
  closeIconBtnDark: { backgroundColor: "#1F2937" },
  centerState: { paddingVertical: 40, alignItems: "center" },
  formBody: { gap: 14 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#344054",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  reasonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reasonChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    backgroundColor: "#FAFAFA"
  },
  reasonChipDark: { borderColor: "#374151", backgroundColor: "#1F2937" },
  reasonChipActive: { borderColor: BRAND, backgroundColor: "#EFF6FF" },
  reasonChipActiveDark: { borderColor: "#60A5FA", backgroundColor: "#1E3A5F" },
  reasonChipText: { fontSize: 13, fontWeight: "700", color: "#475467" },
  reasonChipTextActive: { color: BRAND },
  fieldBlock: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#344054" },
  input: {
    minHeight: 84,
    maxHeight: 84,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    color: "#101828",
    backgroundColor: "#FCFCFD"
  },
  inputDark: { borderColor: "#374151", backgroundColor: "#1F2937", color: "#F9FAFB" },
  footer: { marginTop: 18, paddingTop: 4 },
  submitBtn: {
    backgroundColor: "#B42318",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  submitBtnDisabled: { backgroundColor: "#F2B4AE" },
  submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  pendingCard: { alignItems: "center", paddingVertical: 8, paddingBottom: 4 },
  pendingIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFBEB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  pendingTitle: { fontSize: 18, fontWeight: "800", color: "#92400E" },
  pendingText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "#B45309",
    textAlign: "center",
    paddingHorizontal: 8
  },
  pendingReasonBox: {
    width: "100%",
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#EAECF0"
  },
  pendingReasonBoxDark: { backgroundColor: "#1F2937", borderColor: "#374151" },
  pendingReasonLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#98A2B3",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  pendingReason: { marginTop: 6, fontSize: 14, lineHeight: 20, color: "#344054", fontWeight: "600" },
  secondaryBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F59E0B",
    backgroundColor: "#FFFFFF"
  },
  secondaryBtnText: { color: "#B45309", fontWeight: "700", fontSize: 14 }
});
