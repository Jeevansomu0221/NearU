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
  getMyDeletionRequest,
  requestAccountDeletion,
  type AccountDeletionRequest
} from "../api/accountDeletion.api";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
  isDark?: boolean;
}

const REASON_OPTIONS = [
  "No longer operating on Vyaha",
  "Found another platform",
  "Privacy concerns",
  "Low earnings or fees",
  "Other"
] as const;

export default function DeleteAccountModal({ visible, onClose, onSubmitted, isDark = false }: Props) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<AccountDeletionRequest | null>(null);
  const [selectedReason, setSelectedReason] = useState<(typeof REASON_OPTIONS)[number] | "">("");
  const [details, setDetails] = useState("");

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
        <Pressable style={[styles.sheet, isDark && styles.sheetDark]} onPress={() => undefined}>
          <View style={styles.handle} />
          <Text style={[styles.title, isDark && styles.textDark]}>Delete account</Text>
          <Text style={[styles.subtitle, isDark && styles.mutedDark]}>
            Tell us why you are leaving. Our team will review pending payouts and active orders before processing your request.
          </Text>

          {loading ? (
            <ActivityIndicator color="#1D4E89" style={{ marginVertical: 24 }} />
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
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, isDark && styles.textDark]}>Reason for deletion</Text>
              {REASON_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.reasonRow,
                    isDark && styles.reasonRowDark,
                    selectedReason === option && styles.reasonRowActive,
                    selectedReason === option && isDark && styles.reasonRowActiveDark
                  ]}
                  onPress={() => setSelectedReason(option)}
                >
                  <Ionicons
                    name={selectedReason === option ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={selectedReason === option ? "#1D4E89" : "#98A2B3"}
                  />
                  <Text style={[styles.reasonText, isDark && styles.textDark]}>{option}</Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.label, isDark && styles.textDark]}>
                {selectedReason === "Other" ? "Please explain" : "Additional details (optional)"}
              </Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                multiline
                numberOfLines={4}
                placeholder={
                  selectedReason === "Other"
                    ? "Tell us why you want to delete your account..."
                    : "Share any extra context..."
                }
                placeholderTextColor={isDark ? "#98A2B3" : "#98A2B3"}
                value={details}
                onChangeText={setDetails}
                textAlignVertical="top"
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Submit deletion request</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={[styles.closeText, isDark && styles.mutedDark]}>Close</Text>
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
  sheetDark: { backgroundColor: "#111827" },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D0D5DD",
    marginBottom: 14
  },
  title: { fontSize: 22, fontWeight: "800", color: "#101828" },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, color: "#667085" },
  textDark: { color: "#F9FAFB" },
  mutedDark: { color: "#98A2B3" },
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
  reasonRowDark: { borderColor: "#374151", backgroundColor: "#1F2937" },
  reasonRowActive: { borderColor: "#1D4E89", backgroundColor: "#EFF6FF" },
  reasonRowActiveDark: { borderColor: "#60A5FA", backgroundColor: "#1E3A5F" },
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
  inputDark: {
    borderColor: "#374151",
    backgroundColor: "#1F2937",
    color: "#F9FAFB"
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
