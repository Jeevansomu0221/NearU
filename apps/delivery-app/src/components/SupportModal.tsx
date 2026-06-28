import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  createSupportTicket,
  FAQEntry,
  getMySupportTickets,
  getSupportFAQs,
  sendSupportMessage,
  SupportTicket
} from "../api/support.api";

type Mode = "main" | "faq" | "chat" | "report" | "tickets";

interface Props {
  visible: boolean;
  initialMode?: Mode;
  onClose: () => void;
}

const CATEGORIES: { key: SupportTicket["category"]; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: "DELIVERY_JOBS", icon: "bicycle-outline", label: "Delivery Jobs" },
  { key: "PAYMENT", icon: "cash-outline", label: "Payments & Payouts" },
  { key: "ACCOUNT", icon: "person-outline", label: "Account & Verification" },
  { key: "REPORT_ISSUE", icon: "flag-outline", label: "Report an Issue" },
  { key: "OTHER", icon: "ellipsis-horizontal-outline", label: "Other" }
];

const FAQ_FALLBACK: FAQEntry[] = [
  { question: "How do I get paid?", answer: "Your earnings are processed through the payout details in your profile. Make sure your bank account and IFSC are correct." },
  { question: "How are jobs assigned?", answer: "Nearby READY orders appear in your Available Jobs tab. You can accept or reject any job." },
  { question: "What documents do I need?", answer: "Aadhaar, PAN, selfie, and if using a motor vehicle — driving license, RC, and insurance." },
  { question: "How long does verification take?", answer: "Admin typically verifies within 24-48 hours after you submit your profile." },
  { question: "Can I update my bank details?", answer: "Yes, go to Profile > edit payout details anytime." }
];

const mapCategoryForApi = (category: SupportTicket["category"]) => {
  switch (category) {
    case "DELIVERY_JOBS":
      return "DELIVERY" as const;
    case "PAYMENT":
    case "ACCOUNT":
    case "REPORT_ISSUE":
    case "OTHER":
      return category;
    default:
      return "OTHER" as const;
  }
};

const buildDefaultChatSubject = (category: SupportTicket["category"]) => {
  const categoryLabel = CATEGORIES.find((cat) => cat.key === category)?.label || "Support";
  return `Chat: ${categoryLabel}`;
};

