import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
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
  getDeletionEligibility,
  getMyDeletionRequest,
  requestAccountDeletion,
  type AccountDeletionRequest
} from "../api/accountDeletion.api";
import { openAccountDeletionReview } from "../utils/accountDeletionNavigation";

interface Props {
  visible: boolean;
  onClose: () => void;
  navigation: any;
  onSubmitted?: (request: AccountDeletionRequest | null) => void;
}

const REASON_OPTIONS = [
  { id: "leaving", label: "No longer delivering" },
  { id: "platform", label: "Other platform" },
  { id: "privacy", label: "Privacy concerns" },
  { id: "earnings", label: "Low earnings" },
  { id: "other", label: "Other" }
] as const;

type ReasonId = (typeof REASON_OPTIONS)[number]["id"];

const REASON_LABELS: Record<ReasonId, string> = {
  leaving: "No longer delivering on Vyaha",
  platform: "Found another platform",
  privacy: "Privacy concerns",
  earnings: "Low earnings or fees",
  other: "Other"
};

const GREEN_PRIMARY = "#16A34A";
const GREEN_DEEP = "#166534";
const GREEN_SOFT = "#F0FDF4";

export default function DeleteAccountModal({ visible, onClose, navigation, onSubmitted }: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<AccountDeletionRequest | null>(null);
  const [hasReviewItems, setHasReviewItems] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReasonId | "">("");
  const [details, setDetails] = useState("");
  const [codAcknowledged, setCodAcknowledged] = useState(false);
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
      const [request, eligibility] = await Promise.all([getMyDeletionRequest(), getDeletionEligibility()]);
      setPendingRequest(request?.status === "PENDING" ? request : null);
      setHasReviewItems(Boolean(eligibility?.blockers?.length || eligibility?.payoutCheck?.hasOutstandingPayouts));
    } catch {
      setPendingRequest(null);
      setHasReviewItems(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setSelectedReason("");
      setDetails("");
      setCodAcknowledged(false);
      setKeyboardHeight(0);
      void loadPendingRequest();
    }
  }, [visible]);

  const buildReasonPayload = () => {
    const category = selectedReason ? REASON_LABELS[selectedReason] : "";
    const trimmedDetails = details.trim();

    if (selectedReason === "other") {
      return {
        reasonCategory: category,
        reason: trimmedDetails,
        codBalanceAcknowledged: codAcknowledged
      };
    }

    const reason = trimmedDetails ? `${category} — ${trimmedDetails}` : category;
    return {
      reasonCategory: category,
      reason,
      codBalanceAcknowledged: codAcknowledged
    };
  };

  const canSubmit = useMemo(() => {
    if (!selectedReason || !codAcknowledged || submitting) return false;
    if (selectedReason === "other") return details.trim().length >= 10;
    return REASON_LABELS[selectedReason].length >= 10;
  }, [selectedReason, codAcknowledged, details, submitting]);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert("Reason required", "Please select why you want to delete your account.");
      return;
    }

    if (!codAcknowledged) {
      Alert.alert("Confirmation required", "Please confirm that you do not owe any COD cash balance to Vyaha.");
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
      let latest = created || null;
      if (!latest) {
        latest = (await getMyDeletionRequest().catch(() => null)) || null;
      }

      onClose();
      InteractionManager.runAfterInteractions(() => {
        openAccountDeletionReview(navigation, latest);
        onSubmitted?.(latest);
      });
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
            <Pressable
              style={[styles.sheet, { paddingBottom: sheetBottomPadding }]}
              onPress={() => undefined}
            >
              <View style={styles.handle} />

              <View style={styles.headerRow}>
                <View style={styles.headerCopy}>
                  <Text style={styles.title}>Delete account</Text>
                  <Text style={styles.subtitle}>
                    Submit a request for review. Deletion is processed after payout and COD checks.
                  </Text>
                </View>
                <TouchableOpacity style={styles.closeIconBtn} onPress={onClose} hitSlop={12}>
                  <Ionicons name="close" size={22} color="#667085" />
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.centerState}>
                  <ActivityIndicator color={GREEN_PRIMARY} size="large" />
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
                  <View style={styles.pendingReasonBox}>
                    <Text style={styles.pendingReasonLabel}>Your reason</Text>
                    <Text style={styles.pendingReason}>{pendingRequest.reason}</Text>
                  </View>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={handleCancelRequest} disabled={submitting}>
                    <Text style={styles.secondaryBtnText}>Cancel request</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.formBody}>
                  {hasReviewItems ? (
                    <View style={styles.infoBanner}>
                      <Ionicons name="information-circle" size={18} color="#B45309" />
                      <Text style={styles.infoBannerText}>
                        Pending payouts or active jobs were found. You can still submit — our team will verify before approval.
                      </Text>
                    </View>
                  ) : null}

                  <Text style={styles.sectionLabel}>Reason for leaving</Text>
                  <View style={styles.reasonGrid}>
                    {REASON_OPTIONS.map((option) => {
                      const active = selectedReason === option.id;
                      return (
                        <TouchableOpacity
                          key={option.id}
                          style={[styles.reasonChip, active && styles.reasonChipActive]}
                          onPress={() => setSelectedReason(option.id)}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.reasonChipText, active && styles.reasonChipTextActive]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {selectedReason === "other" ? (
                    <View style={styles.fieldBlock}>
                      <Text style={styles.fieldLabel}>Tell us more</Text>
                      <TextInput
                        style={styles.input}
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

                  <TouchableOpacity
                    style={[styles.ackRow, codAcknowledged && styles.ackRowActive]}
                    onPress={() => setCodAcknowledged((current) => !current)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.checkbox, codAcknowledged && styles.checkboxChecked]}>
                      {codAcknowledged ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                    </View>
                    <Text style={styles.ackText}>I don't owe anything to Vyaha in COD cash balance</Text>
                  </TouchableOpacity>
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
  headerCopy: {
    flex: 1
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: GREEN_DEEP,
    letterSpacing: -0.3
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#667085"
  },
  closeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F2F4F7",
    alignItems: "center",
    justifyContent: "center"
  },
  centerState: {
    paddingVertical: 40,
    alignItems: "center"
  },
  formBody: {
    gap: 14
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A"
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#92400E",
    fontWeight: "600"
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#344054",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  reasonChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    backgroundColor: "#FAFAFA"
  },
  reasonChipActive: {
    borderColor: GREEN_PRIMARY,
    backgroundColor: GREEN_SOFT
  },
  reasonChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475467"
  },
  reasonChipTextActive: {
    color: GREEN_DEEP
  },
  fieldBlock: {
    gap: 8
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#344054"
  },
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
  ackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    backgroundColor: "#FAFAFA"
  },
  ackRowActive: {
    borderColor: GREEN_PRIMARY,
    backgroundColor: GREEN_SOFT
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#98A2B3",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff"
  },
  checkboxChecked: {
    borderColor: GREEN_PRIMARY,
    backgroundColor: GREEN_PRIMARY
  },
  ackText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "#344054"
  },
  footer: {
    marginTop: 18,
    paddingTop: 4
  },
  submitBtn: {
    backgroundColor: "#B42318",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  submitBtnDisabled: {
    backgroundColor: "#F2B4AE"
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800"
  },
  pendingCard: {
    alignItems: "center",
    paddingVertical: 8,
    paddingBottom: 4
  },
  pendingIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFBEB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  pendingTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#92400E"
  },
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
  pendingReasonLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#98A2B3",
    textTransform: "uppercase",
    letterSpacing: 0.4
  },
  pendingReason: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#344054",
    fontWeight: "600"
  },
  secondaryBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F59E0B",
    backgroundColor: "#FFFFFF"
  },
  secondaryBtnText: {
    color: "#B45309",
    fontWeight: "700",
    fontSize: 14
  }
});
