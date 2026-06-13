import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  createSupportTicket,
  getMySupportTickets,
  sendSupportMessage,
  type SupportMessage,
  type SupportTicket,
  type SupportTicketCategory
} from "../api/support.api";

type SupportMode = "chat" | "report";

const CLOSED_STATUSES = new Set(["RESOLVED", "CLOSED"]);

export default function SupportChatScreen({ route }: any) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<SupportMessage>>(null);
  const mode: SupportMode = route?.params?.mode === "report" ? "report" : "chat";
  const isReport = mode === "report";
  const category: SupportTicketCategory = isReport ? "REPORT_ISSUE" : "CUSTOMER_SUPPORT";
  const defaultSubject = isReport ? "Report an issue" : "Customer support";

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState(route?.params?.subject || defaultSubject);
  const [message, setMessage] = useState("");

  const activeTicket = useMemo(
    () => tickets.find((ticket) => !CLOSED_STATUSES.has(ticket.status)) || tickets[0],
    [tickets]
  );

  const loadTickets = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await getMySupportTickets(category);
      setTickets(response.data || []);
    } catch (error: any) {
      Alert.alert(isReport ? "Report an Issue" : "Customer Support", error?.message || "Failed to load conversation");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, isReport]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!activeTicket?.messages?.length) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [activeTicket?.messages?.length]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTickets(true);
  };

  const handleSend = async () => {
    const cleanMessage = message.trim();
    const cleanSubject = subject.trim() || defaultSubject;

    if (!cleanMessage) {
      Alert.alert(isReport ? "Report an Issue" : "Customer Support", "Please type a message first.");
      return;
    }

    try {
      setSending(true);
      const canContinueTicket = activeTicket && !CLOSED_STATUSES.has(activeTicket.status);
      const response = canContinueTicket
        ? await sendSupportMessage(activeTicket._id, cleanMessage)
        : await createSupportTicket({
          subject: cleanSubject,
          message: cleanMessage,
          category,
          priority: isReport ? "HIGH" : "NORMAL"
        });

      if (!response.success || !response.data) {
        Alert.alert(isReport ? "Report an Issue" : "Customer Support", response.message || "Failed to send message");
        return;
      }

      setMessage("");
      await loadTickets(true);
    } catch (error: any) {
      Alert.alert(isReport ? "Report an Issue" : "Customer Support", error?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item, index }: { item: SupportMessage; index: number }) => {
    const isCustomer = item.senderRole === "customer";
    return (
      <View style={[styles.chatBubble, isCustomer ? styles.customerBubble : styles.adminBubble]}>
        <Text style={styles.chatSender}>{isCustomer ? "You" : "Vyaha Admin"}</Text>
        <Text style={styles.chatText}>{item.message}</Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerCard}>
      <View style={styles.headerIcon}>
        <MaterialCommunityIcons
          name={isReport ? "alert-circle-outline" : "headset"}
          size={24}
          color="#FFFFFF"
        />
      </View>
      <View style={styles.headerCopy}>
        <Text style={styles.headerTitle}>{isReport ? "Report an Issue" : "Customer Support"}</Text>
        <Text style={styles.headerText}>
          {isReport
            ? "App bugs, UI issues, payment issues, feature requests, and platform problems stay here."
            : "Order related help stays in this chat with Vyaha admin."}
        </Text>
        {activeTicket ? (
          <Text style={styles.ticketMeta}>Ticket: {activeTicket.subject} - {activeTicket.status}</Text>
        ) : null}
      </View>
    </View>
  );

  const messages = activeTicket?.messages || [];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item, index) => `${item.createdAt || "message"}-${index}`}
        renderItem={renderMessage}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Start a conversation</Text>
            <Text style={styles.emptyText}>
              {isReport
                ? "Describe the platform issue and admin will reply here."
                : "Ask about an order and admin replies will appear here."}
            </Text>
          </View>
        }
        contentContainerStyle={styles.chatList}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#FF6B35"]} />}
      />

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {isReport && !activeTicket ? (
          <TextInput
            style={styles.subjectInput}
            value={subject}
            onChangeText={setSubject}
            placeholder="Issue subject"
            placeholderTextColor="#9A8E84"
          />
        ) : null}
        <View style={styles.composerRow}>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder={isReport ? "Describe the issue..." : "Type your message..."}
            placeholderTextColor="#9A8E84"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F2EC"
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F2EC"
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#6B5E55"
  },
  chatList: {
    padding: 14,
    paddingBottom: 18
  },
  headerCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EFE1D5",
    padding: 14,
    marginBottom: 12
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  headerCopy: {
    flex: 1
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#241D17",
    marginBottom: 4
  },
  headerText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#6B5E55"
  },
  ticketMeta: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "800",
    color: "#8B6A54"
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EFE1D5",
    padding: 16,
    alignItems: "center"
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#241D17",
    marginBottom: 4
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#6B5E55",
    textAlign: "center"
  },
  chatBubble: {
    maxWidth: "86%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8
  },
  customerBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#FFF1E6"
  },
  adminBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EFE1D5"
  },
  chatSender: {
    fontSize: 11,
    fontWeight: "900",
    color: "#8B6A54",
    marginBottom: 3
  },
  chatText: {
    fontSize: 14,
    lineHeight: 19,
    color: "#241D17"
  },
  composer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E8DDD2",
    paddingHorizontal: 12,
    paddingTop: 10
  },
  subjectInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#E1D4C8",
    borderRadius: 14,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#241D17",
    marginBottom: 8
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8
  },
  messageInput: {
    flex: 1,
    maxHeight: 104,
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#E1D4C8",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#241D17",
    textAlignVertical: "top"
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center"
  },
  sendButtonDisabled: {
    opacity: 0.65
  }
});