export default function SupportModal({ visible, initialMode = "main", onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("main");
  const [loading, setLoading] = useState(false);
  const [faqs, setFaqs] = useState<FAQEntry[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SupportTicket["category"]>("DELIVERY_JOBS");
  const [sending, setSending] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setActiveTicket(null);
      setSubject("");
      setMessage("");
      setSelectedCategory("DELIVERY_JOBS");
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11
      }).start();
      loadFAQs();
      loadTickets();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible, initialMode]);

  const loadFAQs = async () => {
    try {
      const response = await getSupportFAQs();
      if (response.success && response.data) {
        setFaqs(response.data);
      }
    } catch {
      setFaqs(FAQ_FALLBACK);
    }
  };

  const loadTickets = async () => {
    setLoading(true);
    try {
      const response = await getMySupportTickets();
      if (response.success && response.data) {
        setTickets(response.data);
      }
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      Alert.alert("Message required", "Please type your message.");
      return;
    }
    if (mode === "report" && !trimmedSubject) {
      Alert.alert("Subject required", "Please enter a subject for your report.");
      return;
    }

    const resolvedSubject =
      mode === "report"
        ? `Report: ${trimmedSubject}`
        : trimmedSubject || buildDefaultChatSubject(selectedCategory);

    setSending(true);
    try {
      if (activeTicket) {
        const response = await sendSupportMessage(activeTicket._id, trimmedMessage);
        if (response.success && response.data) {
          setActiveTicket(response.data);
          setMessage("");
          Alert.alert("Sent", "Your message has been sent to the Vyaha admin panel.");
        } else {
          Alert.alert("Error", response.message || "Failed to send message.");
        }
      } else {
        const response = await createSupportTicket({
          subject: resolvedSubject,
          message: trimmedMessage,
          category: mapCategoryForApi(selectedCategory),
          priority: mode === "report" ? "HIGH" : "NORMAL"
        });
        if (response.success && response.data) {
          setActiveTicket(response.data);
          setSubject("");
          setMessage("");
          setTickets((prev) => [response.data!, ...prev]);
          Alert.alert("Submitted", "Your message has been sent to the Vyaha admin panel.");
        } else {
          Alert.alert("Error", response.message || "Failed to submit.");
        }
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong.");
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const renderMain = () => (
    <>
      <Text style={styles.modalTitle}>Help & Support</Text>
      <Text style={styles.modalSubtitle}>Get answers, report issues, or chat with the admin team.</Text>

      <TouchableOpacity style={styles.menuItem} onPress={() => setMode("faq")}>
        <View style={[styles.menuIcon, { backgroundColor: "#FFF4EE" }]}>
          <Ionicons name="help-circle-outline" size={22} color="#C2410C" />
        </View>
        <View style={styles.menuCopy}>
          <Text style={styles.menuTitle}>FAQs</Text>
          <Text style={styles.menuSubtitle}>Payouts, jobs, verification, and account help</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => setMode("chat")}>
        <View style={[styles.menuIcon, { backgroundColor: "#ECFDF3" }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#027A48" />
        </View>
        <View style={styles.menuCopy}>
          <Text style={styles.menuTitle}>Chat Support</Text>
          <Text style={styles.menuSubtitle}>Send a message directly to the Vyaha admin panel</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={() => setMode("report")}>
        <View style={[styles.menuIcon, { backgroundColor: "#FEF3F2" }]}>
          <Ionicons name="flag-outline" size={22} color="#B42318" />
        </View>
        <View style={styles.menuCopy}>
          <Text style={styles.menuTitle}>Report an Issue</Text>
          <Text style={styles.menuSubtitle}>Payment, job, account, or app problems</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
      </TouchableOpacity>

      {tickets.length > 0 && (
        <TouchableOpacity style={styles.menuItem} onPress={() => setMode("tickets")}>
          <View style={[styles.menuIcon, { backgroundColor: "#F2F4F7" }]}>
            <Ionicons name="mail-outline" size={22} color="#475467" />
          </View>
          <View style={styles.menuCopy}>
            <Text style={styles.menuTitle}>My Tickets</Text>
            <Text style={styles.menuSubtitle}>{tickets.length} active ticket{tickets.length > 1 ? "s" : ""}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
        </TouchableOpacity>
      )}
    </>
  );

  const renderFaqs = () => {
    const items = faqs.length > 0 ? faqs : FAQ_FALLBACK;
    return (
      <>
        <Text style={styles.modalTitle}>Frequently Asked Questions</Text>
        <Text style={styles.modalSubtitle}>Quick answers to common delivery partner questions.</Text>
        <ScrollView style={styles.faqList} showsVerticalScrollIndicator={false}>
          {items.map((faq, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.faqItem, expandedFaq === index && styles.faqItemExpanded]}
              onPress={() => setExpandedFaq(expandedFaq === index ? null : index)}
              activeOpacity={0.8}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Ionicons
                  name={expandedFaq === index ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#667085"
                />
              </View>
              {expandedFaq === index && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </>
    );
  };

  const renderChatOrReport = () => {
    const isReport = mode === "report";
    return (
      <View style={styles.composerBody}>
        <Text style={styles.modalTitle}>{isReport ? "Report an Issue" : "Chat Support"}</Text>
        <Text style={styles.modalSubtitle}>
          {isReport
            ? "Report payment, job, account, or app problems to the Vyaha admin panel."
            : "Send a message directly to the Vyaha admin panel."}
        </Text>

        {activeTicket ? (
          <View style={styles.ticketThread}>
            <ScrollView
              style={styles.threadScroll}
              contentContainerStyle={styles.threadScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {activeTicket.messages?.map((msg, i) => (
                <View key={msg._id || i} style={[styles.threadBubble, msg.senderRole === "admin" ? styles.adminBubble : styles.deliveryBubble]}>
                  <Text style={[styles.threadBubbleText, msg.senderRole === "admin" && styles.adminBubbleText]}>
                    {msg.message}
                  </Text>
                  <Text style={[styles.threadBubbleTime, msg.senderRole === "admin" && styles.adminBubbleTime]}>
                    {formatDate(msg.createdAt)} — {msg.senderRole === "admin" ? "Vyaha Admin" : "You"}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.threadInputRow}>
              <TextInput
                style={styles.threadInput}
                value={message}
                onChangeText={setMessage}
                placeholder="Type your reply..."
                placeholderTextColor="#98A2B3"
                multiline
                selectionColor="#FF6B35"
              />
              <TouchableOpacity style={styles.threadSendButton} onPress={handleSendMessage} disabled={sending || !message.trim()}>
                {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={18} color="#FFF" />}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ScrollView
            style={styles.composerScroll}
            contentContainerStyle={styles.composerScrollContent}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
          >
            {!isReport && <Text style={styles.inputLabel}>Category</Text>}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.categoryChip, selectedCategory === cat.key && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat.key)}
                >
                  <Ionicons name={cat.icon} size={16} color={selectedCategory === cat.key ? "#C2410C" : "#667085"} />
                  <Text style={[styles.categoryChipText, selectedCategory === cat.key && styles.categoryChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {isReport && (
              <>
                <Text style={styles.inputLabel}>Subject</Text>
                <TextInput
                  style={styles.input}
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="Brief title for your report"
                  placeholderTextColor="#98A2B3"
                  selectionColor="#FF6B35"
                />
              </>
            )}
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={message}
              onChangeText={setMessage}
              placeholder={isReport ? "Describe the issue in detail..." : "Type your message here..."}
              placeholderTextColor="#98A2B3"
              multiline
              textAlignVertical="top"
              selectionColor="#FF6B35"
            />
            <TouchableOpacity
              style={[styles.sendButton, sending && styles.disabled]}
              onPress={handleSendMessage}
              disabled={sending}
            >
              {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.sendButtonText}>Send to Admin Panel</Text>}
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    );
  };

  const renderTickets = () => (
    <>
      <Text style={styles.modalTitle}>My Support Tickets</Text>
      <Text style={styles.modalSubtitle}>View your previous conversations with the admin team.</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#FF6B35" style={{ marginTop: 32 }} />
      ) : tickets.length === 0 ? (
        <View style={styles.emptyTickets}>
          <Ionicons name="mail-outline" size={48} color="#D0D5DD" />
          <Text style={styles.emptyTicketsText}>No tickets yet</Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.ticketCard} onPress={() => { setActiveTicket(item); setMode("chat"); }}>
              <View style={styles.ticketCardTop}>
                <Text style={styles.ticketCardSubject} numberOfLines={1}>{item.subject}</Text>
                <View style={[styles.statusDot, item.status === "OPEN" ? styles.statusOpen : item.status === "IN_PROGRESS" ? styles.statusProgress : styles.statusResolved]} />
              </View>
              <Text style={styles.ticketCardDate}>{formatDate(item.updatedAt)}</Text>
              <Text style={styles.ticketCardPreview} numberOfLines={2}>
                {item.messages?.[item.messages.length - 1]?.message || "No messages"}
              </Text>
            </TouchableOpacity>
          )}
          style={{ maxHeight: 400 }}
        />
      )}
    </>
  );

  const slideStyle = {
    transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) }]
  };
  const isComposerMode = mode === "chat" || mode === "report";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <Animated.View
          style={[
            styles.sheet,
            slideStyle,
            isComposerMode && styles.sheetComposer,
            { paddingBottom: insets.bottom + (isComposerMode ? 8 : 20) }
          ]}
        >
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => {
                if (mode === "main") {
                  onClose();
                } else if (activeTicket && (mode === "chat")) {
                  setActiveTicket(null);
                  setSubject("");
                  setMessage("");
                  setMode("main");
                } else {
                  setMode("main");
                  setSubject("");
                  setMessage("");
                }
              }}
              hitSlop={12}
            >
              <Ionicons name="arrow-back" size={24} color="#1D2939" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color="#667085" />
            </TouchableOpacity>
          </View>

          {isComposerMode ? (
            renderChatOrReport()
          ) : (
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {mode === "main" && renderMain()}
              {mode === "faq" && renderFaqs()}
              {mode === "tickets" && renderTickets()}
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end"
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%"
  },
  sheetComposer: {
    minHeight: "72%",
    maxHeight: "92%"
  },
  handleRow: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D0D5DD"
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8
  },
  body: {
    paddingHorizontal: 20
  },
  bodyContent: {
    paddingBottom: 16
  },
  composerBody: {
    flex: 1,
    paddingHorizontal: 20,
    minHeight: 320
  },
  composerScroll: {
    flex: 1
  },
  composerScrollContent: {
    paddingBottom: 24
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1D2939",
    marginTop: 4
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#667085",
    marginTop: 6,
    marginBottom: 20
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F4F7",
    gap: 14
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  menuCopy: {
    flex: 1
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1D2939"
  },
  menuSubtitle: {
    fontSize: 12,
    color: "#667085",
    marginTop: 2
  },
  faqList: {
    maxHeight: 480
  },
  faqItem: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F4F7"
  },
  faqItemExpanded: {
    backgroundColor: "#FFFBFA",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: -8
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#1D2939",
    lineHeight: 20
  },
  faqAnswer: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: "#667085"
  },
  categoryScroll: {
    marginBottom: 16
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F2F4F7",
    marginRight: 8
  },
  categoryChipActive: {
    backgroundColor: "#FFF4EE"
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475467"
  },
  categoryChipTextActive: {
    color: "#C2410C"
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#344054",
    marginBottom: 8,
    marginTop: 12
  },
  input: {
    borderWidth: 1,
    borderColor: "#E4E7EC",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#101828",
    backgroundColor: "#fff"
  },
  textArea: {
    minHeight: 110
  },
  sendButton: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "#FF6B35"
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  disabled: {
    opacity: 0.7
  },
  ticketThread: {
    flex: 1,
    minHeight: 240
  },
  threadScroll: {
    flex: 1,
    marginBottom: 12
  },
  threadScrollContent: {
    paddingBottom: 8
  },
  threadBubble: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    maxWidth: "85%"
  },
  deliveryBubble: {
    backgroundColor: "#FFF4EE",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4
  },
  adminBubble: {
    backgroundColor: "#F2F4F7",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4
  },
  threadBubbleText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#1D2939"
  },
  adminBubbleText: {
    color: "#344054"
  },
  threadBubbleTime: {
    marginTop: 6,
    fontSize: 11,
    color: "#98A2B3"
  },
  adminBubbleTime: {
    color: "#98A2B3"
  },
  threadInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end"
  },
  threadInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#101828",
    backgroundColor: "#fff",
    maxHeight: 80
  },
  threadSendButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B35"
  },
  ticketCard: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F4F7"
  },
  ticketCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  ticketCardSubject: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#1D2939"
  },
  ticketCardDate: {
    fontSize: 11,
    color: "#98A2B3",
    marginTop: 4
  },
  ticketCardPreview: {
    fontSize: 13,
    color: "#667085",
    marginTop: 6,
    lineHeight: 18
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  statusOpen: {
    backgroundColor: "#FF6B35"
  },
  statusProgress: {
    backgroundColor: "#2196F3"
  },
  statusResolved: {
    backgroundColor: "#4CAF50"
  },
  emptyTickets: {
    alignItems: "center",
    paddingVertical: 40
  },
  emptyTicketsText: {
    marginTop: 12,
    fontSize: 15,
    color: "#98A2B3",
    fontWeight: "600"
  }
});
