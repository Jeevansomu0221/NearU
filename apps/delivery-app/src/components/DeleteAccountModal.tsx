import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  cancelAccountDeletionRequest,
  getDeletionEligibility,
  getMyDeletionRequest,
  requestAccountDeletion,
  type AccountDeletionRequest
} from "../api/accountDeletion.api";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
  onDeleted?: () => void;
}

const REASON_OPTIONS = [
  "No longer delivering on Vyaha",
  "Found another platform",
  "Privacy concerns",
  "Low earnings or fees",
  "Other"
] as const;

const GREEN_PRIMARY = "#16A34A";
const GREEN_DEEP = "#166534";

export default function DeleteAccountModal({ visible, onClose, onSubmitted, onDeleted }: Props) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<AccountDeletionRequest | null>(null);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [canDelete, setCanDelete] = useState(false);
  const [selectedReason, setSelectedReason] = useState<(typeof REASON_OPTIONS)[number] | "">("");
  const [details, setDetails] = useState("");

  const loadPendingRequest = async () => {
    setLoading(true);
    try {
      const [request, eligibility] = await Promise.all([getMyDeletionRequest(), getDeletionEligibility()]);
      setPendingRequest(request?.status === "PENDING" ? request : null);
      setBlockers(eligibility?.blockers || []);
      setCanDelete(Boolean(eligibility?.canDelete));
    } catch {
      setPendingRequest(null);
      setBlockers(["Unable to verify payout status right now. Please try again."]);
      setCanDelete(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setSelectedReason("");
      setDetails("");
      void loadPendingRequest();
    }
  }, [visible]);

  const buildReasonPayload = () => {
    const trimmedDetails = details.trim();
    if (selectedReason === "Other") {
      return {
        reasonCategory: selectedReason,
        reason: trimmedDetails
      };
    }

    const reason = trimmedDetails
      ? `${selectedReason} — ${trimmedDetails}`
      : selectedReason;

    return {
      reasonCategory: selectedReason,
      reason
    };
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert("Reason required", "Please select why you want to delete your account.");
      return;
    }

    const payload = buildReasonPayload();
    if (payload.reason.length < 10) {
      Alert.alert(
        "More details needed",
        selectedReason === "Other"
          ? "Please describe your reason in at least 10 characters."
          : "Please add a few more details about your reason."
      );
      return;
    }

    setSubmitting(true);
    try {
      await requestAccountDeletion(payload);
      if (canDelete) {
        Alert.alert("Account deleted", "Your delivery account has been deleted.", [
          { text: "OK", onPress: () => {
            onDeleted?.();
            onClose();
          }}
        ]);
        return;
      }

      Alert.alert(
        "Request submitted",
        "Your account deletion request has been sent to our team. We will review pending payouts and process it after verification.",
        [{ text: "OK", onPress: () => {
          onSubmitted?.();
          onClose();
        }}]
      );
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <Text style={styles.title}>Delete account</Text>
          <Text style={styles.subtitle}>
            {canDelete
              ? "Your payouts and COD balance are clear. You can delete your account immediately after confirming your reason."
              : "Complete the items below before your account can be deleted."}
          </Text>

          {loading ? (
            <ActivityIndicator color={GREEN_PRIMARY} style={{ marginVertical: 24 }} />
          ) : pendingRequest ? (
            <View style={styles.pendingBox}>
              <Ionicons name="time-outline" size={28} color="#B45309" />
              <Text style={styles.pendingTitle}>Deletion request pending</Text>
              <Text style={styles.pendingText}>
                Submitted on {new Date(pendingRequest.createdAt).toLocaleDateString("en-IN")}. Our team is reviewing your payouts before deletion.
              </Text>
              <Text style={styles.pendingReason}>{pendingRequest.reason}</Text>
              <TouchableOpacity style={styles.cancelRequestBtn} onPress={handleCancelRequest} disabled={submitting}>
                <Text style={styles.cancelRequestText}>Cancel request</Text>
              </TouchableOpacity>
            </View>
          ) : !canDelete ? (
            <View style={styles.blockerBox}>
              <Ionicons name="alert-circle-outline" size={28} color="#B42318" />
              <Text style={styles.blockerTitle}>Account cannot be deleted yet</Text>
              {blockers.map((blocker) => (
                <Text key={blocker} style={styles.blockerText}>• {blocker}</Text>
              ))}
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Reason for deletion</Text>
              {REASON_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.reasonRow, selectedReason === option && styles.reasonRowActive]}
                  onPress={() => setSelectedReason(option)}
                >
                  <Ionicons
                    name={selectedReason === option ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={selectedReason === option ? GREEN_PRIMARY : "#98A2B3"}
                  />
                  <Text style={styles.reasonText}>{option}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.label}>
                {selectedReason === "Other" ? "Please explain" : "Additional details (optional)"}
              </Text>
              <TextInput
                style={styles.input}
                multiline
                numberOfLines={4}
                placeholder={
                  selectedReason === "Other"
                    ? "Tell us why you want to delete your account..."
                    : "Share any extra context..."
                }
                value={details}
                onChangeText={setDetails}
                textAlignVertical="top"
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>{canDelete ? "Delete my account" : "Submit deletion request"}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(16, 24, 40, 0.45)",
    justifyContent: "flex-end"
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: "88%"
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D0D5DD",
    marginBottom: 14
  },
  title: { fontSize: 22, fontWeight: "800", color: GREEN_DEEP },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, color: "#667085" },
  label: { marginTop: 18, marginBottom: 10, fontSize: 14, fontWeight: "700", color: "#344054" },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EAECF0",
    marginBottom: 8
  },
  reasonRowActive: { borderColor: GREEN_PRIMARY, backgroundColor: "#F0FDF4" },
  reasonText: { flex: 1, fontSize: 14, color: "#344054", fontWeight: "600" },
  input: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: "#101828",
    backgroundColor: "#FCFCFD"
  },
  submitBtn: {
    marginTop: 18,
    backgroundColor: "#B42318",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center"
  },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  closeBtn: { marginTop: 14, alignItems: "center", paddingVertical: 10 },
  closeText: { color: "#667085", fontSize: 14, fontWeight: "700" },
  pendingBox: {
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    alignItems: "center"
  },
  pendingTitle: { marginTop: 10, fontSize: 16, fontWeight: "800", color: "#92400E" },
  pendingText: { marginTop: 8, fontSize: 13, lineHeight: 19, color: "#B45309", textAlign: "center" },
  pendingReason: { marginTop: 12, fontSize: 13, color: "#78350F", textAlign: "center" },
  blockerBox: {
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FEF3F2",
    borderWidth: 1,
    borderColor: "#FECDCA"
  },
  blockerTitle: { marginTop: 10, fontSize: 16, fontWeight: "800", color: "#B42318" },
  blockerText: { marginTop: 10, fontSize: 13, lineHeight: 19, color: "#B42318" },
  cancelRequestBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#F59E0B"
  },
  cancelRequestText: { color: "#B45309", fontWeight: "700" }
});
